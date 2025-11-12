import { getDb, resolveTenantId } from '../lib/mongo.js';

export default async function getDashboardStats(req, res) {
  try {
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const db = await getDb();
    const tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });

    const leads = db.collection('leads');
    const activities = db.collection('activities');
    const tenants = db.collection('tenants');

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get tenant config for SLA hours
    const tenant = await tenants.findOne({ _id: tenantId });
    const slaHours = tenant?.config?.slaHours || 24;
    const slaMs = slaHours * 60 * 60 * 1000;

    // Total leads
    const totalLeads = await leads.countDocuments({ tenantId });

    // Leads this week
    const leadsThisWeek = await leads.countDocuments({
      tenantId,
      createdAt: { $gte: oneWeekAgo }
    });

    // Lead distribution by stage
    const stageDistribution = await leads.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    const stageData = stageDistribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Calculate avg time to first contact
    const leadsWithContact = await leads.find({
      tenantId,
      stage: { $ne: 'new' }
    }).toArray();

    let totalContactTime = 0;
    let contactedCount = 0;

    for (const lead of leadsWithContact) {
      // Find first non-utm_snapshot activity
      const firstActivity = await activities.findOne({
        tenantId,
        leadId: lead._id.toString(),
        type: { $ne: 'utm_snapshot' }
      }, { sort: { createdAt: 1 } });

      if (firstActivity && lead.createdAt) {
        const timeDiff = firstActivity.createdAt.getTime() - lead.createdAt.getTime();
        totalContactTime += timeDiff;
        contactedCount++;
      }
    }

    const avgTimeToContact = contactedCount > 0
      ? Math.round(totalContactTime / contactedCount / (1000 * 60 * 60)) // Convert to hours
      : null;

    // Calculate % within SLA
    const allLeadsWithActivity = await leads.find({
      tenantId,
      latestActivityAt: { $exists: true }
    }).toArray();

    let withinSLA = 0;
    let totalWithActivity = 0;

    for (const lead of allLeadsWithActivity) {
      if (lead.createdAt && lead.latestActivityAt) {
        const timeDiff = lead.latestActivityAt.getTime() - lead.createdAt.getTime();
        totalWithActivity++;
        if (timeDiff <= slaMs) {
          withinSLA++;
        }
      }
    }

    const pctWithinSLA = totalWithActivity > 0
      ? Math.round((withinSLA / totalWithActivity) * 100 * 10) / 10
      : 0;

    // Source distribution
    const sourceDistribution = await leads.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    return res.status(200).json({
      totalLeads,
      leadsThisWeek,
      avgTimeToContact,
      pctWithinSLA,
      stageDistribution: stageData,
      sourceDistribution: sourceDistribution.map(s => ({ source: s._id, count: s.count }))
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}
