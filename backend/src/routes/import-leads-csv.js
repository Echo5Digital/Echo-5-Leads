import { getDb, resolveTenantId, normPhone } from '../lib/mongo.js';
import { authenticateToken, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

// Simple CSV parser
function parseCSV(csvData) {
  const lines = csvData.trim().split('\n');
  if (lines.length === 0) return { headers: [], records: [] };

  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing - handles quoted fields
    const record = {};
    let current = '';
    let inQuotes = false;
    let colIndex = 0;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          j++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        record[headers[colIndex]] = current.trim();
        current = '';
        colIndex++;
      } else {
        current += char;
      }
    }
    // Add last field
    if (colIndex < headers.length) {
      record[headers[colIndex]] = current.trim();
    }

    records.push(record);
  }

  return { headers, records };
}

// Middleware to authenticate token
function flexibleAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    return authenticateToken(req, res, next);
  } else {
    return res.status(401).json({ error: 'Authentication required for CSV import' });
  }
}

async function importLeadsCSV(req, res) {
  try {
    const db = await getDb();
    
    // User must be authenticated (not API key)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get tenantId - allow SuperAdmin to override
    let tenantId = req.user.tenantId;
    
    // For SuperAdmin, check if tenantId is in request body (required if not in user)
    if (req.user.role === ROLES.SUPER_ADMIN) {
      if (req.body.tenantId) {
        tenantId = req.body.tenantId;
      }
      // SuperAdmin MUST have a tenantId (either from body or user)
      if (!tenantId) {
        return res.status(400).json({ 
          error: 'No tenant assigned',
          details: 'SuperAdmin must select a client before importing. Please select a client from the sidebar and try again.'
        });
      }
    } else if (!tenantId) {
      // Non-SuperAdmin must have tenantId from user
      return res.status(400).json({ 
        error: 'No tenant assigned',
        details: 'Your account is not assigned to a client. Contact administrator.'
      });
    }

    console.log('Import: Using tenantId:', tenantId);


    // Get CSV data from request body
    const csvData = req.body.csvData;
    if (!csvData) {
      return res.status(400).json({ error: 'CSV data is required' });
    }

    // Parse CSV
    let records = [];
    try {
      const parsed = parseCSV(csvData);
      records = parsed.records;
    } catch (parseErr) {
      return res.status(400).json({ error: 'Invalid CSV format', details: parseErr.message });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Process records - store in meta_leads collection
    const metaLeads = db.collection('meta_leads');
    const metaActivities = db.collection('meta_activities');
    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
      leadIds: []
    };

    const now = new Date();

    for (let i = 0; i < records.length; i++) {
      try {
        const row = records[i];

        // Map CSV columns to lead fields
        // Handle full_name field (split into first and last names)
        let firstName, lastName;
        if (row.full_name) {
          const nameParts = row.full_name.trim().split(/\s+/);
          firstName = nameParts[0] || undefined;
          lastName = nameParts.slice(1).join(' ') || undefined;
        } else {
          firstName = row.first_name?.trim() || undefined;
          lastName = row.last_name?.trim() || undefined;
        }

        const email = row.email?.trim().toLowerCase() || undefined;
        const phone = row.phone_e164 || row.phone?.trim() || undefined;
        const phoneE164 = normPhone(phone);
        const city = row.city?.trim() || undefined;
        
        // Map 'do_you_currently_have_children' to stage
        let stage = 'new';
        const childrenStatus = row['do_you_currently_have_children_or_are_you_planning_to_foster_a_child?']?.toLowerCase().trim();
        if (childrenStatus) {
          if (childrenStatus.includes('yes') || childrenStatus.includes('true')) {
            stage = 'qualified';
          } else if (childrenStatus.includes('no') || childrenStatus.includes('false')) {
            stage = 'not_qualified';
          } else if (childrenStatus.includes('exploring')) {
            stage = 'prospect';
          }
        } else {
          stage = row.stage?.trim() || 'new';
        }

        // Map service interest to campaignName
        const campaignName = row['what_service_are_you_most_interested_in?']?.trim() || row.campaign_name?.trim() || 'Contact Form';
        
        const interest = row.interest?.trim() || undefined;
        const assignedTo = row.assigned_to?.trim() || row['assigned_to']?.trim() || undefined;
        const notes = row.notes?.trim() || undefined;
        const source = 'facebook_import';
        const createdAt = row.created_at ? new Date(row.created_at) : now;

        // Validate: need at least email or phone
        if (!email && !phoneE164) {
          results.errors.push(`Row ${i + 2}: Missing both email and phone`);
          results.skipped++;
          continue;
        }

        // Do not deduplicate CSV imports — always insert each row as a separate meta lead

        // Prepare meta lead document
        const leadDoc = {
          tenantId,
          firstName,
          lastName,
          city,
          campaignName,
          stage,
          source,
          spamFlag: false, // CSV imports are not spam
          assignedUserId: assignedTo || null,
          office: null,
          createdAt,
          latestActivityAt: now,
          originalPayload: row,
          type: 'meta', // Mark as meta lead
          // Add interest if available
          ...(interest && { interest }),
        };

        // Add optional fields
        if (email) leadDoc.email = email;
        if (phoneE164) leadDoc.phoneE164 = phoneE164;

        // Insert lead into meta_leads collection
        const insertResult = await metaLeads.insertOne(leadDoc);
        const leadId = insertResult.insertedId.toString();

        // Create activity record for import in meta_activities
        await metaActivities.insertOne({
          tenantId,
          leadId,
          type: 'note',
          content: {
            title: 'Facebook Import',
            note: `Lead imported from CSV. Source: ${source}${interest ? ` Interest: ${interest}` : ''}${notes ? ` Notes: ${notes}` : ''}`
          },
          createdAt,
        });

        results.imported++;
        results.leadIds.push(leadId);

      } catch (rowErr) {
        results.errors.push(`Row ${i + 2}: ${rowErr.message}`);
        results.skipped++;
      }
    }

    return res.status(200).json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      total: records.length,
      errors: results.errors.slice(0, 10), // Return first 10 errors
      leadIds: results.leadIds,
      message: `Successfully imported ${results.imported} leads. ${results.skipped} skipped due to errors.`
    });

  } catch (err) {
    console.error('CSV import error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

export default [flexibleAuth, importLeadsCSV];
