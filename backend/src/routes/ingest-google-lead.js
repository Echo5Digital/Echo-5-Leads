/**
 * Google Ads Lead Form Integration
 * 
 * Two integration methods supported:
 * 1. Direct webhook from Google Ads (if available via partner integration)
 * 2. Zapier/Make/n8n webhook (recommended for most users)
 * 
 * Documentation:
 * - Google Ads Lead Forms: https://support.google.com/google-ads/answer/9423234
 * - Zapier Integration: https://zapier.com/apps/google-ads/integrations
 */

import { getDb, resolveTenantId, normPhone } from '../lib/mongo.js';

/**
 * POST /api/ingest/google-lead - Google Ads lead webhook
 * 
 * Accepts leads from:
 * 1. Google Ads webhook (if configured via Google partner integration)
 * 2. Zapier webhook (Google Ads → Webhook by Zapier)
 * 3. Make.com webhook
 * 4. n8n webhook
 * 
 * Expected payload format (flexible):
 * {
 *   "first_name": "John",
 *   "last_name": "Doe",
 *   "email": "john@example.com",
 *   "phone": "+13105551234",
 *   "city": "Los Angeles",
 *   "gclid": "abc123...",
 *   "campaign_id": "123456",
 *   "campaign_name": "Foster Care Campaign",
 *   "ad_group_id": "789012",
 *   "form_id": "form_12345",
 *   "submitted_at": "2024-01-15T10:30:00Z"
 * }
 */

