/**
 * Lead Document Routes — Open Arms Initiative
 *
 * POST   /api/leads/:id/documents           — Upload a completed form PDF/image
 * GET    /api/leads/:id/documents           — List all documents for a lead
 * GET    /api/leads/:id/documents/:docId/download — Download a single document
 *
 * Only available for tenants with config.features.initiativeForms = true
 */

import multer from 'multer';
import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongo.js';
import { authenticateToken } from '../lib/auth.js';

// Store files in memory so they work on Vercel (no persistent disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are accepted.'));
    }
  },
});

// ─── Shared helper ──────────────────────────────────────────────────────────

async function resolveTenantAndLead(db, leadId, user) {
  let oid;
  try { oid = new ObjectId(leadId); } catch { return { error: 'Invalid lead id', status: 400 }; }

  let tenantId = user.tenantId;

  // SuperAdmin: look up tenantId from lead itself
  if (user.role === 'super_admin') {
    const lead = await db.collection('leads').findOne({ _id: oid });
    if (!lead) return { error: 'Lead not found', status: 404 };
    tenantId = lead.tenantId;
  }

  const tenant = await db.collection('tenants').findOne({ _id: tenantId });
  if (!tenant?.config?.features?.initiativeForms) {
    return { error: 'This feature is not enabled for your account.', status: 403 };
  }

  const lead = await db.collection('leads').findOne({ _id: oid, tenantId });
  if (!lead) return { error: 'Lead not found', status: 404 };

  return { lead, tenantId, oid };
}

// ─── POST /api/leads/:id/documents ──────────────────────────────────────────

async function uploadDocument(req, res) {
  const { id } = req.params;
  const { type } = req.body || {};

  const VALID_TYPES = ['demographics', 'sliding_fee', 'other'];
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'type must be one of: demographics, sliding_fee, other' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const db = await getDb();
    const result = await resolveTenantAndLead(db, id, req.user);
    if (result.error) return res.status(result.status).json({ error: result.error });
    const { tenantId } = result;

    const doc = {
      tenantId,
      leadId: id,
      type,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileBase64: req.file.buffer.toString('base64'),
      uploadedBy: req.user.email || req.user.id || 'unknown',
      uploadedAt: new Date(),
    };

    const ins = await db.collection('lead_documents').insertOne(doc);

    // Log activity
    const typeLabels = { demographics: 'Demographics Form', sliding_fee: 'Sliding Fee Application', other: 'Document' };
    await db.collection('activities').insertOne({
      tenantId,
      leadId: id,
      type: 'note',
      content: {
        title: `${typeLabels[type]} uploaded`,
        note: `File "${req.file.originalname}" was uploaded (${(req.file.size / 1024).toFixed(1)} KB)`,
      },
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      documentId: ins.insertedId.toString(),
      fileName: req.file.originalname,
    });
  } catch (err) {
    console.error('uploadDocument error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

// ─── GET /api/leads/:id/documents ───────────────────────────────────────────

async function listDocuments(req, res) {
  const { id } = req.params;

  try {
    const db = await getDb();
    const result = await resolveTenantAndLead(db, id, req.user);
    if (result.error) return res.status(result.status).json({ error: result.error });
    const { tenantId } = result;

    const docs = await db.collection('lead_documents')
      .find({ leadId: id, tenantId })
      .project({ fileBase64: 0 }) // exclude the binary blob from the list response
      .sort({ uploadedAt: -1 })
      .toArray();

    return res.status(200).json({ documents: docs });
  } catch (err) {
    console.error('listDocuments error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

// ─── GET /api/leads/:id/documents/:docId/download ───────────────────────────

async function downloadDocument(req, res) {
  const { id, docId } = req.params;

  try {
    const db = await getDb();
    const result = await resolveTenantAndLead(db, id, req.user);
    if (result.error) return res.status(result.status).json({ error: result.error });
    const { tenantId } = result;

    let docOid;
    try { docOid = new ObjectId(docId); } catch { return res.status(400).json({ error: 'Invalid document id' }); }

    const doc = await db.collection('lead_documents').findOne({ _id: docOid, leadId: id, tenantId });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const buffer = Buffer.from(doc.fileBase64, 'base64');

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error('downloadDocument error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const protectedUploadDocument = [
  authenticateToken,
  upload.single('file'),
  uploadDocument,
];

export const protectedListDocuments = [
  authenticateToken,
  listDocuments,
];

export const protectedDownloadDocument = [
  authenticateToken,
  downloadDocument,
];
