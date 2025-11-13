// DELETE /api/tenants/:tenantId/api-keys/:keyId - Revoke (deactivate) an API key
import { getDb } from '../lib/mongo.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const { tenantId, keyId } = req.params;

    // Update the key to set active = false
    const result = await db.collection('api_keys').updateOne(
      { _id: new ObjectId(keyId), tenantId },
      { $set: { active: false, revokedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    console.log('[API Key] Revoked key:', keyId);

    res.status(200).json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (err) {
    console.error('Error revoking API key:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
