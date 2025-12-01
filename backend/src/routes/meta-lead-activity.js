import { getDb } from '../lib/mongo.js';
import { authenticateToken } from '../lib/auth.js';
import { ObjectId } from 'mongodb';

export default async function addMetaActivity(req, res) {
  try {
    const db = await getDb();
    const { leadId } = req.params;
    const { type, content } = req.body;

    if (!leadId || !type) {
      return res.status(400).json({ error: 'leadId and type are required' });
    }

    // Verify lead exists
    const metaLeadsCol = db.collection('meta_leads');
    const lead = await metaLeadsCol.findOne({ _id: new ObjectId(leadId) });

    if (!lead) {
      return res.status(404).json({ error: 'Meta lead not found' });
    }

    // Create activity
    const activitiesCol = db.collection('meta_activities');
    const activity = {
      tenantId: lead.tenantId,
      leadId,
      type,
      content: content || {},
      createdAt: new Date(),
      createdBy: req.user?.userId || null,
    };

    const result = await activitiesCol.insertOne(activity);

    // Update lead's latestActivityAt
    await metaLeadsCol.updateOne(
      { _id: new ObjectId(leadId) },
      { $set: { latestActivityAt: new Date() } }
    );

    return res.status(201).json({ ...activity, _id: result.insertedId });
  } catch (err) {
    console.error('Add meta activity error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

export const protectedAddMetaActivity = [authenticateToken, addMetaActivity];
