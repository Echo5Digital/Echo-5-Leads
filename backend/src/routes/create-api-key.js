// POST /api/tenants/:id/api-keys - Create new API key for a tenant
import { getDb, sha256WithPepper } from '../lib/mongo.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const { id: tenantId } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Verify tenant exists
    const tenant = await db.collection('tenants').findOne({ _id: tenantId });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Generate raw API key
    const prefix = tenant.slug.substring(0, 2) || 'e5';
    const randomHex = crypto.randomBytes(16).toString('hex');
    const rawKey = `${prefix}_${randomHex}`;

    // Hash the key for storage
    const keyHash = sha256WithPepper(rawKey);

    // Insert into api_keys collection
    const apiKey = {
      tenantId,
      keyHash,
      name,
      active: true,
      createdAt: new Date(),
      lastUsedAt: null,
    };

    const result = await db.collection('api_keys').insertOne(apiKey);

    console.log('[API Key] Created new key for tenant:', tenantId);

    // Return the raw key ONCE (never stored, never shown again)
    res.status(201).json({
      success: true,
      apiKeyId: result.insertedId.toString(),
      rawKey,  // ⚠️ ONLY TIME THIS IS SHOWN
      name,
      message: 'API key created. Save this key now - it will not be shown again.',
    });
  } catch (err) {
    console.error('Error creating API key:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
