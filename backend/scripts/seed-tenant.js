import crypto from 'crypto';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  const pepper = process.env.E5D_API_KEY_PEPPER || '';
  if (!uri || !dbName) {
    console.error('Missing env: MONGODB_URI, MONGODB_DB');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const tenant = {
    _id: crypto.randomUUID(),
    name: 'Open Arms Foster Care',
    slug: 'open-arms',
    config: { spamKeywords: ['viagra','loan','casino'], slaHours: 24, allowedOrigins: [] },
    createdAt: new Date()
  };
  await db.collection('tenants').insertOne(tenant);

  const rawKey = 'oa_' + crypto.randomBytes(16).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey + pepper).digest('hex');
  await db.collection('api_keys').insertOne({
    tenantId: tenant._id,
    keyHash,
    name: 'Default key',
    active: true,
    createdAt: new Date(),
    lastUsedAt: null
  });

  console.log('Tenant ID:', tenant._id);
  console.log('API Key (save now):', rawKey);
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
