// GET /api/tenants/:tenantId/api-keys/:keyId/reveal - Reveal full API key (decrypt)
import { getDb, decryptApiKey } from '../lib/mongo.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const { tenantId, keyId } = req.params;

    // Find the API key
    const apiKey = await db.collection('api_keys').findOne({
      _id: new ObjectId(keyId),
      tenantId: tenantId
    });

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Decrypt the key
    const rawKey = decryptApiKey(apiKey.encryptedKey);

    if (!rawKey) {
      return res.status(500).json({ error: 'Failed to decrypt API key' });
    }

    console.log('[API Key] Revealed key for tenant:', tenantId, 'key ID:', keyId);

    res.status(200).json({
      success: true,
      rawKey,
      name: apiKey.name,
      active: apiKey.active,
      createdAt: apiKey.createdAt,
      warning: 'Keep this key secure. Do not share it publicly.'
    });
  } catch (err) {
    console.error('Error revealing API key:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
