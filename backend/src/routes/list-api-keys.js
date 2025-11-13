// GET /api/tenants/:id/api-keys - List API keys for a tenant
import { getDb } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const { id } = req.params;

    // Fetch API keys for this tenant
    const apiKeys = await db.collection('api_keys')
      .find({ tenantId: id })
      .sort({ createdAt: -1 })
      .toArray();

    // Transform keys to include a hint but exclude full keyHash
    const keysWithHints = apiKeys.map(key => ({
      _id: key._id,
      tenantId: key.tenantId,
      name: key.name,
      active: key.active,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      keyHint: key.keyHash ? key.keyHash.substring(0, 8) : null // First 8 chars as hint
    }));

    res.status(200).json(keysWithHints);
  } catch (err) {
    console.error('Error fetching API keys:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
