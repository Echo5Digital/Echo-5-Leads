import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  
  if (!uri || !dbName) {
    console.error('Missing env: MONGODB_URI, MONGODB_DB');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // Open Arms Foster Care specific configuration
  const openArmsConfig = {
    stages: [
      'new',
      'contacted',
      'application_sent',
      'application_completed',
      'intp_approved',
      'intp_denied',
      'training_orientation',
      'home_study',
      'approved',
      'denied'
    ],
    users: [
      { name: 'Baylee', email: '', active: true },
      { name: 'Destinee', email: '', active: true },
      { name: 'Stephanie C.', email: '', active: true },
      { name: 'Haddie J.', email: '', active: true }
    ],
    spamKeywords: ['viagra', 'loan', 'casino', 'crypto', 'investment'],
    slaHours: 24
  };

  // Update the tenant with slug 'open-arms'
  const result = await db.collection('tenants').updateOne(
    { slug: 'open-arms' },
    { 
      $set: { 
        'config.stages': openArmsConfig.stages,
        'config.users': openArmsConfig.users,
        'config.spamKeywords': openArmsConfig.spamKeywords,
        'config.slaHours': openArmsConfig.slaHours
      } 
    }
  );

  if (result.matchedCount === 0) {
    console.error('Tenant with slug "open-arms" not found. Run seed-tenant.js first.');
    process.exit(1);
  }

  console.log('✅ Open Arms Foster Care configuration updated successfully!');
  console.log('\nStages:', openArmsConfig.stages);
  console.log('\nUsers:', openArmsConfig.users.map(u => u.name).join(', '));
  console.log('\nNote: All historical leads are preserved. The new stages will be available immediately.');

  await client.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
