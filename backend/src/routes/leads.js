import { getDb, resolveTenantId } from '../lib/mongo.js';

export default async function getLeads(req, res) {
  try {
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const db = await getDb();
    const tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });

    const stage = req.query.stage || undefined;
    const source = req.query.source || undefined;
    const spamFlagParam = req.query.spam_flag;
    const q = req.query.q || undefined;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const filter = { tenantId };
    if (stage) filter.stage = stage;
    if (source) filter.source = source;
    if (spamFlagParam === 'true') filter.spamFlag = true;
    if (spamFlagParam === 'false') filter.spamFlag = false;

    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { firstName: rx }, { lastName: rx }, { email: rx }, { phoneE164: rx }, { city: rx }
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const leadsCol = db.collection('leads');
    const [items, total] = await Promise.all([
      leadsCol.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      leadsCol.countDocuments(filter)
    ]);

    return res.status(200).json({ page, limit, total, items });
  } catch (err) {
    console.error('List leads error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}
