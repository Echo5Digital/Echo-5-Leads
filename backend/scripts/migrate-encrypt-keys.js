#!/usr/bin/env node

/**
 * Migration Script: Add Encrypted Keys
 * Updates existing API keys to include encryptedKey field
 * 
 * WARNING: This cannot recover the original keys if they weren't saved!
 * This script will only work for keys you still have access to.
 */

import 'dotenv/config';
import { getDb, sha256WithPepper, encryptApiKey } from '../src/lib/mongo.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function migrateApiKeys() {
  const db = await getDb();
  
  console.log('\n🔐 API Key Migration Script\n');
  console.log('This script will add encrypted versions of API keys for viewing.');
  console.log('⚠️  You need to provide the raw keys for encryption.\n');

  const apiKeys = await db.collection('api_keys').find({ encryptedKey: { $exists: false } }).toArray();

  if (apiKeys.length === 0) {
    console.log('✅ All API keys already have encrypted versions. No migration needed.\n');
    process.exit(0);
  }

  console.log(`Found ${apiKeys.length} API key(s) without encrypted versions:\n`);

  for (const key of apiKeys) {
    const tenant = await db.collection('tenants').findOne({ _id: key.tenantId });
    console.log(`\n📋 Key: "${key.name}"`);
    console.log(`   Tenant: ${tenant?.name || key.tenantId}`);
    console.log(`   Created: ${new Date(key.createdAt).toISOString()}`);
    console.log(`   Status: ${key.active ? 'Active' : 'Revoked'}`);

    const rawKey = await question('   Enter raw API key (or press Enter to skip): ');

    if (!rawKey.trim()) {
      console.log('   ⏭️  Skipped');
      continue;
    }

    // Verify the key is correct
    const testHash = sha256WithPepper(rawKey.trim());
    if (testHash !== key.keyHash) {
      console.log('   ❌ Error: Key does not match hash. Skipping.');
      continue;
    }

    // Encrypt and update
    const encryptedKey = encryptApiKey(rawKey.trim());
    await db.collection('api_keys').updateOne(
      { _id: key._id },
      { $set: { encryptedKey } }
    );

    console.log('   ✅ Encrypted and stored successfully');
  }

  console.log('\n✨ Migration complete!\n');
  rl.close();
  process.exit(0);
}

migrateApiKeys().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
