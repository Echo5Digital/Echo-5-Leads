import { getDb, resolveTenantId } from '../lib/mongo.js';
import { authenticateToken, canAccessTenant, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function getLeads(req, res) {
  try {
    const db = await getDb();
    let tenantId = null;

    // Check if authenticated user or API key
    if (req.user) {
      // Authenticated user - apply role-based filtering
      if (req.user.role === ROLES.SUPER_ADMIN) {
        // SuperAdmin can optionally filter by tenant, otherwise see all
        console.log('SuperAdmin request - tenantId query:', req.query.tenantId);
        if (req.query.tenantId) {
          // Handle both UUID and ObjectId formats
          const queryTenantId = req.query.tenantId;
          console.log('Processing tenantId:', queryTenantId, 'Length:', queryTenantId.length);
          if (queryTenantId.length === 36 && queryTenantId.includes('-')) {
            // UUID format (like 01531771-445b-43e1-a1af-3d0e7ca051e3)
            tenantId = queryTenantId;
            console.log('Set tenantId to UUID:', tenantId);
          } else if (queryTenantId.length === 24) {
            // ObjectId format
            try {
              tenantId = new ObjectId(queryTenantId);
              console.log('Set tenantId to ObjectId:', tenantId);
            } catch (error) {
              console.log('ObjectId conversion error:', error);
              return res.status(400).json({ error: 'Invalid tenant ID format' });
            }
          } else {
            console.log('Invalid tenantId format - length:', queryTenantId.length);
            return res.status(400).json({ error: 'Invalid tenant ID format' });
          }
        }
        // If no tenantId query param, tenantId stays null = show all leads
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
    
    // Add tenant filter if we have a tenantId
    if (tenantId) {
      // Use tenantId as-is (supports both UUID and ObjectId formats)
      filter.tenantId = tenantId;
    } else if (req.user && req.user.role !== ROLES.SUPER_ADMIN) {
      // Non-SuperAdmin users must have a tenant
      return res.status(403).json({ error: 'Access denied: No tenant assigned' });
    }
    // SuperAdmin with no tenantId = no tenant filter = see all leads
    
    // Members can see all leads in their tenant (same as ClientAdmin)
    // No additional filtering needed - tenant filter is sufficient
    
    if (stage) filter.stage = stage;
    if (source) filter.source = source;
    if (spamFlagParam === 'true') filter.spamFlag = true;
    if (spamFlagParam === 'false') filter.spamFlag = false;
    
    // Filter by assigned user
    if (assignedToParam) {
      if (assignedToParam === 'unassigned') {
        // Show only unassigned leads
        filter.assignedUserId = null;
      } else {
        // Show leads assigned to specific user
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

    console.log('Final filter:', JSON.stringify(filter, null, 2));
    console.log('User role:', req.user?.role);
    console.log('User tenantId:', req.user?.tenantId);
    
    const leadsCol = db.collection('leads');
    const [items, total] = await Promise.all([
      leadsCol.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      leadsCol.countDocuments(filter)
    ]);

    console.log('Query results - Total:', total, 'Items returned:', items.length);

    return res.status(200).json({ page, limit, total, items });
  } catch (err) {
    console.error('List leads error:', err);
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

export default [flexibleAuth, getLeads];
