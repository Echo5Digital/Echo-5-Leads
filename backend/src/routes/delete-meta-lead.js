import { getDb } from '../lib/mongo.js';
import { authenticateToken, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function deleteMetaLeadHandler(req, res) {
  try {
    const { id } = req.params;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lead ID' });
    }

    // Check user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const db = await getDb();
    const metaLeadsCol = db.collection('meta_leads');
    const activitiesCol = db.collection('meta_activities');

    // Get the lead
    const lead = await metaLeadsCol.findOne({ _id: new ObjectId(id) });
    if (!lead) {
      return res.status(404).json({ error: 'Meta lead not found' });
    }

    // Check access - must be admin
    if (req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.CLIENT_ADMIN) {
      return res.status(403).json({ error: 'Only admins can delete leads' });
    }

    if (req.user.role === ROLES.CLIENT_ADMIN) {
      if (lead.tenantId.toString() !== req.user.tenantId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Delete lead and its activities
    await Promise.all([
      metaLeadsCol.deleteOne({ _id: new ObjectId(id) }),
      activitiesCol.deleteMany({ leadId: id })
    ]);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete meta lead error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

export default function deleteMetaLead(req, res) {
  // Authenticate user first - required for this operation
  authenticateToken(req, res, () => deleteMetaLeadHandler(req, res));
}
