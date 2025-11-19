// GET /api/tenants - List all tenants (admin endpoint)
import { getDb } from '../lib/mongo.js';
import { authenticateToken, requireRole, ROLES, canAccessTenant } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function listTenants(req, res) {
  try {
    const db = await getDb();
    let tenantsQuery = {};

    // Role-based filtering
    if (req.user.role === ROLES.CLIENT_ADMIN) {
      // ClientAdmin can only see their own tenant
      tenantsQuery = { _id: new ObjectId(req.user.tenantId) };
    }
    // SuperAdmin can see all tenants (no filter needed)

    const tenants = await db.collection('tenants')
      .find(tenantsQuery)
      .sort({ createdAt: -1 })
      .toArray();

    // Get API key count for each tenant
    const tenantsWithKeys = await Promise.all(
      tenants.map(async (tenant) => {
        const keyCount = await db.collection('api_keys').countDocuments({
          tenantId: tenant._id,
          active: true
        });
        return {
          ...tenant,
          activeApiKeys: keyCount
        };
      })
    );

    res.status(200).json({ tenants: tenantsWithKeys });
  } catch (err) {
    console.error('Error fetching tenants:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Protected route
export default [
  authenticateToken, 
  requireRole(ROLES.SUPER_ADMIN, ROLES.CLIENT_ADMIN), 
  listTenants
];
