#!/usr/bin/env node

/**
 * Quick Migration: Add encrypted keys for test clients
 */

import 'dotenv/config';
import { getDb, sha256WithPepper, encryptApiKey } from '../src/lib/mongo.js';

const knownKeys = [
  'open_523e0520a0fd927169f2fb0a14099fb2',
  'caring_f8b1676f6bdedaf4190cef75129b4201',
  'family_ed44dd58739b941b93c1591b8441384a'
];

async function quickMigrate() {
  const db = await getDb();
  
  console.log('\n🔐 Quick Migration: Adding encrypted keys\n');

  for (const rawKey of knownKeys) {
    const keyHash = sha256WithPepper(rawKey);
    const key = await db.collection('api_keys').findOne({ keyHash });

    if (!key) {
      console.log(`❌ Key not found: ${rawKey.substring(0, 10)}...`);
      continue;
    }

    if (key.encryptedKey) {
      console.log(`⏭️  Already encrypted: ${key.name}`);
      continue;
    }

    const encryptedKey = encryptApiKey(rawKey);
    await db.collection('api_keys').updateOne(
      { _id: key._id },
      { $set: { encryptedKey } }
    );

    const tenant = await db.collection('tenants').findOne({ _id: key.tenantId });
    console.log(`✅ Encrypted: ${key.name} (${tenant?.name || key.tenantId})`);
  }

  console.log('\n✨ Migration complete!\n');
  process.exit(0);
}

quickMigrate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
