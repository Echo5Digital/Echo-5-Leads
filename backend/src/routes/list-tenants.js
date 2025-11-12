// GET /api/tenants - List all tenants (admin endpoint)
import { getDb } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    
    // For now, no authentication check - in production, add admin role check
    // const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    // TODO: Check if apiKey belongs to admin/super-admin user

    const tenants = await db.collection('tenants')
      .find({})
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
