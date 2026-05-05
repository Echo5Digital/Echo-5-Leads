/**
 * Setup script: Enable Initiative-specific features on the Open Arms Initiative tenant.
 *
 * Run with: node scripts/setup-initiative-features.js
 *
 * This sets:
 *   config.features.requireBothEmailAndPhone = true
 *   config.features.initiativeForms = true
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri || !dbName) {
  console.error('Missing MONGODB_URI or MONGODB_DB in .env');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const tenants = db.collection('tenants');

    // Find all tenants so we can pick the right one
    const all = await tenants.find({}).toArray();

    console.log('\nAvailable tenants:');
    all.forEach((t, i) => {
      console.log(`  [${i}] id=${t._id}  name="${t.name}"  slug="${t.slug}"`);
    });

    // Try to auto-select by name containing "initiative" (case-insensitive)
    let target = all.find(t => t.name?.toLowerCase().includes('initiative'));

    if (!target) {
      console.error('\nCould not auto-detect the Initiative tenant.');
      console.error('Please update this script with the correct tenant _id or slug.');
      process.exit(1);
    }

    console.log(`\nTargeting tenant: "${target.name}" (id: ${target._id})`);

    const result = await tenants.updateOne(
      { _id: target._id },
      {
        $set: {
          'config.features.requireBothEmailAndPhone': true,
          'config.features.initiativeForms': true,
        }
      }
    );

    if (result.modifiedCount === 1) {
      console.log('Feature flags set successfully:');
      console.log('  requireBothEmailAndPhone = true');
      console.log('  initiativeForms          = true');
    } else {
      console.log('No changes made (flags may already be set, or tenant not found).');
    }
  } finally {
    await client.close();
  }
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
