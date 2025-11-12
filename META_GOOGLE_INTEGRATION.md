# Meta & Google Ads Integration Guide

## Overview

Echo5 Leads now supports **direct lead capture** from:
- 🔵 **Meta (Facebook/Instagram) Lead Ads**
- 🔴 **Google Ads Lead Forms**

Both integrations use webhook endpoints to receive leads in real-time and automatically create them in the Echo5 platform.

---

## Meta (Facebook/Instagram) Lead Ads Integration

### How It Works

1. User fills out lead form on Facebook/Instagram ad
2. Facebook sends webhook notification to Echo5
3. Echo5 creates lead record with source = "facebook"
4. Lead appears in dashboard immediately

### Setup Steps

#### 1. Configure Facebook App & Webhook

**In Facebook Developer Console:**

1. Go to https://developers.facebook.com/apps
2. Select your app (or create new app)
3. Go to **Webhooks** section
4. Click **Add Subscription** → Select **Page**
5. Add callback URL:
   ```
   https://your-backend.vercel.app/api/ingest/meta-lead
   ```
6. Enter verify token (set in environment variable):
   ```
   META_VERIFY_TOKEN=echo5_meta_webhook_verify
   ```
7. Subscribe to **leadgen** webhook field
8. Click **Verify and Save**

#### 2. Set Environment Variables

Add to backend `.env`:

```bash
META_VERIFY_TOKEN=echo5_meta_webhook_verify
META_PAGE_ACCESS_TOKEN=your_page_access_token_here
```

**Getting Page Access Token:**
1. Go to Facebook Business Manager
2. Select your page → Settings → Page Access Tokens
3. Generate token with `leads_retrieval` permission
4. Copy token to environment variable

#### 3. Test Webhook

Use Facebook's Test Tool:
1. Go to Webhooks settings in your app
2. Click **Test** button next to leadgen subscription
3. Facebook will send test webhook
4. Check backend logs for `[Meta Webhook] Verification successful`

#### 4. Create Test Lead

1. Create a lead ad on Facebook
2. Fill out the form as a test user
3. Check Echo5 dashboard - lead should appear with source = "facebook"

### Webhook Endpoints

**GET** `/api/ingest/meta-lead` - Webhook verification
- Used by Facebook to verify webhook URL
- Responds with challenge token

**POST** `/api/ingest/meta-lead` - Lead delivery
- Receives lead notification from Facebook
- Creates placeholder lead in database
- Requires `X-Tenant-Key` header for tenant identification

### Lead Data Flow

Facebook sends webhook notification with `leadgen_id`:
```json
{
  "object": "page",
  "entry": [{
    "changes": [{
      "field": "leadgen",
      "value": {
        "leadgen_id": "123456789",
        "ad_id": "987654321",
        "form_id": "111222333",
        "created_time": 1699876543
      }
    }]
  }]
}
```

Echo5 creates lead with placeholder data. Full lead data must be fetched from Graph API separately (see Advanced Usage).

### Advanced: Fetch Full Lead Data

The webhook only contains `leadgen_id`. To get actual form fields (name, email, phone), you need to fetch from Graph API:

```javascript
GET https://graph.facebook.com/v18.0/{leadgen_id}
    ?access_token={page_access_token}
```

Response contains full field data:
```json
{
  "id": "123456789",
  "created_time": "2024-01-15T10:30:00+0000",
  "field_data": [
    { "name": "first_name", "values": ["John"] },
    { "name": "last_name", "values": ["Doe"] },
    { "name": "email", "values": ["john@example.com"] },
    { "name": "phone_number", "values": ["+13105551234"] }
  ]
}
```

**Helper Function Provided:**
- `fetchLeadFromGraphAPI(leadgenId, accessToken)` - Fetches full data
- `updateLeadWithGraphData(tenantId, leadId, graphData)` - Updates lead

**Recommended Implementation:**
1. Set up background job (cron or queue)
2. Fetch pending leads from Graph API every 5 minutes
3. Update lead records with full data

---

## Google Ads Lead Form Integration

### How It Works

1. User fills out lead form in Google Ad
2. Zapier/Make catches form submission
3. Zapier sends webhook to Echo5
4. Echo5 creates lead with source = "google"

### Setup Steps (via Zapier)

#### 1. Create Zapier Zap

1. Go to https://zapier.com
2. Create new Zap
3. **Trigger**: Google Ads → New Lead
   - Connect Google Ads account
   - Select campaign/form
4. **Action**: Webhooks by Zapier → POST
   - URL: `https://your-backend.vercel.app/api/ingest/google-lead`
   - Payload Type: JSON
   - Headers:
     ```
     X-Tenant-Key: your_tenant_api_key
     Content-Type: application/json
     ```
   - Data (map fields):
     ```json
     {
       "first_name": "{{First Name}}",
       "last_name": "{{Last Name}}",
       "email": "{{Email}}",
       "phone": "{{Phone}}",
       "gclid": "{{GCLID}}",
       "campaign_id": "{{Campaign ID}}",
       "campaign_name": "{{Campaign Name}}",
       "form_id": "{{Form ID}}"
     }
     ```
5. Test Zap
6. Turn on Zap

#### 2. Alternative: Direct Google Integration

