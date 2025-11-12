// PUT /api/tenants/:id - Update tenant details
import { getDb } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const tenantId = req.params.id;
    const { name, stages, users, spamKeywords, slaHours } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (stages) updates['config.stages'] = stages;
    if (users) updates['config.users'] = users;
    if (spamKeywords) updates['config.spamKeywords'] = spamKeywords;
    if (slaHours) updates['config.slaHours'] = slaHours;

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

    res.status(200).json({ message: 'Tenant updated successfully' });
  } catch (err) {
    console.error('Error updating tenant:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
