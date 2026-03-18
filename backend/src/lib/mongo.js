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
    { key: { tenantId: 1, stage: 1, latestActivityAt: -1 }, name: 'idx_tenant_stage_latest' },
    { key: { assignedTo: 1 }, name: 'idx_assignedTo' }
  ]);
  await db.collection('activities').createIndexes([
    { key: { tenantId: 1, leadId: 1, createdAt: -1 }, name: 'idx_tenant_lead_createdAt' }
  ]);
  await db.collection('api_keys').createIndexes([
    { key: { keyHash: 1 }, name: 'idx_keyHash' },
    { key: { tenantId: 1, active: 1 }, name: 'idx_tenant_active' }
  ]);
  // Create users indexes (handle existing index conflict)
  try {
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true, name: 'idx_users_email_unique' },
      { key: { tenantId: 1, role: 1 }, name: 'idx_users_tenant_role' },
      { key: { active: 1 }, name: 'idx_users_active' }
    ]);
  } catch (error) {
    if (error.code === 85) { // IndexOptionsConflict
      console.log('Note: User indexes already exist with different names, skipping...');
    } else {
      throw error;
    }
  }
}

export function sha256WithPepper(value) {
  const pepper = process.env.E5D_API_KEY_PEPPER || '';
  return crypto.createHash('sha256').update(value + pepper).digest('hex');
}

// Encrypt API key for secure storage (can be decrypted later)
export function encryptApiKey(rawKey) {
  const secret = process.env.E5D_API_KEY_PEPPER || '';
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(rawKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt API key for viewing
export function decryptApiKey(encryptedKey) {
  if (!encryptedKey) return null;
  try {
    const secret = process.env.E5D_API_KEY_PEPPER || '';
    const key = crypto.createHash('sha256').update(secret).digest();
    const [ivHex, encrypted] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Error decrypting API key:', err);
    return null;
  }
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
