// GET /api/sla/overdue - Get overdue leads across all tenants or specific tenant
import { getDb } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const { tenantId } = req.query;

    // Get all tenants (or specific tenant)
    const tenantsQuery = tenantId ? { _id: tenantId } : {};
    const tenants = await db.collection('tenants').find(tenantsQuery).toArray();

    const now = new Date();

    const tenantResults = await Promise.all(tenants.map(async (tenant) => {
      const slaHours = tenant.config?.slaHours || 24;
      const slaThreshold = new Date(now.getTime() - (slaHours * 60 * 60 * 1000));

      const overdueLeads = await db.collection('leads').find({
        tenantId: tenant._id,
        latestActivityAt: { $lt: slaThreshold },
        stage: { $nin: ['licensed', 'placement', 'not_fit', 'approved', 'denied'] }
      }, {
        projection: { firstName: 1, lastName: 1, email: 1, stage: 1, latestActivityAt: 1 }
      }).toArray();

      if (overdueLeads.length === 0) return null;

      return {
        tenantId: tenant._id,
        tenantName: tenant.name,
        slaHours,
        overdueCount: overdueLeads.length,
        leads: overdueLeads.map(lead => ({
          _id: lead._id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          stage: lead.stage,
          latestActivityAt: lead.latestActivityAt,
          hoursOverdue: Math.floor((now - new Date(lead.latestActivityAt)) / (1000 * 60 * 60))
        }))
      };
    }));

    const results = tenantResults.filter(Boolean);

    res.status(200).json({
      timestamp: now.toISOString(),
      totalOverdue: results.reduce((sum, r) => sum + r.overdueCount, 0),
      tenants: results
    });
  } catch (err) {
    console.error('Error fetching overdue leads:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
