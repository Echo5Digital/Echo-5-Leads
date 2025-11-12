#!/usr/bin/env node
/**
 * Test script for Meta (Facebook) Lead Ads webhook
 * 
 * Usage:
 *   export TEST_TENANT_KEY=your_api_key
 *   npm run test:meta
 */

const TEST_API_KEY = process.env.TEST_TENANT_KEY;
const API_URL = process.env.API_URL || 'http://localhost:3001';

if (!TEST_API_KEY) {
  console.error('❌ Error: TEST_TENANT_KEY environment variable not set');
  console.log('Usage: export TEST_TENANT_KEY=oa_e7f1365581ec1a236049347aeccd5d39');
  process.exit(1);
}

// Test 1: Webhook Verification
async function testWebhookVerification() {
  console.log('\n🔵 Test 1: Meta Webhook Verification\n');
  
  const verifyUrl = `${API_URL}/api/ingest/meta-lead?hub.mode=subscribe&hub.challenge=test_challenge_123&hub.verify_token=echo5_meta_webhook_verify`;
  
  try {
    const response = await fetch(verifyUrl);
    const text = await response.text();
    
    if (response.status === 200 && text === 'test_challenge_123') {
      console.log('✅ Webhook verification successful');
      console.log('   Response:', text);
    } else {
      console.log('❌ Webhook verification failed');
      console.log('   Status:', response.status);
      console.log('   Response:', text);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Test 2: Lead Webhook (Simulated Facebook payload)
async function testLeadWebhook() {
  console.log('\n🔵 Test 2: Meta Lead Webhook\n');
  
  const webhookPayload = {
    object: 'page',
    entry: [{
      id: '123456789',
      time: Math.floor(Date.now() / 1000),
      changes: [{
        field: 'leadgen',
        value: {
          leadgen_id: 'test_leadgen_' + Date.now(),
          form_id: 'test_form_123',
          ad_id: 'test_ad_456',
          adgroup_id: 'test_adgroup_789',
          page_id: '123456789',
          created_time: Math.floor(Date.now() / 1000)
        }
      }]
    }]
  };
  
  try {
    const response = await fetch(`${API_URL}/api/ingest/meta-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Key': TEST_API_KEY
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200 && data.success) {
      console.log('\n✅ Lead webhook successful');
      console.log('   Processed:', data.processed, 'lead(s)');
      if (data.results && data.results.length > 0) {
        console.log('   Lead ID:', data.results[0].lead_id);
        console.log('   Status:', data.results[0].status);
      }
    } else {
      console.log('\n❌ Lead webhook failed');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Test 3: Invalid API Key
async function testInvalidApiKey() {
  console.log('\n🔵 Test 3: Invalid API Key (should fail)\n');
  
  const webhookPayload = {
    object: 'page',
    entry: [{
      changes: [{
        field: 'leadgen',
        value: { leadgen_id: 'test_123' }
      }]
    }]
  };
  
  try {
    const response = await fetch(`${API_URL}/api/ingest/meta-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Key': 'invalid_key_12345'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      console.log('✅ Invalid API key correctly rejected');
    } else {
      console.log('❌ Invalid API key should return 401');
      console.log('   Status:', response.status);
      console.log('   Response:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('='.repeat(60));
  console.log('Meta (Facebook) Lead Ads Integration Tests');
  console.log('='.repeat(60));
  console.log('API URL:', API_URL);
  console.log('Tenant Key:', TEST_API_KEY.substring(0, 10) + '...');
  
  await testWebhookVerification();
  await testLeadWebhook();
  await testInvalidApiKey();
  
  console.log('\n' + '='.repeat(60));
  console.log('Tests complete!');
  console.log('='.repeat(60) + '\n');
}

runTests().catch(console.error);
