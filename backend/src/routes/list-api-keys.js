// GET /api/tenants/:id/api-keys - List API keys for a tenant
import { getDb } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const { id } = req.params;

    // Fetch API keys for this tenant (exclude keyHash for security)
    const apiKeys = await db.collection('api_keys').find(
      { tenantId: id },
      { 
        projection: { 
          keyHash: 0  // Never expose key hash
        } 
      }
    ).sort({ createdAt: -1 }).toArray();

    res.status(200).json(apiKeys);
  } catch (err) {
    console.error('Error fetching API keys:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
