// Vercel Cron Job for SLA Monitoring
// This file runs as a scheduled function on Vercel
// Configure in vercel.json: "crons": [{ "path": "/api/cron/sla-check", "schedule": "0 */4 * * *" }]

import { getDb } from '../../src/lib/mongo.js';

export default async function handler(req, res) {
  // Verify this is called by Vercel Cron (check authorization header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = await getDb();
    const now = new Date();
    
    console.log('[SLA Check] Starting at:', now.toISOString());

    // Get all tenants
    const tenants = await db.collection('tenants').find({}).toArray();
    const notifications = [];

    for (const tenant of tenants) {
      const slaHours = tenant.config?.slaHours || 24;
      const slaThreshold = new Date(now.getTime() - (slaHours * 60 * 60 * 1000));

      // Find overdue leads
      const overdueLeads = await db.collection('leads').find({
        tenantId: tenant._id,
        latestActivityAt: { $lt: slaThreshold },
        stage: { $nin: ['licensed', 'placement', 'not_fit', 'approved', 'denied'] }
      }).toArray();

      if (overdueLeads.length > 0) {
        console.log(`[SLA Check] Tenant ${tenant.name}: ${overdueLeads.length} overdue leads`);
        
        // TODO: Send email notification here
        // Example: await sendEmailAlert(tenant, overdueLeads);
        
        notifications.push({
          tenantId: tenant._id,
          tenantName: tenant.name,
          overdueCount: overdueLeads.length,
          slaHours
        });
      }
    }

    // Log results
    console.log('[SLA Check] Complete. Total notifications:', notifications.length);

    res.status(200).json({
      success: true,
      timestamp: now.toISOString(),
      checked: tenants.length,
      notifications: notifications.length,
      details: notifications
    });
  } catch (err) {
    console.error('[SLA Check] Error:', err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
}

/**
 * Send email alert for overdue leads
 * TODO: Implement with email service (SendGrid, AWS SES, etc.)
 * 
 * @param {Object} tenant - Tenant object
 * @param {Array} overdueLeads - Array of overdue lead objects
 */
async function sendEmailAlert(tenant, overdueLeads) {
  // Example implementation (pseudo-code):
  // const emailService = require('@sendgrid/mail');
  // 
  // const emailBody = `
  //   <h2>SLA Alert: ${overdueLeads.length} Overdue Leads</h2>
  //   <p>Client: ${tenant.name}</p>
  //   <p>SLA Threshold: ${tenant.config.slaHours} hours</p>
  //   <ul>
  //     ${overdueLeads.map(lead => `
  //       <li>${lead.firstName} ${lead.lastName} - ${lead.stage} - ${lead.email}</li>
  //     `).join('')}
  //   </ul>
  // `;
  //
  // await emailService.send({
  //   to: tenant.config.managerEmail,
  //   from: 'alerts@echo5digital.com',
  //   subject: `SLA Alert: ${overdueLeads.length} Overdue Leads`,
  //   html: emailBody
  // });
  
  console.log(`[Email] Would send to ${tenant.name} manager about ${overdueLeads.length} overdue leads`);
}