If you have Google Ads API access or partner integration:

**POST** directly to:
```
https://your-backend.vercel.app/api/ingest/google-lead
```

With headers:
```
X-Tenant-Key: your_tenant_api_key
Content-Type: application/json
```

Payload:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+13105551234",
  "city": "Los Angeles",
  "gclid": "abc123xyz",
  "campaign_id": "123456",
  "campaign_name": "Foster Care Campaign",
  "ad_group_id": "789012",
  "form_id": "form_12345"
}
```

### Supported Fields

**Required** (at least one):
- `email` - Email address
- `phone` or `phone_number` - Phone number

**Optional**:
- `first_name`, `firstName` - First name
- `last_name`, `lastName` - Last name
- `city` - City
- `interest` - Interest type
- `have_children` - Has children (yes/no)
- `planning_to_foster` - Planning to foster (yes/no)

**Tracking Parameters**:
- `gclid` - Google Click ID
- `campaign_id` - Campaign ID
- `campaign_name` - Campaign name
- `ad_group_id` - Ad group ID
- `form_id` - Form ID
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`

### Testing

**Test with cURL:**

```bash
curl -X POST https://your-backend.vercel.app/api/ingest/google-lead \
  -H "X-Tenant-Key: oa_e7f1365581ec1a236049347aeccd5d39" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "phone": "555-123-4567",
    "gclid": "test_gclid_123",
    "campaign_name": "Test Campaign"
  }'
```

Expected response:
```json
{
  "success": true,
  "leadId": "67890abcdef...",
  "action": "created",
  "message": "New lead created"
}
```

---

## Multi-Source Lead Attribution

### First-Touch Attribution (CRITICAL)

Both Meta and Google integrations respect **first-touch attribution**:

- **New lead**: `source` is set to "facebook" or "google"
- **Existing lead**: Original `source` is preserved (never overwritten)

### UTM Snapshots

All tracking parameters are logged as `utm_snapshot` activities:
- Google: gclid, campaign_id, campaign_name, ad_group_id
- Facebook: leadgen_id, ad_id, form_id
- Both: utm_source, utm_medium, utm_campaign, utm_term, utm_content

These snapshots enable **multi-touch attribution** reporting without changing the original source.

---

## Deduplication Logic

Both integrations use the same deduplication as WordPress:

1. Check for existing lead with matching `email` OR `phone`
2. If found → **UPDATE** existing lead (preserve source)
3. If not found → **CREATE** new lead (set source)

---

## Error Handling

### Meta Webhook

- Facebook requires **200 OK** response within 20 seconds
- Errors are logged but 200 is still returned
- Failed webhooks are retried by Facebook
- Check `originalPayload` field in lead record for raw data

### Google Webhook

- Returns standard HTTP status codes:
  - `201` - Lead created
  - `200` - Lead updated
  - `400` - Invalid payload
  - `401` - Invalid API key
  - `500` - Server error

---

## Monitoring & Troubleshooting

### Check Leads by Source

Dashboard shows source distribution chart. Filter leads by:
- `source: "facebook"` - From Meta Lead Ads
- `source: "google"` - From Google Ads
- `source: "website"` - From WordPress forms

### Backend Logs

Check logs for webhook activity:
```
[Meta Webhook] Processing lead: 123456789
[Meta Webhook] Lead placeholder created: 67890abc...
[Google Lead] Creating new lead
[Google Lead] New lead created: 67890abc...
```

### Test Endpoints

**Health Check:**
```bash
curl https://your-backend.vercel.app/health
```

**Test Meta Verification:**
```bash
curl "https://your-backend.vercel.app/api/ingest/meta-lead?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=echo5_meta_webhook_verify"
```

Should return: `test123`

---

## Production Checklist

### Meta Lead Ads

- [ ] Facebook app created and configured
- [ ] Webhook URL verified with Facebook
- [ ] `META_VERIFY_TOKEN` set in environment
- [ ] `META_PAGE_ACCESS_TOKEN` set in environment
- [ ] Test lead submitted and received
- [ ] Graph API fetch job scheduled (optional)

### Google Ads

- [ ] Zapier Zap created and enabled
- [ ] Webhook URL configured with correct tenant API key
- [ ] Field mapping tested
- [ ] Test lead received in Echo5
- [ ] GCLID tracking working

### Both

- [ ] Leads appearing in dashboard
- [ ] Source attribution correct
- [ ] UTM snapshots being created
- [ ] Deduplication working
- [ ] Spam detection active

---

## Support & Resources

**Documentation:**
- Meta Lead Ads: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/
- Google Ads API: https://developers.google.com/google-ads/api/docs/lead-form
- Zapier Google Ads: https://zapier.com/apps/google-ads/integrations

**Echo5 Support:**
- Email: support@echo5digital.com
- Check backend logs for webhook activity
- Verify API key is active in tenant settings

---

## Next Steps

1. **Test Meta integration** with Facebook test lead
2. **Set up Zapier** for Google Ads
3. **Monitor dashboard** for incoming leads
4. **Configure Graph API fetch** for full Meta lead data (advanced)
5. **Set up SLA alerts** for timely follow-up

**Your multi-source lead capture is now ready!** 🎉
