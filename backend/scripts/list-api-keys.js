#!/usr/bin/env node

/**
 * List API Keys Script
 * Shows all tenants and their API keys (hashed, for security review)
 */

import 'dotenv/config';
import { getDb } from '../src/lib/mongo.js';

async function listApiKeys() {
  const db = await getDb();
  
  console.log('\n📋 API Keys Review\n');
  console.log('='.repeat(80));

  // Get all tenants
  const tenants = await db.collection('tenants').find().toArray();

  if (tenants.length === 0) {
    console.log('No tenants found.');
    process.exit(0);
  }

  for (const tenant of tenants) {
    console.log(`\n🏢 Tenant: ${tenant.name}`);
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Slug: ${tenant.slug}`);
    console.log(`   Created: ${tenant.createdAt?.toISOString() || 'N/A'}`);
    console.log(`   SLA Hours: ${tenant.config?.slaHours || 'N/A'}`);
    console.log(`   Manager Email: ${tenant.config?.managerEmail || 'None'}`);

    // Get API keys for this tenant
    const keys = await db.collection('api_keys')
      .find({ tenantId: tenant._id })
      .sort({ createdAt: -1 })
      .toArray();

    if (keys.length === 0) {
      console.log('   🔑 No API keys found');
    } else {
      console.log(`   🔑 API Keys (${keys.length}):`);
      keys.forEach((key, index) => {
        const status = key.active ? '✅ Active' : '❌ Revoked';
        const lastUsed = key.lastUsedAt 
          ? new Date(key.lastUsedAt).toISOString() 
          : 'Never used';
        const revoked = key.revokedAt 
          ? ` (Revoked: ${new Date(key.revokedAt).toISOString()})` 
          : '';
        
        console.log(`      ${index + 1}. ${key.name}`);
        console.log(`         Status: ${status}${revoked}`);
        console.log(`         Created: ${new Date(key.createdAt).toISOString()}`);
        console.log(`         Last Used: ${lastUsed}`);
        console.log(`         Key Hash: ${key.keyHash.substring(0, 16)}...`);
      });
    }

    // Get lead count
    const leadCount = await db.collection('leads').countDocuments({ tenantId: tenant._id });
    console.log(`   📊 Total Leads: ${leadCount}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✨ Review complete\n');
  
  process.exit(0);
}

listApiKeys().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
