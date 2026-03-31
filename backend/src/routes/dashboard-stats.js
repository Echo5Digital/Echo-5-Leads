import { getDb, resolveTenantId } from '../lib/mongo.js';
import { authenticateToken, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

// Level-1 cache: in-memory (instant — works for warm Vercel instances)
const statsCache = new Map();
// Level-2 cache: MongoDB dashboard_cache collection (survives cold starts)
const CACHE_TTL_MS = 60_000; // 60 seconds

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
        if (!tenantId) {
           // proceed with tenantId = null
        }
      } else {
        tenantId = req.user.tenantId;
      }
    } else {
      const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
      tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
      if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });
    }

    if (!tenantId && (!req.user || req.user.role !== ROLES.SUPER_ADMIN)) {
       return res.status(401).json({ error: 'Tenant context required' });
    }

    // ── Cache check (L1: memory, L2: MongoDB) ─────────────────────────────────
    const cacheKey = String(tenantId || 'global');
    const memCached = statsCache.get(cacheKey);
    if (memCached && Date.now() - memCached.ts < CACHE_TTL_MS) {
      return res.status(200).json(memCached.data);
    }
    const dashboardCache = db.collection('dashboard_cache');
    const dbCached = await dashboardCache.findOne({ cacheKey });
    if (dbCached) {
      // Warm the in-memory cache too
      statsCache.set(cacheKey, { data: dbCached.data, ts: Date.now() });
      return res.status(200).json(dbCached.data);
    }

    const leads = db.collection('leads');
    const metaLeads = db.collection('meta_leads');
    const activities = db.collection('activities');
    const tenants = db.collection('tenants');
    const usersCollection = db.collection('users');

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const queryFilter = tenantId ? { tenantId, archived: { $ne: true } } : { archived: { $ne: true } };
    const archivedFilter = tenantId ? { tenantId, archived: true } : { archived: true };

    const QUALIFIED_STAGES = ['qualified', 'orientation', 'application', 'home_study', 'licensed', 'placement'];

    // ── Build week/month ranges ────────────────────────────────────────────────
    // 12 weeks: 11 past + current/upcoming, labeled by week END
    const weekRanges = Array.from({ length: 12 }, (_, i) => {
      const idx = 11 - i;
      const weekEnd   = new Date(now.getTime() + (1 - idx) * 7 * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { label: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), weekStart, weekEnd };
    });
    const weekBoundaries = [...weekRanges.map(r => r.weekStart), weekRanges[11].weekEnd];

    // 12 calendar months: 11 past + current
    const monthRanges = Array.from({ length: 12 }, (_, i) => {
      const monthsAgo = 11 - i;
      const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return { label: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), monthStart, monthEnd };
    });
    const monthBoundaries = [...monthRanges.map(r => r.monthStart), monthRanges[11].monthEnd];

    // ── Run ALL queries in parallel ────────────────────────────────────────────
    const tenant = tenantId ? await tenants.findOne({ _id: tenantId }) : null;
    const slaHours = tenant?.config?.slaHours || 24;
    const slaMs = slaHours * 60 * 60 * 1000;

    const [
      [websiteLeadsCount, metaLeadsCount],
      [websiteLeadsThisWeek, metaLeadsThisWeek],
      [websiteArchivedCount, metaArchivedCount],
      websiteStageDistribution,
      metaStageDistribution,
      contactTimeResult,
      slaResult,
      websiteSourceDistribution,
      metaSourceDistribution,
      tenantUsers,
      assignedLeadsCursor,
      userActivityCursor,
      // velocity: 2 $bucket aggregations replace 48 countDocuments for weekly
      leadsWeekBuckets,
      metaLeadsWeekBuckets,
      // velocity: 2 $bucket aggregations replace 48 countDocuments for monthly
      leadsMonthBuckets,
      metaLeadsMonthBuckets,
    ] = await Promise.all([
      // counts
      Promise.all([leads.countDocuments(queryFilter), metaLeads.countDocuments(queryFilter)]),
      Promise.all([
        leads.countDocuments({ ...queryFilter, createdAt: { $gte: oneWeekAgo } }),
        metaLeads.countDocuments({ ...queryFilter, createdAt: { $gte: oneWeekAgo } }),
      ]),
      Promise.all([leads.countDocuments(archivedFilter), metaLeads.countDocuments(archivedFilter)]),
      // stage distribution
      leads.aggregate([{ $match: queryFilter }, { $group: { _id: '$stage', count: { $sum: 1 } } }]).toArray(),
      metaLeads.aggregate([{ $match: queryFilter }, { $group: { _id: '$stage', count: { $sum: 1 } } }]).toArray(),
      // avg contact time
      leads.aggregate([
        { $match: { ...queryFilter, stage: { $ne: 'new' } } },
        { $lookup: {
          from: 'activities',
          let: { leadId: { $toString: '$_id' }, tid: '$tenantId' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$leadId', '$$leadId'] },
              { $eq: ['$tenantId', '$$tid'] },
              { $ne: ['$type', 'utm_snapshot'] },
            ]}}},
            { $sort: { createdAt: 1 } },
            { $limit: 1 },
          ],
          as: 'firstActivity',
        }},
        { $unwind: '$firstActivity' },
        { $group: { _id: null, totalMs: { $sum: { $subtract: ['$firstActivity.createdAt', '$createdAt'] } }, count: { $sum: 1 } } },
      ]).toArray(),
      // SLA
      leads.aggregate([
        { $match: { ...queryFilter, createdAt: { $exists: true }, latestActivityAt: { $exists: true } } },
        { $group: { _id: null, total: { $sum: 1 }, withinSLA: { $sum: { $cond: [{ $lte: [{ $subtract: ['$latestActivityAt', '$createdAt'] }, slaMs] }, 1, 0] } } } },
      ]).toArray(),
      // source distribution
      leads.aggregate([{ $match: queryFilter }, { $group: { _id: '$source', count: { $sum: 1 } } }]).toArray(),
      metaLeads.aggregate([{ $match: queryFilter }, { $group: { _id: '$source', count: { $sum: 1 } } }]).toArray(),
      // team
      tenantId ? usersCollection.find({ tenantId, active: true }, { projection: { firstName: 1, lastName: 1, role: 1 } }).toArray() : Promise.resolve([]),
      leads.aggregate([
        { $match: { ...queryFilter, assignedUserId: { $exists: true, $ne: null } } },
        { $group: { _id: '$assignedUserId', count: { $sum: 1 } } },
      ]).toArray(),
      activities.aggregate([
        { $match: { ...(tenantId ? { tenantId } : {}), userId: { $exists: true, $ne: null } } },
        { $group: { _id: '$userId', total: { $sum: 1 },
          calls:  { $sum: { $cond: [{ $eq: ['$type', 'call'] },   1, 0] } },
          emails: { $sum: { $cond: [{ $eq: ['$type', 'email'] },  1, 0] } },
          notes:  { $sum: { $cond: [{ $eq: ['$type', 'note'] },   1, 0] } },
          sms:    { $sum: { $cond: [{ $eq: ['$type', 'sms'] },    1, 0] } },
        }},
      ]).toArray(),
      // weekly velocity — 1 $bucket per collection instead of 24 countDocuments
      leads.aggregate([
        { $match: { ...queryFilter, createdAt: { $gte: weekBoundaries[0], $lt: weekBoundaries[12] } } },
        { $bucket: { groupBy: '$createdAt', boundaries: weekBoundaries, default: '__other__',
          output: { total: { $sum: 1 }, qualified: { $sum: { $cond: [{ $in: ['$stage', QUALIFIED_STAGES] }, 1, 0] } } } } },
      ]).toArray(),
      metaLeads.aggregate([
        { $match: { ...queryFilter, createdAt: { $gte: weekBoundaries[0], $lt: weekBoundaries[12] } } },
        { $bucket: { groupBy: '$createdAt', boundaries: weekBoundaries, default: '__other__',
          output: { total: { $sum: 1 }, qualified: { $sum: { $cond: [{ $in: ['$stage', QUALIFIED_STAGES] }, 1, 0] } } } } },
      ]).toArray(),
      // monthly velocity — 1 $bucket per collection instead of 24 countDocuments
      leads.aggregate([
        { $match: { ...queryFilter, createdAt: { $gte: monthBoundaries[0], $lt: monthBoundaries[12] } } },
        { $bucket: { groupBy: '$createdAt', boundaries: monthBoundaries, default: '__other__',
          output: { total: { $sum: 1 }, qualified: { $sum: { $cond: [{ $in: ['$stage', QUALIFIED_STAGES] }, 1, 0] } } } } },
      ]).toArray(),
      metaLeads.aggregate([
        { $match: { ...queryFilter, createdAt: { $gte: monthBoundaries[0], $lt: monthBoundaries[12] } } },
        { $bucket: { groupBy: '$createdAt', boundaries: monthBoundaries, default: '__other__',
          output: { total: { $sum: 1 }, qualified: { $sum: { $cond: [{ $in: ['$stage', QUALIFIED_STAGES] }, 1, 0] } } } } },
      ]).toArray(),
    ]);

    // ── Assemble results ───────────────────────────────────────────────────────
    const totalLeads = websiteLeadsCount + metaLeadsCount;
    const leadsThisWeek = websiteLeadsThisWeek + metaLeadsThisWeek;
    const archivedCount = websiteArchivedCount + metaArchivedCount;

    const stageData = {};
    for (const item of websiteStageDistribution) stageData[item._id] = (stageData[item._id] || 0) + item.count;
    for (const item of metaStageDistribution)     stageData[item._id] = (stageData[item._id] || 0) + item.count;

    const avgTimeToContact = contactTimeResult[0]?.count > 0
      ? Math.round(contactTimeResult[0].totalMs / contactTimeResult[0].count / (1000 * 60 * 60))
      : null;

    const pctWithinSLA = slaResult[0]?.total > 0
      ? Math.round((slaResult[0].withinSLA / slaResult[0].total) * 100 * 10) / 10
      : 0;

    const sourceData = {};
    for (const item of websiteSourceDistribution) sourceData[item._id] = (sourceData[item._id] || 0) + item.count;
    for (const item of metaSourceDistribution)    sourceData[item._id] = (sourceData[item._id] || 0) + item.count;
    const sourceDistribution = Object.entries(sourceData)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    const assignedMap = Object.fromEntries(assignedLeadsCursor.map(r => [r._id?.toString(), r.count]));
    const activityMap = Object.fromEntries(userActivityCursor.map(r => [r._id?.toString(), r]));
    const teamPerformance = tenantUsers.map(u => {
      const uid = u._id.toString();
      const act = activityMap[uid] || { total: 0, calls: 0, emails: 0, notes: 0, sms: 0 };
      return { name: `${u.firstName} ${u.lastName}`, role: u.role,
        assignedLeads: assignedMap[uid] || 0, activitiesTotal: act.total,
        calls: act.calls, emails: act.emails, notes: act.notes, sms: act.sms };
    }).sort((a, b) => b.assignedLeads - a.assignedLeads);

    // Merge $bucket results for weekly velocity
    const weekBucketMap = new Map();
    for (const b of [...leadsWeekBuckets, ...metaLeadsWeekBuckets]) {
      const key = b._id instanceof Date ? b._id.getTime() : new Date(b._id).getTime();
      const existing = weekBucketMap.get(key) || { total: 0, qualified: 0 };
      weekBucketMap.set(key, { total: existing.total + b.total, qualified: existing.qualified + b.qualified });
    }
    const leadVelocity = weekRanges.map(r => {
      const b = weekBucketMap.get(r.weekStart.getTime()) || { total: 0, qualified: 0 };
      return { label: r.label, total: b.total, qualified: b.qualified };
    });

    // Merge $bucket results for monthly velocity
    const monthBucketMap = new Map();
    for (const b of [...leadsMonthBuckets, ...metaLeadsMonthBuckets]) {
      const key = b._id instanceof Date ? b._id.getTime() : new Date(b._id).getTime();
      const existing = monthBucketMap.get(key) || { total: 0, qualified: 0 };
      monthBucketMap.set(key, { total: existing.total + b.total, qualified: existing.qualified + b.qualified });
    }
    const leadVelocityMonthly = monthRanges.map(r => {
      const b = monthBucketMap.get(r.monthStart.getTime()) || { total: 0, qualified: 0 };
      return { label: r.label, total: b.total, qualified: b.qualified };
    });

    const responseData = {
      totalLeads,
      leadsThisWeek,
      archivedCount,
      avgTimeToContact,
      pctWithinSLA,
      stageDistribution: stageData,
      sourceDistribution,
      teamPerformance,
      leadVelocity,
      leadVelocityMonthly,
    };

    // ── Store in both cache levels ─────────────────────────────────────────────
    statsCache.set(cacheKey, { data: responseData, ts: Date.now() });
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
    // Fire-and-forget — don't await, so the response isn't delayed
    dashboardCache.updateOne(
      { cacheKey },
      { $set: { cacheKey, data: responseData, expiresAt } },
      { upsert: true }
    ).catch(() => {}); // swallow cache write errors

    return res.status(200).json(responseData);
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
