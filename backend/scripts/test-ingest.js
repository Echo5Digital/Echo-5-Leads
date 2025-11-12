// Optional local test script: requires TEST_API_BASE and TEST_TENANT_KEY
import dotenv from 'dotenv';
dotenv.config();

const apiBase = process.env.TEST_API_BASE || 'http://localhost:3001';
const apiKey = process.env.TEST_TENANT_KEY;

if (!apiKey) {
  console.error('Set TEST_TENANT_KEY to run this test');
  process.exit(1);
}

async function main() {
  const payload = {
    first_name: 'Test',
    last_name: 'User',
    email: `test_${Date.now()}@echo5digital.com`,
    phone: '+13105550123',
    city: 'Los Angeles',
    utm_source: 'website',
    utm_campaign: 'test-campaign',
    form_id: 'demo-form',
    original_payload: { hello: 'world' }
  };

  const r = await fetch(`${apiBase.replace(/\/$/, '')}/api/ingest/lead`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Key': apiKey
    },
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  console.log('Ingest response:', r.status, data);

  const r2 = await fetch(`${apiBase.replace(/\/$/, '')}/api/leads?page=1&limit=1`, {
    headers: { 'X-Tenant-Key': apiKey }
  });
  const list = await r2.json();
  console.log('Leads list sample:', list.items?.[0]?._id || list);
}

main().catch(err => { console.error(err); process.exit(1); });
