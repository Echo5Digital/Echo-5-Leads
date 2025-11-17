# Echo5 Leads Manager with Vercel Sync

**Version:** 1.1.0  
**Modified from:** Echo5 Leads Manager v1.0.3  
**Purpose:** Automatically sync WordPress form submissions to Vercel backend API

## What This Plugin Does

This is your **existing working plugin** with one critical addition: **automatic Vercel API sync**. 

Every lead captured by this plugin will now be sent to two places:
1. **WordPress database** (as before) - for local management
2. **Vercel backend API** (NEW) - appears in your Next.js frontend dashboard

## Installation

1. **Upload the plugin folder** `wp-plugin-vercel-sync/` to `/wp-content/plugins/`
2. **Activate** the plugin in WordPress Admin → Plugins
3. **Configure Vercel sync** in WordPress Admin → Echo5 Leads → Settings

## Configuration

Go to **WordPress Admin → Echo5 Leads → Settings**

### Vercel API Sync (Required)

**Vercel API URL:** `https://echo5-digital-leads.vercel.app`  
**Vercel API Key:** `open_523e0520a0fd927169f2fb0a14099fb2`

Once these two fields are filled, the plugin will automatically send all captured leads to your Vercel backend.

### Testing

1. Submit an Elementor Pro form on your WordPress site
2. Check **WordPress Admin → Echo5 Leads → Leads** (should see lead)
3. Check your **Vercel frontend dashboard** at http://localhost:3000/leads or your production frontend (should also see lead)

If leads appear in WordPress but NOT in Vercel:
- Enable `WP_DEBUG` in `wp-config.php`
- Check `wp-content/debug.log` for messages like:
  - `Vercel API: Sending X fields to https://...`
  - `Vercel API Success: ...` or `Vercel API Error: ...`

## What Was Changed

### Added Files
- `oal_send_to_vercel_api()` function - Sends leads to Vercel backend
- Settings page fields for Vercel API URL and API Key

### Modified Functions
- `oal_handle_pro_elements_submission()` - Added `oal_send_to_vercel_api()` call
- `oal_handle_cf7_submission()` - Added `oal_send_to_vercel_api()` call  
- `oal_handle_elementor_submission()` - Added `oal_send_to_vercel_api()` call
- `oal_handle_lead_submission()` (REST API) - Added `oal_send_to_vercel_api()` call
- `oal_fb_fetch_and_ingest_lead()` (Facebook) - Added `oal_send_to_vercel_api()` call

### How It Works

```
Form Submission
      ↓
WordPress Hook (Elementor/CF7/etc.)
      ↓
oal_ingest_lead_array() → WordPress Database
      ↓
oal_send_to_vercel_api() → Vercel Backend API
                               ↓
                          MongoDB Atlas
                               ↓
                          Next.js Frontend
```

The plugin uses `wp_remote_post()` with a 5-second timeout to send leads to Vercel. If the API call fails, the lead is still saved to WordPress - Vercel sync is non-blocking.

## Supported Form Builders

- ✅ Elementor Pro Forms
- ✅ Contact Form 7
- ✅ Pro Elements Forms  
- ✅ Facebook Lead Ads
- ✅ REST API endpoint

All forms are automatically synced to Vercel when properly configured.

## API Payload Format

The plugin sends lead data to Vercel in this format:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+12345678901",
  "city": "Los Angeles",
  "source": "website",
  "form_id": "elementor_contact_form",
  "utm_source": "google",
  "utm_campaign": "spring2025",
  "elementor_field_name": "John",
  "elementor_field_label_name": "Your Name",
  ...
}
```

All form fields are preserved with their original keys (prefixed with `elementor_field_`, `cf7_`, `pro_field_`, etc.) so your 15-20 field forms will have all data captured.

## Troubleshooting

### Leads appear in WordPress but not Vercel

**Check settings:**
```
WordPress Admin → Echo5 Leads → Settings
- Vercel API URL: Must be filled
- Vercel API Key: Must be filled
```

**Enable debug logging:**
```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Then check `wp-content/debug.log` for Vercel API messages.

### HTTP errors in debug log

**"Vercel API Error: HTTP 401"** = Wrong API key  
**"Vercel API Error: HTTP 404"** = Wrong API URL or backend not deployed  
**"Vercel API Error: HTTP 400"** = Invalid payload format (contact developer)

### Backend not receiving leads

**Check backend is running:**
- Production: Visit `https://echo5-digital-leads.vercel.app/api/ingest/lead` (should return HTTP 400 "Bad request" - this is correct, means API is alive)
- Local: Visit `http://localhost:3001/api/ingest/lead` (same expected result)

**Verify API key matches:**
```bash
cd backend
node scripts/list-api-keys.js
```

The key shown must match what's in WordPress settings.

## Original Plugin Features (Preserved)

All existing functionality remains unchanged:
- WordPress database storage
- Lead management interface
- SLA breach notifications
- Facebook Lead Ads integration
- Spam filtering
- REST API endpoint
- Custom fields and meta storage

The only change is the **addition** of Vercel sync - nothing was removed or broken.

## Support

For Vercel API issues, check:
1. Backend logs in Vercel dashboard
2. WordPress debug.log
3. Frontend browser console (http://localhost:3000)

For WordPress plugin issues, check:
1. WordPress Admin → Echo5 Leads → Leads (local database)
2. wp-content/debug.log
3. Form builder settings (ensure hooks are enabled)
