/**
 * test-meta.js
 * 
 * Simulates a webhook call from Facebook to the /api/ingest/meta-lead endpoint.
 * 
 * This script requires a REAL leadgen_id from a test lead you create in your
 * Facebook page's testing tool.
 * 
 * How to get a test lead:
 * 1. Go to: https://developers.facebook.com/tools/lead-ads-testing/
 * 2. Select your Page and Form.
 * 3. Create a new lead. This will give you a leadgen_id.
 * 4. Use that leadgen_id with this script.
 * 
 * You also need to:
 * 1. Have a tenant created with a valid API key.
 * 2. Have configured the `metaAccessToken` for that tenant via the API. 
 * 
 * Usage:
 * node scripts/test-meta.js <leadgen_id> <tenant_api_key>
 */

const http = require('http');

async function testMetaWebhook() {
  const [,, leadgenId, apiKey] = process.argv;

  if (!leadgenId || !apiKey) {
    console.error('Usage: node scripts/test-meta.js <leadgen_id> <tenant_api_key>');
    process.exit(1);
  }

  // Simulate the payload Facebook sends
  const payload = {
    object: 'page',
    entry: [
      {
        id: '123456789012345', // Your page ID
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: 'leadgen',
            value: {
              ad_id: '987654321',
              form_id: '543219876',
              leadgen_id: leadgenId,
              created_time: Math.floor(Date.now() / 1000),
              page_id: '123456789012345',
              adgroup_id: '1122334455',
            },
          },
        ],
      },
    ],
  };

  const postData = JSON.stringify(payload);

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/ingest/meta-lead',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Key': apiKey,
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  console.log('Sending simulated Meta webhook:');
  console.log('  - Endpoint: http://localhost:3001/api/ingest/meta-lead');
  console.log('  - Leadgen ID:', leadgenId);
  console.log('  - Tenant Key:', apiKey);
  console.log('  - Payload:', postData);

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('\nResponse from server:');
      console.log('  - Status:', res.statusCode);
      try {
        console.log('  - Body:', JSON.parse(data));
      } catch (e) {
        console.log('  - Body (raw):', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('\nError sending request:', e.message);
  });

  req.write(postData);
  req.end();
}

testMetaWebhook();