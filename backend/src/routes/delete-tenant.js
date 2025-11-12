// DELETE /api/tenants/:id - Delete tenant (WARNING: deletes all data)
import { getDb } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const tenantId = req.params.id;

    // Check if tenant exists
    const tenant = await db.collection('tenants').findOne({ _id: tenantId });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Delete all related data
    await Promise.all([
      db.collection('tenants').deleteOne({ _id: tenantId }),
      db.collection('api_keys').deleteMany({ tenantId }),
      db.collection('leads').deleteMany({ tenantId }),
      db.collection('activities').deleteMany({ tenantId })
    ]);

    res.status(200).json({ 
      message: 'Tenant and all related data deleted successfully',
      deletedTenant: tenant.name
    });
  } catch (err) {
    console.error('Error deleting tenant:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
