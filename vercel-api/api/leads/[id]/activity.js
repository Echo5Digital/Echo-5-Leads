import { getDb, resolveTenantId } from '../../../src/lib/mongo.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const db = await getDb();
    const tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });

    const id = extractId(req.url);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    let oid; try { oid = new ObjectId(id); } catch { return res.status(400).json({ error: 'Invalid id format' }); }

    const leads = db.collection('leads');
    const lead = await leads.findOne({ _id: oid, tenantId });
    if (!lead) return res.status(404).json({ error: 'Not found' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const type = body.type;
    const content = body.content || {};
    const stage = body.stage;
    const now = new Date();

    const allowed = ['note','call','email','sms','status_change'];
    if (!allowed.includes(type)) return res.status(400).json({ error: 'Invalid type' });

    const activities = db.collection('activities');
    const activity = { tenantId, leadId: id, type, content, createdAt: now };
    await activities.insertOne(activity);

    if (type !== 'utm_snapshot') {
      const update = { latestActivityAt: now };
      if (type === 'status_change' && stage) update.stage = stage;
      await leads.updateOne({ _id: oid }, { $set: update });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

function extractId(url) {
  // /api/leads/<id>/activity
  const parts = url.split('?')[0].split('/').filter(Boolean);
  return parts[parts.length - 2];
}
