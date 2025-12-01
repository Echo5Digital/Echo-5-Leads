import { getDb } from '../lib/mongo.js';
import { authenticateToken, ROLES } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

async function updateMetaLead(req, res) {
  try {
    const { id } = req.params;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lead ID' });
    }

    const db = await getDb();
    const metaLeadsCol = db.collection('meta_leads');

    // Get the lead first
    const lead = await metaLeadsCol.findOne({ _id: new ObjectId(id) });
    if (!lead) {
      return res.status(404).json({ error: 'Meta lead not found' });
    }

    // Check access
    if (req.user.role === ROLES.CLIENT_ADMIN || req.user.role === ROLES.MEMBER) {
      if (lead.tenantId.toString() !== req.user.tenantId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Only allow updating certain fields
    const allowedFields = ['stage', 'assignedUserId', 'office', 'notes'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        updateData[field] = req.body[field];
      }
    });

    updateData.updatedAt = new Date();

    await metaLeadsCol.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    return res.status(200).json({ success: true, updatedFields: Object.keys(updateData) });
  } catch (err) {
    console.error('Update meta lead error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

function protectedRoute(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  return authenticateToken(req, res, next);
}

export default [protectedRoute, updateMetaLead];
