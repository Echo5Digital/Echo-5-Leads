import { getDb, resolveTenantId } from '../lib/mongo.js';

export default async function exportLeads(req, res) {
  try {
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const db = await getDb();
    const tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });

    // Same filters as leads list
    const stage = req.query.stage || undefined;
    const source = req.query.source || undefined;
    const spamFlagParam = req.query.spam_flag;
    const q = req.query.q || undefined;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

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
    const activities = db.collection('activities');
    
    const items = await leadsCol.find(filter).sort({ createdAt: -1 }).toArray();

    // Get activity counts for each lead
    const itemsWithCounts = await Promise.all(
      items.map(async (lead) => {
        const activityCount = await activities.countDocuments({
          tenantId,
          leadId: lead._id.toString(),
          type: { $ne: 'utm_snapshot' }
        });
        return { ...lead, activityCount };
      })
    );

    // Build CSV
    const headers = [
      'Name',
      'Email',
      'Phone',
      'City',
      'Source',
      'Campaign',
      'Stage',
      'Office',
      'Assigned To',
      'Attempts',
      'Spam Flag',
      'Created At',
      'Latest Activity'
    ];

    const rows = itemsWithCounts.map(lead => [
      `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      lead.email || '',
      lead.phoneE164 || '',
      lead.city || '',
      lead.source || '',
      lead.campaignName || '',
      (lead.stage || '').replace(/_/g, ' '),
      lead.office || '',
      lead.assignedUserId || '',
      lead.activityCount || 0,
      lead.spamFlag ? 'Yes' : 'No',
      lead.createdAt ? lead.createdAt.toISOString() : '',
      lead.latestActivityAt ? lead.latestActivityAt.toISOString() : ''
    ]);

    // Convert to CSV string
    const escapeCsv = (val) => {
      const str = String(val || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvLines = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ];

    const csv = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-export-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Export leads error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}
