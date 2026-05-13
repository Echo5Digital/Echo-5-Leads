/**
 * POST /api/leads/:id/send-form
 *
 * Sends a blank Open Arms Initiative form (Demographics or Sliding Fee) as a
 * PDF email attachment to the lead's email address.
 *
 * Body: { formType: 'demographics' | 'sliding-fee' }
 *
 * Only available for tenants with config.features.initiativeForms = true
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongo.js';
import { authenticateToken } from '../lib/auth.js';
import { sendEmail } from '../lib/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, '../../templates');

const FORM_CONFIG = {
  'demographics': {
    filename: 'demographics-form.pdf',
    label: 'Demographics Form',
    subject: 'Open Arms Initiative — Your Demographics Form',
  },
  'sliding-fee': {
    filename: 'sliding-fee-form.pdf',
    label: 'Sliding Fee Application',
    subject: 'Open Arms Initiative — Your Sliding Fee Application',
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.params;
  const { formType } = req.body || {};

  if (!formType || !FORM_CONFIG[formType]) {
    return res.status(400).json({ error: 'formType must be "demographics" or "sliding-fee"' });
  }

  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;

    // Resolve tenantId for SuperAdmin (they don't have tenantId on their token)
    let resolvedTenantId = tenantId;
    if (req.user.role === 'super_admin') {
      let oid;
      try { oid = new ObjectId(id); } catch { return res.status(400).json({ error: 'Invalid lead id' }); }
      const lead = await db.collection('leads').findOne({ _id: oid });
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      resolvedTenantId = lead.tenantId;
    }

    // Check tenant has Initiative forms enabled
    const tenant = await db.collection('tenants').findOne({ _id: resolvedTenantId });
    if (!tenant?.config?.features?.initiativeForms) {
      return res.status(403).json({ error: 'This feature is not enabled for your account.' });
    }

    // Load the lead
    let oid;
    try { oid = new ObjectId(id); } catch { return res.status(400).json({ error: 'Invalid lead id' }); }

    const lead = await db.collection('leads').findOne({ _id: oid, tenantId: resolvedTenantId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!lead.email) return res.status(400).json({ error: 'This lead has no email address on file.' });

    // Read PDF from disk
    const form = FORM_CONFIG[formType];
    const pdfPath = path.join(TEMPLATES_DIR, form.filename);
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF template not found:', pdfPath);
      return res.status(500).json({ error: 'Form template not found on server.' });
    }
    const pdfBuffer = fs.readFileSync(pdfPath);

    const recipientName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'there';
    const senderEmail = req.user.email;

    const text = `Hi ${recipientName},\n\nPlease find your ${form.label} attached to this email.\n\nOnce completed, please reply to this email with the form attached, or send it directly to: ${senderEmail}\n\nIf you have any questions, feel free to contact us at info@openarmsinitiative.com or visit us at https://www.openarmsinitiative.com/contact-us/\n\nThank you,\nOpen Arms Initiative`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#1a56db;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Open Arms Initiative</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:16px;">Hi ${recipientName},</p>
          <p>Please find your <strong>${form.label}</strong> attached to this email.</p>
          <p>Once completed, please <strong>reply to this email</strong> with the form attached, or send it directly to:<br/>
            <a href="mailto:${senderEmail}" style="color:#1a56db;font-weight:bold;">${senderEmail}</a>
          </p>
          <p>If you have any questions, feel free to reach out at <a href="mailto:info@openarmsinitiative.com" style="color:#1a56db;">info@openarmsinitiative.com</a> or visit our <a href="https://www.openarmsinitiative.com/contact-us/" style="color:#1a56db;">contact page</a>.</p>
          <br/>
          <p style="color:#555;">Thank you,<br/><strong>Open Arms Initiative</strong></p>
        </div>
        <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px;">
          &copy; ${new Date().getFullYear()} Open Arms Initiative. All rights reserved.
        </p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: lead.email,
      replyTo: senderEmail,
      subject: form.subject,
      text,
      html,
      attachments: [
        {
          filename: form.filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send email.', details: emailResult.error });
    }

    // Log activity on the lead
    await db.collection('activities').insertOne({
      tenantId: resolvedTenantId,
      leadId: id,
      type: 'email',
      content: {
        title: `${form.label} sent`,
        note: `Blank ${form.label} PDF emailed to ${lead.email}`,
      },
      createdAt: new Date(),
    });

    return res.status(200).json({ success: true, message: `${form.label} sent to ${lead.email}` });
  } catch (err) {
    console.error('send-initiative-form error:', err);
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}

export default [authenticateToken, handler];
