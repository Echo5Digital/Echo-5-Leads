// GET /api/tenants/:id - Get specific tenant details
import { getDb } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const tenantId = req.params.id;

    const tenant = await db.collection('tenants').findOne({ _id: tenantId });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get API keys for this tenant
    const apiKeys = await db.collection('api_keys')
      .find({ tenantId: tenant._id })
      .sort({ createdAt: -1 })
      .toArray();

    // Get lead count
    const leadCount = await db.collection('leads').countDocuments({ tenantId: tenant._id });

    res.status(200).json({
      tenant: {
        ...tenant,
        leadCount,
        apiKeys: apiKeys.map(key => ({
          name: key.name,
          active: key.active,
          createdAt: key.createdAt,
          lastUsedAt: key.lastUsedAt
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching tenant:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
