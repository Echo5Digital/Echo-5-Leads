import { getDb, resolveTenantId } from '../lib/mongo.js';
import { ObjectId } from 'mongodb';

export default async function deleteLead(req, res) {
  try {
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const db = await getDb();
    const tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });

    const leadId = req.params.id;
    if (!leadId || !ObjectId.isValid(leadId)) {
      return res.status(400).json({ error: 'Invalid lead ID' });
    }

    const leads = db.collection('leads');
    const activities = db.collection('activities');

    // Find the lead first to ensure it exists and belongs to this tenant
    const lead = await leads.findOne({ _id: new ObjectId(leadId), tenantId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Delete all activities associated with this lead
    await activities.deleteMany({ leadId: leadId, tenantId });

    // Delete the lead
    await leads.deleteOne({ _id: new ObjectId(leadId), tenantId });

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
