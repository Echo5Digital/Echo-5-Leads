import { getDb, resolveTenantId } from '../lib/mongo.js';
import { sendNoteNotification } from '../lib/email.js';
import { authenticateToken } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function addLeadActivity(req, res) {
  try {
    const db = await getDb();
    
    // Support both JWT authentication (from frontend) and API key (from WordPress plugin)
    let tenantId;
    if (req.user) {
      // JWT authenticated - use user's tenantId
      tenantId = req.user.tenantId;
    } else {
      // API key authentication - for WordPress plugin
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
    const lead = await leads.findOne({ _id: oid, tenantId });
    if (!lead) return res.status(404).json({ error: 'Not found' });
    
    // Get tenant for notification config
    const tenant = await db.collection('tenants').findOne({ _id: tenantId });

    const body = req.body || {};
    const type = body.type;
    const content = body.content || {};
    const stage = body.stage;
    const addedByName = body.addedBy || 'System';
    const now = new Date();

    const allowed = ['note','call','email','sms','status_change'];
    if (!allowed.includes(type)) return res.status(400).json({ error: 'Invalid type' });

    const activities = db.collection('activities');
    const activity = { tenantId, leadId: id, type, content, createdAt: now };
    await activities.insertOne(activity);

    // Send notification email if note was added
    if (type === 'note' && tenant) {
      await sendNoteNotification(lead, activity, addedByName, tenant);
    }

    if (type !== 'utm_snapshot') {
      const update = { latestActivityAt: now };
      if (type === 'status_change' && stage) update.stage = stage;
      await leads.updateOne({ _id: oid }, { $set: update });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Add activity error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

// Export both authenticated and non-authenticated versions
// Authenticated version for frontend (JWT), non-authenticated for WordPress plugin (API key)
export default addLeadActivity;
export const protectedAddLeadActivity = [authenticateToken, addLeadActivity];
