import { getDb, resolveTenantId } from '../lib/mongo.js';
import { authenticateToken, canAccessTenant, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function getMetaLeads(req, res) {
  try {
    const db = await getDb();
    let tenantId = null;

    // Check if authenticated user or API key
    if (req.user) {
      // Authenticated user - apply role-based filtering
      if (req.user.role === ROLES.SUPER_ADMIN) {
        if (req.query.tenantId) {
          const queryTenantId = req.query.tenantId;
          if (queryTenantId.length === 36 && queryTenantId.includes('-')) {
            // UUID format
            tenantId = queryTenantId;
          } else if (queryTenantId.length === 24) {
            // ObjectId format
            try {
              tenantId = new ObjectId(queryTenantId);
            } catch (error) {
              return res.status(400).json({ error: 'Invalid tenant ID format' });
            }
          } else {
            return res.status(400).json({ error: 'Invalid tenant ID format' });
          }
        }
      } else {
        // ClientAdmin and Member - use their assigned tenant
        tenantId = req.user.tenantId;
      }
    } else {
      // Fallback to API key authentication
      const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
      tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
      if (!tenantId) return res.status(401).json({ error: 'Authentication required' });
    }

    const stage = req.query.stage || undefined;
    const source = req.query.source || undefined;
    const spamFlagParam = req.query.spam_flag;
    const assignedToParam = req.query.assignedTo;
    const q = req.query.q || undefined;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    // Build base filter
    const filter = {};
    
    if (tenantId) {
      filter.tenantId = tenantId;
    } else if (req.user && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Access denied: No tenant assigned' });
    }
    
    if (stage) filter.stage = stage;
    if (source) filter.source = source;
    if (spamFlagParam === 'true') filter.spamFlag = true;
    if (spamFlagParam === 'false') filter.spamFlag = false;
    
    if (assignedToParam) {
      if (assignedToParam === 'unassigned') {
        filter.assignedUserId = null;
      } else {
        filter.assignedUserId = assignedToParam;
      }
    }

    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { firstName: rx }, { lastName: rx }, { email: rx }, { phoneE164: rx }, { city: rx }
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    console.log('Meta Leads filter:', JSON.stringify(filter, null, 2));
    
    const metaLeadsCol = db.collection('meta_leads');
    const [items, total] = await Promise.all([
      metaLeadsCol.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      metaLeadsCol.countDocuments(filter)
    ]);

    console.log('Meta Leads query - Total:', total, 'Items returned:', items.length);

    return res.status(200).json({ page, limit, total, items });
  } catch (err) {
    console.error('List meta leads error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

function flexibleAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    return authenticateToken(req, res, next);
  } else {
    next();
  }
}

export default [flexibleAuth, getMetaLeads];
