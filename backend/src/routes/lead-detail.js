import { getDb, resolveTenantId } from '../lib/mongo.js';
import { ObjectId } from 'mongodb';
import { authenticateToken, canViewLead, ROLES } from '../lib/auth.js';

async function getLeadDetail(req, res) {
  try {
    const db = await getDb();
    const id = req.params.id;
    
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    
    let oid;
    try { 
      oid = new ObjectId(id); 
    } catch { 
      return res.status(400).json({ error: 'Invalid id format' }); 
    }

    let lead = null;
    
    // Check if authenticated user or API key
    if (req.user) {
      // Authenticated user - check permissions
      const { canView, lead: foundLead } = await canViewLead(db, req.user, id);
      if (!canView) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      lead = foundLead;
    } else {
      // Fallback to API key authentication
      const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
      const tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
      if (!tenantId) return res.status(401).json({ error: 'Authentication required' });
      
      const leads = db.collection('leads');
      lead = await leads.findOne({ _id: oid, tenantId });
      if (!lead) return res.status(404).json({ error: 'Not found' });
    }

    const activities = db.collection('activities');
    const acts = await activities.find({ tenantId: lead.tenantId, leadId: id }).sort({ createdAt: -1 }).toArray();
    
    return res.status(200).json({ lead, activities: acts });
  } catch (err) {
    console.error('Lead detail error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

// Flexible authentication middleware
function flexibleAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    return authenticateToken(req, res, next);
  } else {
    next();
  }
}

export default [flexibleAuth, getLeadDetail];
