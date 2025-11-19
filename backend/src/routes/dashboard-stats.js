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

    // Total leads
    const totalLeads = await leads.countDocuments(queryFilter);

    // Leads this week
    const leadsThisWeek = await leads.countDocuments({
      ...queryFilter,
      createdAt: { $gte: oneWeekAgo }
    });

    // Lead distribution by stage
    const stageDistribution = await leads.aggregate([
      { $match: queryFilter },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    const stageData = stageDistribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Calculate avg time to first contact
    const leadsWithContact = await leads.find({
      ...queryFilter,
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
