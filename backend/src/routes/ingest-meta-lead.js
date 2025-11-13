/**
 * Meta (Facebook/Instagram) Lead Ads Webhook Handler
 * 
 * Handles webhook callbacks from Facebook Lead Ads
 * Documentation: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/
 * 
 * Two phases:
 * 1. Webhook Verification (GET request) - Facebook verifies webhook URL
 * 2. Lead Delivery (POST request) - Facebook sends lead data
 */

import { getDb, resolveTenantId, normPhone } from '../lib/mongo.js';
import { ObjectId } from 'mongodb';

/**
 * GET /api/ingest/meta-lead - Webhook verification
 * 
 * Facebook sends:
 * - hub.mode=subscribe
 * - hub.challenge=<random_string>
 * - hub.verify_token=<your_verify_token>
 * 
 * Must respond with hub.challenge to complete verification
 */
async function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Check if this is webhook verification from Facebook
  if (mode && token) {
    // Verify token matches environment variable
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'echo5_meta_webhook_verify';
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Meta Webhook] Verification successful');
      // Respond with challenge to complete verification
      return res.status(200).send(challenge);
    } else {
      console.error('[Meta Webhook] Verification failed - token mismatch');
      return res.status(403).json({ error: 'Verification token mismatch' });
    }
  }
  
  return res.status(400).json({ error: 'Missing verification parameters' });
}

/**
 * POST /api/ingest/meta-lead - Lead data webhook
 * 
 * Facebook sends leads in this format:
 * {
 *   "object": "page",
 *   "entry": [{
 *     "id": "<page_id>",
 *     "time": 1234567890,
 *     "changes": [{
 *       "field": "leadgen",
 *       "value": {
 *         "ad_id": "123456",
 *         "form_id": "789012",
 *         "leadgen_id": "345678",
 *         "created_time": 1234567890,
 *         "page_id": "<page_id>",
 *         "adgroup_id": "456789"
 *       }
 *     }]
 *   }]
 * }
 * 
 * The actual lead data needs to be fetched via Graph API
 */
async function handleWebhook(req, res) {
  try {
    const db = await getDb();
    
    // Extract tenant API key from header
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const tenantId = await resolveTenantId(db, apiKey);
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    // Facebook sends webhook data in specific format
    const body = req.body;
    
    // Validate it's a leadgen webhook
    if (body.object !== 'page') {
      console.log('[Meta Webhook] Ignoring non-page webhook');
      return res.status(200).json({ success: true, message: 'Not a page webhook' });
    }

    // Process each entry (can be multiple leads in one webhook)
    const entries = body.entry || [];
    const results = [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      
      for (const change of changes) {
        if (change.field !== 'leadgen') {
          continue; // Skip non-leadgen changes
        }

        const leadData = change.value;
        
        // In production, you would fetch full lead data from Graph API here:
        // GET https://graph.facebook.com/v18.0/{leadgen_id}?access_token={token}
        // For now, we'll work with the webhook data
        
        console.log('[Meta Webhook] Processing lead:', leadData.leadgen_id);
        
        // Store the raw webhook data for future Graph API fetch
        const webhookPayload = {
          leadgen_id: leadData.leadgen_id,
          form_id: leadData.form_id,
          ad_id: leadData.ad_id,
          adgroup_id: leadData.adgroup_id,
          page_id: leadData.page_id,
          created_time: leadData.created_time,
          received_at: new Date().toISOString()
        };

        // Create a placeholder lead record
        // In production, replace this with Graph API fetch to get actual field data
        const lead = {
          tenantId,
          source: 'facebook',
          campaignName: `FB Ad ${leadData.ad_id}`,
          stage: 'new',
          spamFlag: false,
          consent: true,
          createdAt: new Date(leadData.created_time * 1000),
          latestActivityAt: new Date(leadData.created_time * 1000),
          originalPayload: webhookPayload,
          notes: `Meta Lead ID: ${leadData.leadgen_id}. Full data pending Graph API fetch.`
        };

        // Insert into leads collection
        const leadsCollection = db.collection('leads');
        const result = await leadsCollection.insertOne(lead);

        console.log('[Meta Webhook] Lead placeholder created:', result.insertedId);

        results.push({
          leadgen_id: leadData.leadgen_id,
          lead_id: result.insertedId.toString(),
          status: 'pending_graph_api_fetch'
        });
      }
    }

    // Facebook requires quick 200 response
    return res.status(200).json({ 
      success: true, 
      processed: results.length,
      results 
    });

  } catch (error) {
    console.error('[Meta Webhook] Error:', error);
    // Still return 200 to Facebook to prevent retries
    return res.status(200).json({ success: false, error: error.message });
  }
}

/**
 * Fetch full lead data from Meta Graph API
 * Called separately after webhook notification
 * 
 * @param {string} leadgenId - The leadgen_id from webhook
 * @param {string} accessToken - Facebook Page Access Token
 * @returns {Object} Full lead data with fields
 */
async function fetchLeadFromGraphAPI(leadgenId, accessToken) {
  const fetch = require('node-fetch');
  
  const url = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Example response:
    // {
    //   "id": "345678",
    //   "created_time": "2024-01-15T10:30:00+0000",
    //   "field_data": [
    //     { "name": "first_name", "values": ["John"] },
    //     { "name": "last_name", "values": ["Doe"] },
    //     { "name": "email", "values": ["john@example.com"] },
    //     { "name": "phone_number", "values": ["+13105551234"] }
    //   ]
    // }

    return data;
  } catch (error) {
    console.error('[Meta Graph API] Fetch failed:', error);
    throw error;
  }
}

/**
 * Process full lead data from Graph API and update lead record
 * 
 * @param {string} tenantId - Tenant ID
 * @param {string} leadId - MongoDB lead _id (string)
 * @param {Object} graphData - Full lead data from Graph API
 */
async function updateLeadWithGraphData(tenantId, leadId, graphData) {
  const db = await getDb();
  
  // Convert field_data array to object
  const fields = {};
  for (const field of graphData.field_data || []) {
    fields[field.name] = field.values[0]; // Take first value
  }

  // Map Meta fields to Echo5 schema
  const updates = {};
  
  if (fields.first_name) updates.firstName = fields.first_name;
  if (fields.last_name) updates.lastName = fields.last_name;
  if (fields.email) updates.email = fields.email.toLowerCase().trim();
  if (fields.phone_number) updates.phoneE164 = normPhone(fields.phone_number);
  if (fields.city) updates.city = fields.city;
  
  // Custom fields (adjust based on your lead form)
  if (fields.interest) updates.interest = fields.interest;
  if (fields.have_children) updates.haveChildren = fields.have_children === 'yes';
  if (fields.planning_to_foster) updates.planningToFoster = fields.planning_to_foster === 'yes';

  // Update the lead
  const leadsCollection = db.collection('leads');
  const result = await leadsCollection.updateOne(
    { _id: new ObjectId(leadId), tenantId },
    { 
      $set: {
        ...updates,
        notes: `Meta Lead ID: ${graphData.id}. Data fetched from Graph API.`,
        originalPayload: graphData
      }
    }
  );

  console.log('[Meta Graph API] Lead updated:', leadId);
  return result;
}

export { verifyWebhook, handleWebhook, fetchLeadFromGraphAPI, updateLeadWithGraphData };
