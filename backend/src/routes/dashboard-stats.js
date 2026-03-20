import { getDb, resolveTenantId } from '../lib/mongo.js';
import { authenticateToken, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function getDashboardStats(req, res) {
  try {
    const db = await getDb();
    let tenantId = null;

    // Check if authenticated user or API key
    if (req.user) {
      if (req.user.role === ROLES.SUPER_ADMIN) {
        // SuperAdmin can filter by tenant
        if (req.query.tenantId) {
          const queryTenantId = req.query.tenantId;
          if (queryTenantId.length === 36 || queryTenantId.length === 24) {
             tenantId = queryTenantId.length === 24 ? new ObjectId(queryTenantId) : queryTenantId;
          }
        }
        // If no tenantId, SuperAdmin sees aggregate stats (or we could enforce tenant selection)
        // For now, let's assume if no tenantId, we calculate across ALL tenants (or return empty)
        // But the current logic below relies on `tenantId` being set for the queries.
        // Let's default to returning empty or requiring tenantId for stats.
        if (!tenantId) {
           // Optional: return global stats if needed, but for now let's require tenant context or handle it
           // If we want global stats, we'd need to remove { tenantId } from queries below.
           // Let's assume for dashboard stats, we want to see data for a specific tenant context.
           // If SuperAdmin hasn't selected one, maybe we pick the first one or return 0s?
           // Let's proceed with tenantId = null and handle it in queries.
        }
      } else {
        tenantId = req.user.tenantId;
      }
    } else {
      const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
      tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
      if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });
    }

    // If we still don't have a tenantId (e.g. SuperAdmin without selection), 
    // we might want to return an error or global stats. 
    // Existing logic heavily relies on `tenantId`.
    if (!tenantId && (!req.user || req.user.role !== ROLES.SUPER_ADMIN)) {
       return res.status(401).json({ error: 'Tenant context required' });
    }

    const leads = db.collection('leads');
    const metaLeads = db.collection('meta_leads');
    const activities = db.collection('activities');
    const tenants = db.collection('tenants');

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let slaHours = 24;
    if (tenantId) {
      const tenant = await tenants.findOne({ _id: tenantId });
      slaHours = tenant?.config?.slaHours || 24;
    }
    const slaMs = slaHours * 60 * 60 * 1000;

    // Build query filter
    const queryFilter = tenantId ? { tenantId } : {};

    // Total leads (website leads + meta leads)
    const [websiteLeadsCount, metaLeadsCount] = await Promise.all([
      leads.countDocuments(queryFilter),
      metaLeads.countDocuments(queryFilter)
    ]);
    const totalLeads = websiteLeadsCount + metaLeadsCount;

    // Leads this week (website leads + meta leads)
    const [websiteLeadsThisWeek, metaLeadsThisWeek] = await Promise.all([
      leads.countDocuments({
        ...queryFilter,
        createdAt: { $gte: oneWeekAgo }
      }),
      metaLeads.countDocuments({
        ...queryFilter,
        createdAt: { $gte: oneWeekAgo }
      })
    ]);
    const leadsThisWeek = websiteLeadsThisWeek + metaLeadsThisWeek;

    // Lead distribution by stage (website leads + meta leads)
    const [websiteStageDistribution, metaStageDistribution] = await Promise.all([
      leads.aggregate([
        { $match: queryFilter },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray(),
      metaLeads.aggregate([
        { $match: queryFilter },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray()
    ]);

    // Combine stage distributions from both collections
    const stageData = {};
    for (const item of websiteStageDistribution) {
      stageData[item._id] = (stageData[item._id] || 0) + item.count;
    }
    for (const item of metaStageDistribution) {
      stageData[item._id] = (stageData[item._id] || 0) + item.count;
    }

    // Calculate avg time to first contact (single aggregation instead of N+1 queries)
    const contactTimeResult = await leads.aggregate([
      { $match: { ...queryFilter, stage: { $ne: 'new' } } },
      {
        $lookup: {
          from: 'activities',
          let: { leadId: { $toString: '$_id' }, tid: '$tenantId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$leadId', '$$leadId'] },
                    { $eq: ['$tenantId', '$$tid'] },
                    { $ne: ['$type', 'utm_snapshot'] },
                  ],
                },
              },
            },
            { $sort: { createdAt: 1 } },
            { $limit: 1 },
          ],
          as: 'firstActivity',
        },
      },
      { $unwind: '$firstActivity' },
      {
        $group: {
          _id: null,
          totalMs: { $sum: { $subtract: ['$firstActivity.createdAt', '$createdAt'] } },
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const avgTimeToContact =
      contactTimeResult[0]?.count > 0
        ? Math.round(contactTimeResult[0].totalMs / contactTimeResult[0].count / (1000 * 60 * 60))
        : null;

    // Calculate % within SLA (aggregation instead of loading all leads into memory)
    const slaResult = await leads.aggregate([
      {
        $match: {
          ...queryFilter,
          createdAt: { $exists: true },
          latestActivityAt: { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withinSLA: {
            $sum: {
              $cond: [
                { $lte: [{ $subtract: ['$latestActivityAt', '$createdAt'] }, slaMs] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]).toArray();

    const pctWithinSLA =
      slaResult[0]?.total > 0
        ? Math.round((slaResult[0].withinSLA / slaResult[0].total) * 100 * 10) / 10
        : 0;

    // Source distribution (website leads + meta leads)
    const [websiteSourceDistribution, metaSourceDistribution] = await Promise.all([
      leads.aggregate([
        { $match: queryFilter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray(),
      metaLeads.aggregate([
        { $match: queryFilter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray()
    ]);

    // Combine source distributions from both collections
    const sourceData = {};
    for (const item of websiteSourceDistribution) {
      sourceData[item._id] = (sourceData[item._id] || 0) + item.count;
    }
    for (const item of metaSourceDistribution) {
      sourceData[item._id] = (sourceData[item._id] || 0) + item.count;
    }

    // Convert to array format and sort by count
    const sourceDistribution = Object.entries(sourceData)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // Team performance: assigned leads + activity breakdown per user
    const usersCollection = db.collection('users');
    const tenantUsers = tenantId
      ? await usersCollection.find({ tenantId, active: true }, { projection: { firstName: 1, lastName: 1, role: 1 } }).toArray()
      : [];

    const [assignedLeadsCursor, userActivityCursor] = await Promise.all([
      leads.aggregate([
        { $match: { ...queryFilter, assignedUserId: { $exists: true, $ne: null } } },
        { $group: { _id: '$assignedUserId', count: { $sum: 1 } } }
      ]).toArray(),
      activities.aggregate([
        { $match: { ...(tenantId ? { tenantId } : {}), userId: { $exists: true, $ne: null } } },
        { $group: {
          _id: '$userId',
          total: { $sum: 1 },
          calls:  { $sum: { $cond: [{ $eq: ['$type', 'call'] },   1, 0] } },
          emails: { $sum: { $cond: [{ $eq: ['$type', 'email'] },  1, 0] } },
          notes:  { $sum: { $cond: [{ $eq: ['$type', 'note'] },   1, 0] } },
          sms:    { $sum: { $cond: [{ $eq: ['$type', 'sms'] },    1, 0] } },
        }}
      ]).toArray()
    ]);

    const assignedMap = Object.fromEntries(assignedLeadsCursor.map(r => [r._id?.toString(), r.count]));
    const activityMap = Object.fromEntries(userActivityCursor.map(r => [r._id?.toString(), r]));

    const teamPerformance = tenantUsers.map(u => {
      const uid = u._id.toString();
      const act = activityMap[uid] || { total: 0, calls: 0, emails: 0, notes: 0, sms: 0 };
      return {
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        assignedLeads: assignedMap[uid] || 0,
        activitiesTotal: act.total,
        calls: act.calls,
        emails: act.emails,
        notes: act.notes,
        sms: act.sms,
      };
    }).sort((a, b) => b.assignedLeads - a.assignedLeads);

    // Lead velocity: last 12 weeks (total + qualified per week) — all weeks run in parallel
    const QUALIFIED_STAGES = ['qualified', 'orientation', 'application', 'home_study', 'licensed', 'placement'];
    const weekRanges = Array.from({ length: 12 }, (_, i) => {
      const idx = 11 - i;
      return {
        label: new Date(now.getTime() - (idx + 1) * 7 * 24 * 60 * 60 * 1000)
          .toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weekStart: new Date(now.getTime() - (idx + 1) * 7 * 24 * 60 * 60 * 1000),
        weekEnd:   new Date(now.getTime() - idx       * 7 * 24 * 60 * 60 * 1000),
      };
    });
    const leadVelocity = await Promise.all(
      weekRanges.map(async ({ label, weekStart, weekEnd }) => {
        const dateFilter = { createdAt: { $gte: weekStart, $lt: weekEnd } };
        const [wTotal, wQualified] = await Promise.all([
          Promise.all([
            leads.countDocuments({ ...queryFilter, ...dateFilter }),
            metaLeads.countDocuments({ ...queryFilter, ...dateFilter }),
          ]).then(([a, b]) => a + b),
          Promise.all([
            leads.countDocuments({ ...queryFilter, ...dateFilter, stage: { $in: QUALIFIED_STAGES } }),
            metaLeads.countDocuments({ ...queryFilter, ...dateFilter, stage: { $in: QUALIFIED_STAGES } }),
          ]).then(([a, b]) => a + b),
        ]);
        return { label, total: wTotal, qualified: wQualified };
      })
    );

    return res.status(200).json({
      totalLeads,
      leadsThisWeek,
      avgTimeToContact,
      pctWithinSLA,
      stageDistribution: stageData,
      sourceDistribution,
      teamPerformance,
      leadVelocity,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
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

export default [flexibleAuth, getDashboardStats];
