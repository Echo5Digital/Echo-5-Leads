// Quick test: Send a test lead to Vercel backend
const testLead = {
  first_name: "Test",
  last_name: "User",
  email: "test@example.com",
  phone: "1234567890",
  source: "test_script",
  form_id: "test_form"
};

fetch('https://echo5-digital-leads.vercel.app/api/ingest/lead', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Key': 'open_523e0520a0fd927169f2fb0a14099fb2'
  },
  body: JSON.stringify(testLead)
})
.then(res => res.json())
.then(data => {
  console.log('✅ SUCCESS:', data);
  console.log('\nIf you see this, your Vercel backend is working!');
  console.log('Check https://echo5-leads-fe.vercel.app/leads for the test lead.');
})
.catch(err => {
  console.error('❌ ERROR:', err.message);
  console.log('\nThis means either:');
  console.log('1. Backend API is down');
  console.log('2. API key is wrong');
  console.log('3. Network/firewall issue');
});
