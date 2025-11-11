import { getDb, resolveTenantId } from '../../src/lib/mongo.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const db = await getDb();
    const tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });

    const id = extractId(req.url);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    let oid; try { oid = new ObjectId(id); } catch { return res.status(400).json({ error: 'Invalid id format' }); }

    const leads = db.collection('leads');
    const activities = db.collection('activities');
    const lead = await leads.findOne({ _id: oid, tenantId });
    if (!lead) return res.status(404).json({ error: 'Not found' });
    const acts = await activities.find({ tenantId, leadId: id }).sort({ createdAt: -1 }).toArray();
    return res.status(200).json({ lead, activities: acts });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

function extractId(url) {
  // /api/leads/<id>
  const parts = url.split('?')[0].split('/').filter(Boolean);
  return parts[parts.length - 1];
}
