// PUT /api/tenant/config - Update tenant configuration
import { getDb, resolveTenantId } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const tenantId = await resolveTenantId(db, apiKey);
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });

    const { stages, users, spamKeywords, slaHours, metaAccessToken } = req.body;

    // Build update object
    const updates = {};
    if (stages && Array.isArray(stages)) {
      // Validate stages are non-empty strings
      if (stages.some(s => !s || typeof s !== 'string')) {
        return res.status(400).json({ error: 'Invalid stages format' });
      }
      updates['config.stages'] = stages;
    }
    if (users && Array.isArray(users)) {
      // Validate users have name property
      if (users.some(u => !u.name || typeof u.name !== 'string')) {
        return res.status(400).json({ error: 'Invalid users format' });
      }
      updates['config.users'] = users;
    }
    if (spamKeywords && Array.isArray(spamKeywords)) {
      updates['config.spamKeywords'] = spamKeywords;
    }
    if (slaHours && typeof slaHours === 'number' && slaHours > 0) {
      updates['config.slaHours'] = slaHours;
    }
    if (metaAccessToken && typeof metaAccessToken === 'string') {
      updates['config.metaAccessToken'] = metaAccessToken;
    }

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

    res.status(200).json({ message: 'Configuration updated successfully' });
  } catch (err) {
    console.error('Error updating tenant config:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
