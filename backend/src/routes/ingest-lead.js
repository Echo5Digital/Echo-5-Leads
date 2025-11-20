import { getDb, resolveTenantId, normPhone } from '../lib/mongo.js';
import { authenticateToken } from '../lib/auth.js';

export default async function ingestLead(req, res) {
  try {
    const db = await getDb();
    let tenantId = null;
    
    // Check if user is authenticated (manual lead creation)
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      // Authenticated user - use tenantId from request body if provided (SuperAdmin)
      // or user's assigned tenant (ClientAdmin/Member)
      try {
        const { verifyToken } = await import('../lib/auth.js');
        const decoded = verifyToken(token);
        if (decoded) {
          req.user = decoded;
          
          // SuperAdmin can specify tenantId in body
          if (req.user.role === 'super_admin' && req.body.tenantId) {
            tenantId = req.body.tenantId;
            console.log('SuperAdmin manual lead creation - using tenantId from body:', tenantId);
          } else if (req.user.tenantId) {
            // ClientAdmin/Member use their assigned tenant
            tenantId = req.user.tenantId;
            console.log('User manual lead creation - using user tenantId:', tenantId);
          }
        }
      } catch (error) {
        console.error('Token verification error:', error);
      }
    }
    
    // Fallback to API key authentication (WordPress plugins)
    if (!tenantId) {
      const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
      tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
      console.log('API key lead creation - resolved tenantId:', tenantId);
    }
    
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key or authentication required' });

    const body = req.body || {};

    const now = new Date();
    // Allow override of createdAt for historical data migration
    const createdAt = body.created_at ? new Date(body.created_at) : now;
    const firstName = body.first_name?.toString().trim() || undefined;
    const lastName  = body.last_name?.toString().trim() || undefined;
    const email     = body.email?.toString().trim().toLowerCase() || undefined;
    const phoneE164 = normPhone(body.phone);
    const city      = body.city?.toString().trim() || undefined;
    const campaignName = body.campaign_name?.toString().trim() || undefined;
    const providedSource = body.source?.toString().trim() || undefined;

    const utm = {};
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','referrer','form_id']
      .forEach(k => { if (body[k]) utm[k] = String(body[k]); });

    // For migration purposes, allow submissions without email/phone but log them
    if (!email && !phoneE164) {
      console.log('Lead ingestion without email/phone - storing with available data:', {
        tenantId,
        firstName,
        lastName,
        source: providedSource,
        hasUtm: Object.keys(utm).length > 0,
        bodyKeys: Object.keys(body).slice(0, 10)
      });
      // Continue processing instead of returning error
    }

    const tenants = db.collection('tenants');
    const leads = db.collection('leads');
    const activities = db.collection('activities');

    const tenant = await tenants.findOne({ _id: tenantId });
    const spamKeywords = (tenant?.config?.spamKeywords || []).map(s => String(s).toLowerCase());
    const stageDefault = 'new';

    // Only check for duplicates if we have email or phone
    let existing = null;
    if (email || phoneE164) {
      existing = await leads.findOne({
        tenantId,
        $or: [
          ...(email ? [{ email }] : []),
          ...(phoneE164 ? [{ phoneE164 }] : []),
        ]
      });
    }

    const isNewLead = !existing;

    const leadData = {
      firstName,
      lastName,
      city,
      campaignName,
      ...(email && { email }),
      ...(phoneE164 && { phoneE164 }),
    };

    if (isNewLead) {
      if (providedSource) leadData.source = providedSource;
      else if (utm.utm_source) leadData.source = utm.utm_source;
      else leadData.source = 'website';
    }

    const payloadStr = JSON.stringify(body).toLowerCase();
    const spamFlag = spamKeywords.some(kw => kw && payloadStr.includes(kw));
    leadData.spamFlag = spamFlag;

    let leadId;
    if (isNewLead) {
      const doc = {
        tenantId,
        ...leadData,
        stage: stageDefault,
        assignedUserId: null,
        office: null,
        createdAt: createdAt, // ✅ Use original timestamp if provided
        latestActivityAt: now,
        originalPayload: body,
      };
      const ins = await leads.insertOne(doc);
      leadId = ins.insertedId.toString();

      await activities.insertOne({
        tenantId,
        leadId,
        type: 'note',
        content: { title: 'Attribution v1', note: `source set to: ${doc.source}` },
        createdAt: createdAt, // ✅ Also use original timestamp for first activity
      });
    } else {
      leadId = existing._id.toString();
      await leads.updateOne({ _id: existing._id }, { $set: leadData });
    }

    if (Object.keys(utm).length > 0) {
      await activities.insertOne({ tenantId, leadId, type: 'utm_snapshot', content: utm, createdAt: now });
    }

    return res.status(200).json({ leadId });
  } catch (err) {
    console.error('Ingest error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}
