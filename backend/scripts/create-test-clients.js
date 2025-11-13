#!/usr/bin/env node

/**
 * Create Test Clients Script
 * Creates multiple test tenant clients with API keys
 */

import 'dotenv/config';
import { getDb, sha256WithPepper } from '../src/lib/mongo.js';
import crypto from 'crypto';

const testClients = [
  {
    name: 'Open Arms Foster Care',
    slug: 'open-arms',
    config: {
      stages: ['new', 'contacted', 'qualified', 'orientation', 'application', 'home_study', 'licensed', 'placement', 'not_fit'],
      users: [],
      spamKeywords: ['viagra', 'casino', 'loan', 'crypto'],
      slaHours: 24,
      managerEmail: 'manager@openarmsfoster.org',
      allowedOrigins: ['https://openarmsfoster.org']
    }
  },
  {
    name: 'Caring Hearts Agency',
    slug: 'caring-hearts',
    config: {
      stages: ['new', 'contacted', 'qualified', 'orientation', 'application', 'home_study', 'licensed', 'placement', 'not_fit'],
      users: [],
      spamKeywords: ['spam', 'viagra', 'casino'],
      slaHours: 48,
      managerEmail: 'admin@caringhearts.com',
      allowedOrigins: ['https://caringhearts.com']
    }
  },
  {
    name: 'Family First Foster Care',
    slug: 'family-first',
    config: {
      stages: ['new', 'contacted', 'qualified', 'orientation', 'application', 'home_study', 'licensed', 'placement', 'not_fit'],
      users: [],
      spamKeywords: ['viagra', 'loan'],
      slaHours: 24,
      managerEmail: 'info@familyfirst.org',
      allowedOrigins: ['https://familyfirst.org']
    }
  }
];

function generateApiKey(prefix) {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${randomBytes}`;
}

async function createTestClients() {
  const db = await getDb();
  
  console.log('🚀 Creating test clients...\n');

  for (const clientData of testClients) {
    try {
      // Check if tenant already exists
      const existing = await db.collection('tenants').findOne({ slug: clientData.slug });
      
      let tenantId;
      if (existing) {
        console.log(`⚠️  Tenant "${clientData.name}" already exists (ID: ${existing._id})`);
        tenantId = existing._id;
      } else {
        // Create new tenant
        tenantId = crypto.randomUUID();
        await db.collection('tenants').insertOne({
          _id: tenantId,
          ...clientData,
          createdAt: new Date()
        });
        console.log(`✅ Created tenant: ${clientData.name}`);
        console.log(`   ID: ${tenantId}`);
      }

      // Generate API key for this tenant
      const prefix = clientData.slug.split('-')[0]; // e.g., 'open', 'caring', 'family'
      const rawKey = generateApiKey(prefix);
      const keyHash = sha256WithPepper(rawKey);

      // Check if key already exists
      const existingKey = await db.collection('api_keys').findOne({ 
        tenantId,
        name: 'Default Key'
      });

      if (existingKey) {
        console.log(`   API Key already exists for this tenant`);
      } else {
        // Insert API key
        await db.collection('api_keys').insertOne({
          tenantId,
          keyHash,
          name: 'Default Key',
          active: true,
          createdAt: new Date(),
          lastUsedAt: null
        });
        console.log(`   🔑 API Key: ${rawKey}`);
        console.log(`   ⚠️  SAVE THIS KEY - it will not be shown again!\n`);
      }

    } catch (error) {
      console.error(`❌ Error creating ${clientData.name}:`, error.message);
    }
  }

  console.log('\n✨ Done! Test clients created successfully.\n');
  process.exit(0);
}

createTestClients().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
