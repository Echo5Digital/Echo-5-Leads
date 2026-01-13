import nodemailer from 'nodemailer';

// Create reusable transporter
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!user || !pass) {
    console.warn('[Email] MAIL_USER or MAIL_PASS not configured - emails will not be sent');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}

/**
 * Send email notification
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 */
export async function sendEmail({ to, subject, text, html }) {
  const transport = getTransporter();
  
  if (!transport) {
    console.log('[Email] Skipping email - transporter not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const info = await transport.sendMail({
      from: `"Echo5 Leads" <${process.env.MAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text,
      html: html || text
    });

    console.log('[Email] Sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification when a note is added to a lead
 * @param {Object} lead - The lead object
 * @param {Object} activity - The activity that was added
 * @param {string} addedBy - Name of user who added the note
 * @param {Object} tenant - The tenant object with config
 */
export async function sendNoteNotification(lead, activity, addedBy, tenant) {
  // Get notification recipients from tenant config
  const notificationEmails = tenant?.config?.notificationEmails || [];
  
  if (!notificationEmails || notificationEmails.length === 0) {
    console.log('[Email] No notification emails configured for tenant:', tenant?.name);
    return { success: false, error: 'No notification emails configured' };
  }
  
  const recipients = notificationEmails.join(',');
  
  const leadName = lead.fullName 
    || (lead.firstName ? `${lead.firstName} ${lead.lastName || ''}`.trim() : null)
    || lead.email 
    || 'Unknown Lead';

  const noteContent = activity.content?.note || activity.content || 'No content';
  const noteTitle = activity.content?.title || activity.type || 'Note';

  const subject = `📝 New Note Added - ${leadName}`;
  
  const text = `
A new note has been added to a lead.

Lead: ${leadName}
Email: ${lead.email || 'N/A'}
Phone: ${lead.phoneE164 || 'N/A'}
Stage: ${lead.stage || 'N/A'}

Note Title: ${noteTitle}
Note Content: ${noteContent}

Added By: ${addedBy || 'Unknown'}
Date: ${new Date().toLocaleString()}

---
View lead in dashboard: ${process.env.FRONTEND_URL || 'https://your-frontend.vercel.app'}/leads/${lead._id}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .note-box { background: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
    .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .value { margin-bottom: 10px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
    .footer { text-align: center; padding: 15px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">📝 New Note Added</h2>
    </div>
    <div class="content">
      <p>A new note has been added to a lead.</p>
      
      <div class="value"><span class="label">Lead:</span> <strong>${leadName}</strong></div>
      <div class="value"><span class="label">Email:</span> ${lead.email || 'N/A'}</div>
      <div class="value"><span class="label">Phone:</span> ${lead.phoneE164 || 'N/A'}</div>
      <div class="value"><span class="label">Stage:</span> ${lead.stage || 'N/A'}</div>
      
      <div class="note-box">
        <div class="label">Note: ${noteTitle}</div>
        <p style="margin: 10px 0 0 0;">${noteContent}</p>
      </div>
      
      <div class="value"><span class="label">Added By:</span> ${addedBy || 'Unknown'}</div>
      <div class="value"><span class="label">Date:</span> ${new Date().toLocaleString()}</div>
      
      <a href="${process.env.FRONTEND_URL || 'https://your-frontend.vercel.app'}/leads/${lead._id}" class="button">View Lead</a>
    </div>
    <div class="footer">
      Echo5 Leads Management System
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: notificationEmails,
    subject,
    text,
    html
  });
}
