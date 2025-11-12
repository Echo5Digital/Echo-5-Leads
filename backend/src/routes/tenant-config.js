// GET /api/tenant/config - Get tenant configuration including stages and users
import { getDb, resolveTenantId } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const tenantId = await resolveTenantId(db, apiKey);
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });

    const tenant = await db.collection('tenants').findOne({ _id: tenantId });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Default stages if not configured
    const defaultStages = [
      'new',
      'contacted',
      'qualified',
      'orientation',
      'application',
      'home_study',
      'licensed',
      'placement',
      'not_fit'
    ];

    // Return tenant configuration
    const config = {
      tenantId: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      stages: tenant.config?.stages || defaultStages,
      users: tenant.config?.users || [],
      spamKeywords: tenant.config?.spamKeywords || [],
      slaHours: tenant.config?.slaHours || 24,
      allowedOrigins: tenant.config?.allowedOrigins || []
    };

    res.status(200).json(config);
  } catch (err) {
    console.error('Error fetching tenant config:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
