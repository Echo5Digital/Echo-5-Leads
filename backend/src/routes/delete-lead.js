import { getDb, resolveTenantId } from '../lib/mongo.js';
import { ObjectId } from 'mongodb';
import { authenticateToken, ROLES } from '../lib/auth.js';

async function deleteLeadHandler(req, res) {
  try {
    const db = await getDb();
    let tenantId = null;
    
    // Check if user is authenticated (frontend delete operation)
    if (req.user) {
      // Authenticated user - use their tenant context
      if (req.user.role === ROLES.SUPER_ADMIN) {
        // SuperAdmin can delete leads from any tenant - determine tenant from lead itself
        tenantId = null; // Will be determined from the lead record
      } else {
        // ClientAdmin/Member - use their assigned tenant
        tenantId = req.user.tenantId;
      }
      console.log('Authenticated delete - User role:', req.user.role, 'tenantId:', tenantId);
    } else {
      // Fallback to API key authentication (if needed for external systems)
      const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
      tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
      if (!tenantId) return res.status(401).json({ error: 'Authentication required' });
      console.log('API key delete - tenantId:', tenantId);
    }

    const leadId = req.params.id;
    if (!leadId || !ObjectId.isValid(leadId)) {
      return res.status(400).json({ error: 'Invalid lead ID' });
    }

    const leads = db.collection('leads');
    const activities = db.collection('activities');

    // Find the lead first to ensure it exists and user has access
    let findQuery = { _id: new ObjectId(leadId) };
    if (tenantId) {
      // Add tenant filter for non-SuperAdmin users or API key access
      findQuery.tenantId = tenantId;
    }
    
    const lead = await leads.findOne(findQuery);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    // For SuperAdmin without specific tenant, use the lead's tenant for activity cleanup
    const actualTenantId = tenantId || lead.tenantId;
    
    // Delete all activities associated with this lead
    await activities.deleteMany({ leadId: leadId, tenantId: actualTenantId });

    // Delete the lead
    await leads.deleteOne({ _id: new ObjectId(leadId) });

    return res.status(200).json({ 
      success: true, 
      message: 'Lead and associated activities deleted successfully' 
    });
  } catch (err) {
    console.error('Delete lead error:', err);
    return res.status(500).json({ 
      error: 'internal_error', 
      details: String(err?.message || err) 
    });
  }
}

export default function deleteLead(req, res) {
  // Try to authenticate user first, but don't require it (fallback to API key)
  authenticateToken(req, res, () => deleteLeadHandler(req, res), false);
}