async function handleGoogleLead(req, res) {

  try {

    const db = await getDb();

    

    // Extract tenant API key from header

    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];

    const tenantId = await resolveTenantId(db, apiKey);

    

    if (!tenantId) {

      return res.status(401).json({ error: 'Invalid or missing API key' });

    }



    const payload = req.body;

    

    // Validate required fields (at least email OR phone)

    if (!payload.email && !payload.phone && !payload.phone_number) {

      return res.status(400).json({ 

        error: 'Missing required fields: email or phone required' 

      });

    }



    // Get tenant for spam checking

    const tenantsCollection = db.collection('tenants');

    const tenant = await tenantsCollection.findOne({ _id: tenantId });

    

    if (!tenant) {

      return res.status(404).json({ error: 'Tenant not found' });

    }



    // Normalize phone number if provided

    let phoneE164 = null;

    const phoneField = payload.phone || payload.phone_number;

    if (phoneField) {

      phoneE164 = normPhone(phoneField);

    }



    // Normalize email

    const email = payload.email ? payload.email.toLowerCase().trim() : null;



    // Check for existing lead (deduplication)

    const leadsCollection = db.collection('leads');

    const query = { tenantId };

    

    if (email && phoneE164) {

      query.$or = [{ email }, { phoneE164 }];

    } else if (email) {

      query.email = email;

    } else if (phoneE164) {

      query.phoneE164 = phoneE164;

    }



    const existingLead = await leadsCollection.findOne(query);



    // Prepare lead data

    const now = new Date();

    const leadData = {

      tenantId,

      firstName: payload.first_name || payload.firstName || null,

      lastName: payload.last_name || payload.lastName || null,

      email,

      phoneE164,

      city: payload.city || null,

      interest: payload.interest || null,

      haveChildren: payload.have_children === 'yes' || payload.haveChildren === true || null,

      planningToFoster: payload.planning_to_foster === 'yes' || payload.planningToFoster === true || null,

      

      // Source attribution (CRITICAL - first-touch)

      source: 'google',

      campaignName: payload.campaign_name || payload.campaignName || `Google Ad ${payload.campaign_id || 'Unknown'} `,

      

      // Stage and flags

      stage: 'new',

      assignedUserId: null,

      office: null,

      consent: true,

      

      // Spam detection

      spamFlag: false,

      

      // Timestamps

      latestActivityAt: now,

      

      // Metadata

      originalPayload: payload,

      notes: null

    };



    // Check spam keywords

    const spamKeywords = tenant.config?.spamKeywords || [];

    const textToCheck = [

      leadData.firstName,

      leadData.lastName,

      leadData.email,

      payload.message,

      payload.comments

    ].filter(Boolean).join(' ').toLowerCase();



    for (const keyword of spamKeywords) {

      if (textToCheck.includes(keyword.toLowerCase())) {

        leadData.spamFlag = true;

        console.log(`[Google Lead] Spam detected: keyword "${keyword}"`);

        break;

      }

    }



    if (existingLead) {

      // UPDATE existing lead

      console.log('[Google Lead] Updating existing lead:', existingLead._id);

      

      // Never overwrite source (first-touch attribution)

      delete leadData.source;

      delete leadData.createdAt;

      

      // Update lead

      await leadsCollection.updateOne(

        { _id: existingLead._id },

        { $set: leadData }

      );



      // Create activity for update

      const activitiesCollection = db.collection('activities');

      await activitiesCollection.insertOne({

        tenantId,

        leadId: existingLead._id.toString(),

        type: 'note',

        content: {

          title: 'Lead Updated from Google Ads',

          note: 'Lead re-submitted via Google Ads lead form'

        },

        createdAt: now

      });



      // Log UTM snapshot if tracking params present

      const trackingParams = extractTrackingParams(payload);

      if (Object.keys(trackingParams).length > 0) {

        await activitiesCollection.insertOne({

          tenantId,

          leadId: existingLead._id.toString(),

          type: 'utm_snapshot',

          content: trackingParams,

          createdAt: now

        });

      }



      return res.status(200).json({

        success: true,

        leadId: existingLead._id.toString(),

        action: 'updated',

        message: 'Existing lead updated'

      });



    } else {

      // CREATE new lead

      console.log('[Google Lead] Creating new lead');

      

      leadData.createdAt = now;

      

      const result = await leadsCollection.insertOne(leadData);

      const newLeadId = result.insertedId.toString();



      // Create attribution activity

      const activitiesCollection = db.collection('activities');

      await activitiesCollection.insertOne({

        tenantId,

        leadId: newLeadId,

        type: 'note',

        content: {

          title: 'Attribution v1',

          note: `source set to: google`

        },

        createdAt: now

      });



      // Log UTM snapshot if tracking params present

      const trackingParams = extractTrackingParams(payload);

      if (Object.keys(trackingParams).length > 0) {

        await activitiesCollection.insertOne({

          tenantId,

          leadId: newLeadId,

          type: 'utm_snapshot',

          content: trackingParams,

          createdAt: now

        });

      }



      console.log('[Google Lead] New lead created:', newLeadId);



      return res.status(201).json({

        success: true,

        leadId: newLeadId,

        action: 'created',

        message: 'New lead created'

      });

    }



  } catch (error) {

    console.error('[Google Lead] Error:', error);

    return res.status(500).json({ 

      success: false, 

      error: 'Internal server error',

      message: error.message 

    });

  }

}



/**

 * Extract tracking parameters from payload

 * Supports: gclid, campaign_id, ad_group_id, utm_*, form_id

 */

function extractTrackingParams(payload) {

  const params = {};

  

  // Google-specific tracking

  if (payload.gclid) params.gclid = payload.gclid;

  if (payload.campaign_id) params.campaign_id = payload.campaign_id;

  if (payload.campaign_name) params.campaign_name = payload.campaign_name;

  if (payload.ad_group_id) params.ad_group_id = payload.ad_group_id;

  if (payload.ad_group_name) params.ad_group_name = payload.ad_group_name;

  if (payload.form_id) params.form_id = payload.form_id;

  

  // Standard UTM parameters

  if (payload.utm_source) params.utm_source = payload.utm_source;

  if (payload.utm_medium) params.utm_medium = payload.utm_medium;

  if (payload.utm_campaign) params.utm_campaign = payload.utm_campaign;

  if (payload.utm_term) params.utm_term = payload.utm_term;

  if (payload.utm_content) params.utm_content = payload.utm_content;

  

  // Referrer

  if (payload.referrer) params.referrer = payload.referrer;

  

  return params;

}



export { handleGoogleLead };

