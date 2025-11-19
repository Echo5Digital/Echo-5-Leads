// GET /api/tenant/config - Get tenant configuration including stages and users
import { getDb, resolveTenantId } from '../lib/mongo.js';
import { authenticateToken, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    let tenantId = null;

    // Check if authenticated user or API key
    if (req.user) {
      if (req.user.role === ROLES.SUPER_ADMIN) {
        // SuperAdmin can request any tenant's config
        if (req.query.tenantId) {
          const queryTenantId = req.query.tenantId;
          if (queryTenantId.length === 36 || queryTenantId.length === 24) {
            tenantId = queryTenantId.length === 24 ? new ObjectId(queryTenantId) : queryTenantId;
          }
        } else {
          return res.status(400).json({ error: 'SuperAdmin must specify tenantId' });
        }
      } else {
        // ClientAdmin and Member use their assigned tenant
        tenantId = req.user.tenantId;
      }
    } else {
      // Fallback to API key authentication
      const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
      tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
      if (!tenantId) return res.status(401).json({ error: 'Authentication required' });
    }

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

export default [flexibleAuth, handler];
