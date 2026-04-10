// Test script: sends a dummy follow-up reminder email
// Run: node scripts/test-followup-email.js
import dotenv from 'dotenv';
import { sendEmail } from '../src/lib/email.js';

dotenv.config();

const TEST_TO = 'shani@echo5digital.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://echo5-digital-leads.vercel.app';

// Dummy lead data to preview the email
const dummyLeads7d = [
  { _id: 'abc123', firstName: 'Joyce', lastName: 'James', email: 'joycejames0907@gmail.com', stage: 'contacted', latestActivityAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
  { _id: 'abc124', firstName: 'Maria', lastName: 'Lopez', email: 'maria.lopez@gmail.com', stage: 'application_sent', latestActivityAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
  { _id: 'abc125', firstName: 'James', lastName: 'Carter', email: 'jcarter@yahoo.com', stage: 'new', latestActivityAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) },
];

const dummyLeads30d = [
  { _id: 'abc126', firstName: 'Sandra', lastName: 'Williams', email: 'swilliams@gmail.com', stage: 'application_completed', latestActivityAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
  { _id: 'abc127', firstName: 'Robert', lastName: 'Brown', email: 'rbrown@outlook.com', stage: 'contacted', latestActivityAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000) },
];

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function formatStage(stage) {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildEmail(leads, days, tenantName) {
  const emoji = days === 7 ? '⏰' : '🚨';
  const headerColor = days === 7 ? '#3b82f6' : '#ef4444';

  const leadRows = leads.map(lead => {
    const days_stale = daysSince(lead.latestActivityAt);
    const name = `${lead.firstName} ${lead.lastName}`;
    const stage = formatStage(lead.stage);
    const url = `${FRONTEND_URL}/leads/${lead._id}`;
    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
          <strong><a href="${url}" style="color:#3b82f6;text-decoration:none;">${name}</a></strong><br>
          <span style="font-size:12px;color:#9ca3af;">${lead.email}</span>
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${stage}</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:bold;color:#ef4444;">${days_stale} days ago</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
          <a href="${url}" style="background:#3b82f6;color:white;padding:6px 14px;border-radius:4px;text-decoration:none;font-size:13px;">View Lead</a>
        </td>
      </tr>`;
  }).join('');

  const subject = `${emoji} [TEST] ${tenantName} — ${leads.length} lead${leads.length > 1 ? 's' : ''} need${leads.length === 1 ? 's' : ''} follow-up (${days}-day reminder)`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f3f4f6;">
  <div style="max-width:650px;margin:30px auto;">

    <!-- TEST BANNER -->
    <div style="background:#f59e0b;color:white;padding:10px 20px;border-radius:8px 8px 0 0;font-size:13px;text-align:center;">
      ⚠️ THIS IS A TEST EMAIL — Real emails send every morning at 9am UTC
    </div>

    <!-- HEADER -->
    <div style="background:${headerColor};color:white;padding:24px;">
      <h2 style="margin:0 0 6px 0;font-size:22px;">${emoji} Follow-Up Reminder — ${days === 7 ? '7 Days' : '30 Days'}</h2>
      <p style="margin:0;opacity:0.9;font-size:14px;">${tenantName} &bull; ${leads.length} lead${leads.length > 1 ? 's' : ''} with no recent activity</p>
    </div>

    <!-- BODY -->
    <div style="background:white;padding:24px;border:1px solid #e5e7eb;">
      <p style="margin:0 0 16px 0;font-size:15px;">
        The following lead${leads.length > 1 ? 's have' : ' has'} had <strong>no activity for ${days}+ days</strong>.
        Please review and follow up as soon as possible.
      </p>

      <table style="width:100%;border-collapse:collapse;border-radius:6px;overflow:hidden;border:1px solid #e5e7eb;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Lead</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Stage</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Last Activity</th>
            <th style="padding:10px 12px;border-bottom:2px solid #e5e7eb;"></th>
          </tr>
        </thead>
        <tbody>
          ${leadRows}
        </tbody>
      </table>

      <div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:6px;border-left:4px solid ${headerColor};">
        <strong>What to do:</strong> Click <em>View Lead</em> on any lead above, add a note or log a call,
        and update the stage if it has changed. This will reset the follow-up timer automatically.
      </div>

      <div style="margin-top:20px;text-align:center;">
        <a href="${FRONTEND_URL}" style="background:${headerColor};color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:bold;">
          Open Leads Dashboard
        </a>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px;">
      Echo5 Leads &bull; ${tenantName}<br>
      You receive this because you are listed as a notification contact for this account.
    </div>
  </div>
</body>
</html>`.trim();

  return { subject, html };
}

async function sendTestEmails() {
  console.log(`Sending test follow-up emails to: ${TEST_TO}\n`);

  // Test 7-day email
  const email7 = buildEmail(dummyLeads7d, 7, 'Open Arms Foster Care');
  console.log('Sending 7-day reminder...');
  const result7 = await sendEmail({ to: TEST_TO, subject: email7.subject, text: '7-day follow-up reminder (see HTML version)', html: email7.html });
  console.log('7-day result:', result7);

  // Test 30-day email
  const email30 = buildEmail(dummyLeads30d, 30, 'Open Arms Foster Care');
  console.log('Sending 30-day reminder...');
  const result30 = await sendEmail({ to: TEST_TO, subject: email30.subject, text: '30-day follow-up reminder (see HTML version)', html: email30.html });
  console.log('30-day result:', result30);

  console.log('\nDone! Check shani@echo5digital.com for both emails.');
}

sendTestEmails().catch(console.error);
