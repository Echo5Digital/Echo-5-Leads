// Test script to verify delete functionality with JWT authentication
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';

// Test credentials
const testCredentials = {
  email: 'admin@echo5leads.com',
  password: 'admin123'
};

async function testDeleteAuthentication() {
  try {
    console.log('🔐 Testing delete functionality with JWT authentication...\n');

    // Step 1: Login to get JWT token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCredentials)
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Step 2: Get list of leads to find one to delete
    console.log('\n2. Fetching leads...');
    const leadsResponse = await fetch(`${BASE_URL}/leads`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!leadsResponse.ok) {
      throw new Error(`Failed to fetch leads: ${leadsResponse.status}`);
    }

    const leadsData = await leadsResponse.json();
    console.log(`✅ Found ${leadsData.leads?.length || 0} leads`);

    if (!leadsData.leads || leadsData.leads.length === 0) {
      console.log('❌ No leads found to delete');
      return;
    }

    // Step 3: Try to delete the first lead
    const leadToDelete = leadsData.leads[0];
    console.log(`\n3. Attempting to delete lead: ${leadToDelete._id} (${leadToDelete.name})`);

    const deleteResponse = await fetch(`${BASE_URL}/leads/${leadToDelete._id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      console.log('❌ Delete failed:', deleteResponse.status, errorData);
      return;
    }

    const deleteData = await deleteResponse.json();
    console.log('✅ Delete successful:', deleteData.message);

    // Step 4: Verify the lead was deleted
    console.log('\n4. Verifying deletion...');
    const verifyResponse = await fetch(`${BASE_URL}/leads`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      const remainingLeads = verifyData.leads?.length || 0;
      console.log(`✅ Verification complete. Remaining leads: ${remainingLeads}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDeleteAuthentication();