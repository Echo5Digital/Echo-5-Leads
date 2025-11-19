// PUT /api/tenant/config - Update tenant configuration
import { getDb, resolveTenantId } from '../lib/mongo.js';
import { authenticateToken, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    let tenantId = null;

    // Check if authenticated user or API key
    if (req.user) {
      if (req.user.role === ROLES.SUPER_ADMIN) {
        // SuperAdmin can update any tenant's config
        if (req.query.tenantId) {
          const queryTenantId = req.query.tenantId;
          if (queryTenantId.length === 36 || queryTenantId.length === 24) {
            tenantId = queryTenantId.length === 24 ? new ObjectId(queryTenantId) : queryTenantId;
          }
        } else {
          return res.status(400).json({ error: 'SuperAdmin must specify tenantId' });
        }
      } else if (req.user.role === ROLES.CLIENT_ADMIN) {
        // ClientAdmin can only update their own tenant
        tenantId = req.user.tenantId;
      } else {
        // Members cannot update config
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    } else {
      // Fallback to API key authentication
      const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
      tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
      if (!tenantId) return res.status(401).json({ error: 'Authentication required' });
    }

    const { stages, users, spamKeywords, slaHours, metaAccessToken } = req.body;

    // Build update object
    const updates = {};
    if (stages && Array.isArray(stages)) {
      // Validate stages are non-empty strings
      if (stages.some(s => !s || typeof s !== 'string')) {
        return res.status(400).json({ error: 'Invalid stages format' });
      }
      updates['config.stages'] = stages;
    }
    if (users && Array.isArray(users)) {
      // Validate users have name property
      if (users.some(u => !u.name || typeof u.name !== 'string')) {
        return res.status(400).json({ error: 'Invalid users format' });
      }
      updates['config.users'] = users;
    }
    if (spamKeywords && Array.isArray(spamKeywords)) {
      updates['config.spamKeywords'] = spamKeywords;
    }
    if (slaHours && typeof slaHours === 'number' && slaHours > 0) {
      updates['config.slaHours'] = slaHours;
    }
    if (metaAccessToken && typeof metaAccessToken === 'string') {
      updates['config.metaAccessToken'] = metaAccessToken;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    const result = await db.collection('tenants').updateOne(
      { _id: tenantId },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.status(200).json({ message: 'Configuration updated successfully' });
  } catch (err) {
    console.error('Error updating tenant config:', err);
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
