import { getDb, resolveTenantId, normPhone } from '../lib/mongo.js';
import { authenticateToken, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function updateLead(req, res) {
  try {
    const db = await getDb();
    let tenantId = null;

    // Check if authenticated user or API key
    if (req.user) {
      // JWT authenticated
      if (req.user.role === ROLES.SUPER_ADMIN) {
        // SuperAdmin can update any lead - get tenant from lead itself
        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        
        let oid;
        try { 
          oid = new ObjectId(id); 
        } catch { 
          return res.status(400).json({ error: 'Invalid id format' }); 
        }
        
        const existingLead = await db.collection('leads').findOne({ _id: oid });
        if (!existingLead) return res.status(404).json({ error: 'Lead not found' });
        tenantId = existingLead.tenantId;
      } else {
        // ClientAdmin/Member - use their tenantId
        tenantId = req.user.tenantId;
      }
    } else {
      // Fallback to API key authentication
      const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
      tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
    }
    
    if (!tenantId) return res.status(401).json({ error: 'Authentication required' });

    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    
    let oid;
    try { 
      oid = new ObjectId(id); 
    } catch { 
      return res.status(400).json({ error: 'Invalid id format' }); 
    }

    const leads = db.collection('leads');
    const activities = db.collection('activities');
    
    const existingLead = await leads.findOne({ _id: oid, tenantId });
    if (!existingLead) return res.status(404).json({ error: 'Not found' });

    const body = req.body || {};
    const update = { $set: {} };
    const now = new Date();

    // Update allowed fields
    if (body.firstName !== undefined) update.$set.firstName = String(body.firstName || '').trim();
    if (body.lastName !== undefined) update.$set.lastName = String(body.lastName || '').trim();
    if (body.email !== undefined) update.$set.email = String(body.email || '').trim().toLowerCase() || null;
    if (body.phone !== undefined) {
      const phoneE164 = normPhone(body.phone);
      update.$set.phoneE164 = phoneE164 || null;
    }
    if (body.city !== undefined) update.$set.city = String(body.city || '').trim();
    if (body.interest !== undefined) update.$set.interest = String(body.interest || '').trim();
    if (body.haveChildren !== undefined) update.$set.haveChildren = Boolean(body.haveChildren);
    if (body.planningToFoster !== undefined) update.$set.planningToFoster = Boolean(body.planningToFoster);
    if (body.campaignName !== undefined) update.$set.campaignName = String(body.campaignName || '').trim();
    if (body.office !== undefined) update.$set.office = String(body.office || '').trim() || null;
    if (body.assignedUserId !== undefined) update.$set.assignedUserId = String(body.assignedUserId || '').trim() || null;
    if (body.notes !== undefined) update.$set.notes = String(body.notes || '').trim();
    if (body.consent !== undefined) update.$set.consent = Boolean(body.consent);

    // Stage change (creates activity)
    if (body.stage !== undefined && body.stage !== existingLead.stage) {
      const newStage = String(body.stage);
      update.$set.stage = newStage;
      update.$set.latestActivityAt = now;

      // Create status_change activity
      await activities.insertOne({
        tenantId,
        leadId: id,
        type: 'status_change',
        content: {
          note: body.stageChangeNote || `Stage changed from ${existingLead.stage} to ${newStage}`
        },
        stage: newStage,
        createdAt: now
      });
    }

    // Update spam flag if provided
    if (body.spamFlag !== undefined) update.$set.spamFlag = Boolean(body.spamFlag);

    // Only update if there are changes
    if (Object.keys(update.$set).length === 0) {
      return res.status(200).json({ ok: true, message: 'No changes' });
    }

    await leads.updateOne({ _id: oid }, update);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Update lead error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

// Create a middleware that tries auth first, falls back to API key
function flexibleAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    // Try JWT authentication first
    return authenticateToken(req, res, next);
  } else {
    // No token, proceed without req.user (will use API key)
    next();
  }
}

export default [flexibleAuth, updateLead];
