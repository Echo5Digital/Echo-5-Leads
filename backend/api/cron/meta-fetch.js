// Vercel Cron Job for Meta Lead Data Fetch
// This file runs as a scheduled function on Vercel
// Configure in vercel.json: "crons": [{ "path": "/api/cron/meta-fetch", "schedule": "*/10 * * * *" }]

import { getDb } from '../../src/lib/mongo.js';
import { fetchLeadFromGraphAPI, updateLeadWithGraphData } from '../../src/routes/ingest-meta-lead.js';

export default async function handler(req, res) {
  // Verify this is called by Vercel Cron (check authorization header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = await getDb();
    const now = new Date();
    
    console.log('[Meta Fetch] Starting at:', now.toISOString());

    // Find leads with placeholder Meta data (notes contain "Graph API fetch")
    const pendingLeads = await db.collection('leads').find({
      source: 'facebook',
      notes: { $regex: /Graph API fetch/i }
    }).limit(50).toArray();  // Process 50 at a time

    console.log(`[Meta Fetch] Found ${pendingLeads.length} pending leads`);

    const results = [];
    const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

    if (!accessToken) {
      console.error('[Meta Fetch] META_PAGE_ACCESS_TOKEN not set');
      return res.status(500).json({ 
        error: 'META_PAGE_ACCESS_TOKEN not configured' 
      });
    }

    for (const lead of pendingLeads) {
      try {
        // Extract leadgen_id from originalPayload
        const leadgenId = lead.originalPayload?.leadgen_id;
        
        if (!leadgenId) {
          console.log(`[Meta Fetch] No leadgen_id for lead ${lead._id}`);
          continue;
        }

        // Fetch full data from Graph API
        console.log(`[Meta Fetch] Fetching leadgen_id: ${leadgenId}`);
        const graphData = await fetchLeadFromGraphAPI(leadgenId, accessToken);

        // Update lead with full data
        await updateLeadWithGraphData(
          lead.tenantId,
          lead._id.toString(),
          graphData
        );

        results.push({
          leadId: lead._id.toString(),
          leadgenId,
          status: 'success'
        });

        console.log(`[Meta Fetch] Successfully updated lead ${lead._id}`);
      } catch (err) {
        console.error(`[Meta Fetch] Failed to fetch lead ${lead._id}:`, err.message);
        results.push({
          leadId: lead._id.toString(),
          leadgenId: lead.originalPayload?.leadgen_id,
          status: 'error',
          error: err.message
        });
      }
    }

    console.log('[Meta Fetch] Complete. Processed:', results.length);

    res.status(200).json({
      success: true,
      timestamp: now.toISOString(),
      found: pendingLeads.length,
      processed: results.length,
      results
    });
  } catch (err) {
    console.error('[Meta Fetch] Error:', err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
}
