// GET /api/notifications/followups
// Sends follow-up reminder emails for stale leads
// Called daily by Vercel Cron Job at 9am UTC
// Also callable manually with CRON_SECRET for testing

import { getDb } from '../lib/mongo.js';
import { sendEmail } from '../lib/email.js';

// Stages considered closed — no follow-up needed
const CLOSED_STAGES = [
  'approved', 'denied', 'intp_denied', 'not_fit',
  'licensed', 'placement', 'archived'
];

const SEVEN_DAYS_MS  = 7  * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function formatStage(stage) {
  if (!stage) return 'Unknown';
  return stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function leadName(lead) {
  if (lead.firstName || lead.lastName) {
    return `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
  }
  return lead.email || 'Unknown';
}

async function sendReminderEmail({ tenantName, leads, days, notificationEmails, frontendUrl }) {
  const base = frontendUrl || 'https://echo5-digital-leads.vercel.app';
  const emoji = days === 7 ? '⏰' : '🚨';
  const urgency = days === 7 ? 'follow-up needed' : 'URGENT — no contact in 30 days';

  const leadRows = leads.map(lead => {
    const days_stale = daysSince(lead.latestActivityAt);
    const name = leadName(lead);
    const stage = formatStage(lead.stage);
    const url = `${base}/leads/${lead._id}`;
    return `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
          <a href="${url}" style="color:#3b82f6;font-weight:bold;text-decoration:none;">${name}</a>
        </td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${stage}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#ef4444;font-weight:bold;">${days_stale} days</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
          <a href="${url}" style="background:#3b82f6;color:white;padding:5px 12px;border-radius:4px;text-decoration:none;font-size:13px;">View</a>
        </td>
      </tr>`;
  }).join('');

  const textList = leads.map(lead => {
    const name = leadName(lead);
    const stage = formatStage(lead.stage);
    const days_stale = daysSince(lead.latestActivityAt);
    return `• ${name} | Stage: ${stage} | ${days_stale} days with no activity\n  ${base}/leads/${lead._id}`;
  }).join('\n');

  const subject = `${emoji} ${tenantName} — ${leads.length} lead${leads.length > 1 ? 's' : ''} need${leads.length === 1 ? 's' : ''} follow-up (${days}-day reminder)`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 650px; margin: 0 auto; }
    .header { background: ${days === 7 ? '#3b82f6' : '#ef4444'}; color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .header h2 { margin: 0 0 4px 0; font-size: 20px; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .body { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
    .summary { background: white; border-radius: 6px; padding: 16px; margin-bottom: 20px; border-left: 4px solid ${days === 7 ? '#3b82f6' : '#ef4444'}; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; }
    th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    .footer { text-align: center; padding: 16px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${emoji} Follow-Up Reminder — ${days === 7 ? '7 Days' : '30 Days'}</h2>
      <p>${tenantName} &bull; ${leads.length} lead${leads.length > 1 ? 's' : ''} with no recent activity</p>
    </div>
    <div class="body">
      <div class="summary">
        <strong>${leads.length} lead${leads.length > 1 ? 's have' : ' has'} had no activity for ${days}+ days.</strong><br>
        Please review and follow up as soon as possible.
      </div>
      <table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Stage</th>
            <th>Inactive</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${leadRows}
        </tbody>
      </table>
    </div>
    <div class="footer">
      Echo5 Leads &bull; ${tenantName}<br>
      You are receiving this because you are listed as a notification contact for this account.
    </div>
  </div>
</body>
</html>`.trim();

  const text = `
${emoji} Follow-Up Reminder (${days}-day) — ${tenantName}

${leads.length} lead${leads.length > 1 ? 's have' : ' has'} had no activity for ${days}+ days:

${textList}

Log in to take action: ${base}
`.trim();

  return sendEmail({ to: notificationEmails, subject, text, html });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret — accept from Authorization header or query param
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    const querySecret = req.query.secret;
    const isVercel = req.headers['x-vercel-cron'] === '1';

    const authorized =
      isVercel ||
      authHeader === `Bearer ${cronSecret}` ||
      querySecret === cronSecret;

    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const db = await getDb();
    const now = new Date();
    const sevenDaysAgo  = new Date(now.getTime() - SEVEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

    const tenants = await db.collection('tenants').find({}).toArray();
    const summary = [];

    for (const tenant of tenants) {
      const notificationEmails = tenant.config?.notificationEmails || [];
      if (notificationEmails.length === 0) {
        console.log(`[Followup] Skipping ${tenant.name} — no notification emails configured`);
        continue;
      }

      const baseFilter = {
        tenantId: tenant._id,
        stage: { $nin: CLOSED_STAGES },
        isArchived: { $ne: true }
      };

      // 7-day stale: inactive 7+ days, reminder not yet sent OR sent before last activity (reset)
      const sevenDayLeads = await db.collection('leads').find({
        ...baseFilter,
        latestActivityAt: { $lt: sevenDaysAgo },
        $or: [
          { reminder7dSentAt: { $exists: false } },
          { reminder7dSentAt: null },
          { $expr: { $lt: ['$reminder7dSentAt', '$latestActivityAt'] } }
        ]
      }, {
        projection: { firstName: 1, lastName: 1, email: 1, stage: 1, latestActivityAt: 1 }
      }).toArray();

      // 30-day stale: inactive 30+ days, reminder not yet sent OR reset
      const thirtyDayLeads = await db.collection('leads').find({
        ...baseFilter,
        latestActivityAt: { $lt: thirtyDaysAgo },
        $or: [
          { reminder30dSentAt: { $exists: false } },
          { reminder30dSentAt: null },
          { $expr: { $lt: ['$reminder30dSentAt', '$latestActivityAt'] } }
        ]
      }, {
        projection: { firstName: 1, lastName: 1, email: 1, stage: 1, latestActivityAt: 1 }
      }).toArray();

      const frontendUrl = process.env.FRONTEND_URL;

      // Send 7-day reminders
      if (sevenDayLeads.length > 0) {
        console.log(`[Followup] ${tenant.name}: sending 7-day reminder for ${sevenDayLeads.length} leads`);
        await sendReminderEmail({
          tenantName: tenant.name,
          leads: sevenDayLeads,
          days: 7,
          notificationEmails,
          frontendUrl
        });
        await db.collection('leads').updateMany(
          { _id: { $in: sevenDayLeads.map(l => l._id) } },
          { $set: { reminder7dSentAt: now } }
        );
      }

      // Send 30-day reminders
      if (thirtyDayLeads.length > 0) {
        console.log(`[Followup] ${tenant.name}: sending 30-day reminder for ${thirtyDayLeads.length} leads`);
        await sendReminderEmail({
          tenantName: tenant.name,
          leads: thirtyDayLeads,
          days: 30,
          notificationEmails,
          frontendUrl
        });
        await db.collection('leads').updateMany(
          { _id: { $in: thirtyDayLeads.map(l => l._id) } },
          { $set: { reminder30dSentAt: now } }
        );
      }

      summary.push({
        tenant: tenant.name,
        sevenDayReminders: sevenDayLeads.length,
        thirtyDayReminders: thirtyDayLeads.length,
        notifiedEmails: notificationEmails.length
      });
    }

    console.log('[Followup] Done:', JSON.stringify(summary));
    return res.status(200).json({ ok: true, timestamp: now.toISOString(), summary });

  } catch (err) {
    console.error('[Followup Notifications] Error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
