import { MongoClient } from 'mongodb';
import crypto from 'crypto';

let cachedClient = null;
let cachedDb = null;

export async function getDb() {
  if (cachedDb && cachedClient) return cachedDb;
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  if (!uri || !dbName) throw new Error('Missing MONGODB_URI or MONGODB_DB');
  const client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(dbName);
  await ensureIndexes(cachedDb);
  return cachedDb;
}

async function ensureIndexes(db) {
  await db.collection('leads').createIndexes([
    { key: { tenantId: 1, email: 1 }, name: 'u_tenant_email', unique: true, partialFilterExpression: { email: { $type: 'string' } } },
    { key: { tenantId: 1, phoneE164: 1 }, name: 'u_tenant_phone', unique: true, partialFilterExpression: { phoneE164: { $type: 'string' } } },
    { key: { tenantId: 1, createdAt: -1 }, name: 'idx_tenant_createdAt' },
    { key: { tenantId: 1, stage: 1, latestActivityAt: -1 }, name: 'idx_tenant_stage_latest' }
  ]);
  await db.collection('activities').createIndexes([
    { key: { tenantId: 1, leadId: 1, createdAt: -1 }, name: 'idx_tenant_lead_createdAt' }
  ]);
  await db.collection('api_keys').createIndexes([
    { key: { keyHash: 1 }, name: 'idx_keyHash' },
    { key: { tenantId: 1, active: 1 }, name: 'idx_tenant_active' }
  ]);
}

export function sha256WithPepper(value) {
  const pepper = process.env.E5D_API_KEY_PEPPER || '';
  return crypto.createHash('sha256').update(value + pepper).digest('hex');
}

export async function resolveTenantId(db, apiKey) {
  if (!apiKey) return undefined;
  const keyHash = sha256WithPepper(apiKey);
  const doc = await db.collection('api_keys').findOne({ keyHash, active: true });
  return doc ? doc.tenantId : undefined;
}

export function normPhone(raw) {
  if (!raw) return undefined;
  // Very light normalization; deeper lib can be added if needed.
  const digits = String(raw).replace(/\D+/g, '');
  if (digits.length < 7) return undefined;
  // Assume country code if starts with 1 and length 11 (US). Otherwise just store digits.
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + digits; // fallback
}

export const STAGES = ['new','contacted','qualified','orientation','application','home_study','licensed','placement','not_fit'];
