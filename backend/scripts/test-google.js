#!/usr/bin/env node
/**
 * Test script for Google Ads Lead Form webhook
 * 
 * Usage:
 *   export TEST_TENANT_KEY=your_api_key
 *   npm run test:google
 */

const TEST_API_KEY = process.env.TEST_TENANT_KEY;
const API_URL = process.env.API_URL || 'http://localhost:3001';

if (!TEST_API_KEY) {
  console.error('❌ Error: TEST_TENANT_KEY environment variable not set');
  console.log('Usage: export TEST_TENANT_KEY=oa_e7f1365581ec1a236049347aeccd5d39');
  process.exit(1);
}

// Test 1: Create New Lead
async function testCreateLead() {
  console.log('\n🔴 Test 1: Create New Google Ads Lead\n');
  
  const leadPayload = {
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith.google@example.com',
    phone: '555-123-4567',
    city: 'San Francisco',
    gclid: 'test_gclid_' + Date.now(),
    campaign_id: '987654321',
    campaign_name: 'Foster Care Q4 Campaign',
    ad_group_id: '123456789',
    form_id: 'google_form_test',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'foster_care_q4'
  };
  
  try {
    const response = await fetch(`${API_URL}/api/ingest/google-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Key': TEST_API_KEY
      },
      body: JSON.stringify(leadPayload)
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if ((response.status === 200 || response.status === 201) && data.success) {
      console.log('\n✅ Lead created successfully');
      console.log('   Lead ID:', data.leadId);
      console.log('   Action:', data.action);
    } else {
      console.log('\n❌ Lead creation failed');
    }
    
    return data.leadId;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

// Test 2: Update Existing Lead (deduplication)
async function testUpdateLead() {
  console.log('\n🔴 Test 2: Update Existing Lead (Deduplication)\n');
  
  const leadPayload = {
    first_name: 'John',
    last_name: 'Smith Updated',
    email: 'john.smith.google@example.com', // Same email as Test 1
    phone: '555-123-4567',
    city: 'Oakland', // Different city
    gclid: 'test_gclid_update_' + Date.now(),
    campaign_name: 'Foster Care Retargeting'
  };
  
  try {
    const response = await fetch(`${API_URL}/api/ingest/google-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Key': TEST_API_KEY
      },
      body: JSON.stringify(leadPayload)
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200 && data.action === 'updated') {
      console.log('\n✅ Deduplication working - lead updated');
      console.log('   Lead ID:', data.leadId);
    } else {
      console.log('\n❌ Expected deduplication (action: "updated")');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Test 3: Lead with Phone Only (No Email)
async function testPhoneOnly() {
  console.log('\n🔴 Test 3: Lead with Phone Only\n');
  
  const leadPayload = {
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '555-999-8888',
    city: 'Los Angeles',
    gclid: 'test_gclid_phone_' + Date.now(),
    campaign_name: 'Foster Care Phone Campaign'
  };
  
  try {
    const response = await fetch(`${API_URL}/api/ingest/google-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Key': TEST_API_KEY
      },
      body: JSON.stringify(leadPayload)
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if ((response.status === 200 || response.status === 201) && data.success) {
      console.log('\n✅ Phone-only lead created');
    } else {
      console.log('\n❌ Phone-only lead failed');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Test 4: Invalid Payload (Missing Email and Phone)
async function testInvalidPayload() {
  console.log('\n🔴 Test 4: Invalid Payload (should fail)\n');
  
  const leadPayload = {
    first_name: 'Invalid',
    last_name: 'Lead',
    city: 'Nowhere'
    // Missing email AND phone
  };
  
  try {
    const response = await fetch(`${API_URL}/api/ingest/google-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Key': TEST_API_KEY
      },
      body: JSON.stringify(leadPayload)
    });
    
    const data = await response.json();
    
    if (response.status === 400) {
      console.log('✅ Invalid payload correctly rejected');
      console.log('   Error:', data.error);
    } else {
      console.log('❌ Invalid payload should return 400');
      console.log('   Status:', response.status);
      console.log('   Response:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Test 5: Zapier-style Payload
async function testZapierPayload() {
  console.log('\n🔴 Test 5: Zapier-style Payload\n');
  
  const leadPayload = {
    firstName: 'Sarah',  // camelCase from Zapier
    lastName: 'Johnson',
    email: 'sarah.johnson@example.com',
    phone_number: '(555) 777-6666', // With formatting
    gclid: 'zapier_gclid_' + Date.now(),
    campaign_id: '111222333',
    campaignName: 'Zapier Test Campaign' // camelCase
  };
  
  try {
    const response = await fetch(`${API_URL}/api/ingest/google-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Key': TEST_API_KEY
      },
      body: JSON.stringify(leadPayload)
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if ((response.status === 200 || response.status === 201) && data.success) {
      console.log('\n✅ Zapier payload handled correctly');
    } else {
      console.log('\n❌ Zapier payload failed');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('='.repeat(60));
  console.log('Google Ads Lead Form Integration Tests');
  console.log('='.repeat(60));
  console.log('API URL:', API_URL);
  console.log('Tenant Key:', TEST_API_KEY.substring(0, 10) + '...');
  
  await testCreateLead();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  await testUpdateLead();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testPhoneOnly();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testInvalidPayload();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testZapierPayload();
  
  console.log('\n' + '='.repeat(60));
  console.log('Tests complete!');
  console.log('='.repeat(60) + '\n');
}

runTests().catch(console.error);
