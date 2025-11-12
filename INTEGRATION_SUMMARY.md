# Meta & Google Integrations - Implementation Summary

## ✅ COMPLETED

### Backend Routes Created

1. **Meta (Facebook/Instagram) Lead Ads**
   - File: `/backend/src/routes/ingest-meta-lead.js`
   - GET `/api/ingest/meta-lead` - Webhook verification
   - POST `/api/ingest/meta-lead` - Lead delivery webhook
   - Supports Facebook webhook verification flow
   - Creates leads with source = "facebook"
   - Includes helper functions for Graph API fetch

2. **Google Ads Lead Forms**
   - File: `/backend/src/routes/ingest-google-lead.js`
   - POST `/api/ingest/google-lead` - Lead webhook
   - Supports direct Google webhooks OR Zapier/Make/n8n
   - Creates leads with source = "google"
   - Handles both snake_case and camelCase fields
   - Tracks gclid, campaign_id, utm_* parameters

### Routes Registered

Updated `/backend/index.js` with:
- Meta webhook verification (GET)
- Meta lead delivery (POST)
- Google lead webhook (POST)

Now **18 total routes** in backend.

### Test Scripts

Created comprehensive test scripts:

1. **test-meta.js** - Tests Meta integration
   - Webhook verification
   - Lead webhook payload
   - Invalid API key handling
   - Run: `npm run test:meta`

2. **test-google.js** - Tests Google integration
   - Create new lead
   - Update existing lead (deduplication)
   - Phone-only lead
   - Invalid payload
   - Zapier-style payload
   - Run: `npm run test:google`

### Documentation

Created `/META_GOOGLE_INTEGRATION.md` (comprehensive guide):
- Meta setup with Facebook Developer Console
- Google setup with Zapier
- Field mappings
- Testing procedures
- Troubleshooting
- Production checklist

## Key Features

### Multi-Source Attribution
- ✅ First-touch attribution preserved
- ✅ Source set to "facebook" or "google"
- ✅ UTM snapshots for multi-touch tracking
- ✅ Original source never overwritten

### Deduplication
- ✅ Same logic as WordPress plugin
- ✅ Match by email OR phone
- ✅ Update existing leads without changing source

### Tracking Parameters
- ✅ Meta: leadgen_id, ad_id, form_id, page_id
- ✅ Google: gclid, campaign_id, ad_group_id
- ✅ Standard: utm_source, utm_medium, utm_campaign, utm_term, utm_content

### Error Handling
- ✅ Meta: Always returns 200 (Facebook requirement)
- ✅ Google: Standard HTTP status codes
- ✅ Spam detection on both
- ✅ Phone normalization to E.164

## How to Test

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Test Meta Integration
```bash
export TEST_TENANT_KEY=oa_e7f1365581ec1a236049347aeccd5d39
npm run test:meta
```

### 3. Test Google Integration
```bash
export TEST_TENANT_KEY=oa_e7f1365581ec1a236049347aeccd5d39
npm run test:google
```

### 4. Manual Testing

**Meta webhook verification:**
```bash
curl "http://localhost:3001/api/ingest/meta-lead?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=echo5_meta_webhook_verify"
```

**Google lead submission:**
```bash
curl -X POST http://localhost:3001/api/ingest/google-lead \
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

## Production Setup

### Meta Lead Ads

1. Configure Facebook App in Developer Console
2. Add webhook URL: `https://your-backend.vercel.app/api/ingest/meta-lead`
3. Set verify token: `META_VERIFY_TOKEN=echo5_meta_webhook_verify`
4. Subscribe to `leadgen` webhook
5. Get Page Access Token for Graph API
6. Set `META_PAGE_ACCESS_TOKEN` in environment

### Google Ads

1. Create Zapier Zap:
   - Trigger: Google Ads → New Lead
   - Action: Webhooks by Zapier → POST
   - URL: `https://your-backend.vercel.app/api/ingest/google-lead`
   - Header: `X-Tenant-Key: {tenant_api_key}`
   - Map form fields to JSON payload

2. OR use direct Google Ads API if available

## Dashboard Integration

Leads from Meta and Google will:
- ✅ Appear in dashboard automatically
- ✅ Show correct source ("facebook" or "google")
- ✅ Display in source distribution chart
- ✅ Include UTM snapshot activities
- ✅ Respect tenant isolation

## Next Steps

1. **Deploy backend** with new routes to Vercel
2. **Test Meta** with Facebook Lead Ads form
3. **Set up Zapier** for Google Ads
4. **Monitor dashboard** for incoming leads
5. **Configure Graph API** fetch for full Meta lead data (optional)

## Files Changed

- ✅ `/backend/src/routes/ingest-meta-lead.js` - NEW
- ✅ `/backend/src/routes/ingest-google-lead.js` - NEW
- ✅ `/backend/index.js` - UPDATED (added 3 routes)
- ✅ `/backend/package.json` - UPDATED (added test scripts)
- ✅ `/backend/scripts/test-meta.js` - NEW
- ✅ `/backend/scripts/test-google.js` - NEW
- ✅ `/META_GOOGLE_INTEGRATION.md` - NEW (documentation)

---

**Status**: Ready for testing and deployment! 🚀
