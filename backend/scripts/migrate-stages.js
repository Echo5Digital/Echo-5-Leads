import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const NEW_STAGES = [
  'new',
  'pending_contact',
  'contacted',
  'application',
  'orientation',
  'home_study',
  'licensed',
  'placement',
  'not_fit'
];

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

  // Update all tenants to the new stage order
  const result = await db.collection('tenants').updateMany(
    {},
    { $set: { 'config.stages': NEW_STAGES } }
  );

  console.log(`✅ Updated ${result.modifiedCount} tenant(s) to new stage order.`);
  console.log('\nNew stages:', NEW_STAGES.join(' → '));
  console.log('\nNote: Existing leads keep their current stage value. Any leads');
  console.log('that had "qualified" stage will still show it until manually changed.');

  await client.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
