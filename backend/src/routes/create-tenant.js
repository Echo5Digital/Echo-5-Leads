// POST /api/tenants - Create new tenant
import crypto from 'crypto';
import { getDb, sha256WithPepper } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const { name, slug, stages, users, spamKeywords, slaHours } = req.body;

    // Validation
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Check if slug already exists
    const existing = await db.collection('tenants').findOne({ slug });
    if (existing) {
      return res.status(400).json({ error: 'Slug already exists' });
    }

    // Default configuration
    const defaultStages = [
      'new', 'contacted', 'qualified', 'orientation',
      'application', 'home_study', 'licensed', 'placement', 'not_fit'
    ];

    const tenant = {
      _id: crypto.randomUUID(),
      name,
      slug,
      config: {
        stages: stages || defaultStages,
        users: users || [],
        spamKeywords: spamKeywords || [],
        slaHours: slaHours || 24,
        allowedOrigins: []
      },
      createdAt: new Date()
    };

    await db.collection('tenants').insertOne(tenant);

    // Generate API key
    const rawKey = slug.substring(0, 2).toLowerCase() + '_' + crypto.randomBytes(16).toString('hex');
    const keyHash = sha256WithPepper(rawKey);
    
    await db.collection('api_keys').insertOne({
      tenantId: tenant._id,
      keyHash,
      name: 'Default key',
      active: true,
      createdAt: new Date(),
      lastUsedAt: null
    });

    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug
      },
      apiKey: rawKey // Return raw key only once
    });
  } catch (err) {
    console.error('Error creating tenant:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
