import { getDb } from '../lib/mongo.js';
import { authenticateToken, canAccessTenant, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function getMetaLead(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lead ID' });
    }

    const metaLeadsCol = db.collection('meta_leads');
    const activitiesCol = db.collection('meta_activities');

    const lead = await metaLeadsCol.findOne({ _id: new ObjectId(id) });

    if (!lead) {
      return res.status(404).json({ error: 'Meta lead not found' });
    }

    // Check tenant access
    if (req.user) {
      const canAccess = canAccessTenant(req.user.role, req.user.tenantId, lead.tenantId);
      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get activities
    const activities = await activitiesCol.find({ leadId: id }).sort({ createdAt: -1 }).toArray();

    return res.status(200).json({ ...lead, activities });
  } catch (err) {
    console.error('Get meta lead error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

function protectedRoute(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    return authenticateToken(req, res, next);
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

export default [protectedRoute, getMetaLead];
