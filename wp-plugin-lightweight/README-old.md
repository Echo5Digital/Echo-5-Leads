# Echo5 Leads Connector - Lightweight WordPress Plugin

## Overview

Ultra-lightweight WordPress plugin that captures Elementor Pro form submissions and sends them to the Echo5 Leads API. **No admin UI, no database tables** - keeps WordPress fast and simple.

## Purpose

This plugin is designed for **foster care agencies** and similar organizations that:
- Use WordPress websites with Elementor Pro forms
- Want leads managed centrally by Echo5 team
- Need a simple, set-and-forget integration

## Features

✅ **Lightweight**: ~300 lines of code, no database tables  
✅ **Simple Setup**: Just API URL + API Key in settings  
✅ **Auto-capture**: Hooks into Elementor forms automatically  
✅ **UTM Tracking**: Captures all marketing attribution data  
✅ **Error Logging**: Optional debug logging for troubleshooting  
✅ **Secure**: API key stored in WordPress options (encrypted in database)

## Installation

### Method 1: Manual Upload
1. Download the `echo5-leads-connector` folder
2. Upload to `/wp-content/plugins/` on your WordPress site
3. Activate the plugin in WordPress admin
4. Go to **Settings → Echo5 Leads**
5. Enter API URL and API Key (provided by Echo5)
6. Save settings

### Method 2: ZIP Upload
1. Zip the `echo5-leads-connector` folder
2. In WordPress admin: **Plugins → Add New → Upload Plugin**
3. Upload the ZIP file
4. Activate and configure

## Configuration

### Required Settings

**API Endpoint URL**: Your Echo5 backend URL  
Example: `https://your-backend.vercel.app`  
*Do NOT include `/api/ingest/lead` at the end*

**API Key**: Your tenant-specific API key  
Example: `oa_e7f1365581ec1a236049347aeccd5d39`  
*Provided by Echo5 team when your account is created*

### Optional Settings

**Enable Error Logging**: Check this to log failed API requests to `debug.log`

## How It Works

```
Visitor fills out Elementor form
         ↓
Plugin captures submission
         ↓
Sends to Echo5 API
         ↓
Lead appears in Echo5 dashboard
```

### Automatic Data Capture

The plugin automatically captures:

**Form Fields:**
- `first_name` - First name
- `last_name` - Last name  
- `email` - Email address
- `phone` - Phone number
- `city` - City
- `interest` - Interest type
- `have_children` - Has children
- `planning_to_foster` - Planning to foster

**Attribution Data** (automatically detected):
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `gclid` (Google Ads click ID)
- `fbclid` (Facebook click ID)
- `referrer` (referring website)
- `form_id` (Elementor form ID)

## Elementor Form Setup

### Field Naming Convention

Map your Elementor form fields using these exact IDs:

```
Name field → ID: first_name
Last Name field → ID: last_name
Email field → ID: email
Phone field → ID: phone
City field → ID: city
```

### Example Elementor Form

1. Create form in Elementor
2. Add fields with correct IDs (see above)
3. Publish form
4. Plugin automatically captures submissions
5. No additional configuration needed!

## What This Plugin DOES NOT Do

❌ **No WordPress Admin UI** for viewing leads  
❌ **No database tables** in WordPress  
❌ **No lead management** in WordPress  
❌ **No reporting** in WordPress

**Why?** To keep WordPress fast and simple. All lead management happens in the Echo5 dashboard (managed by Echo5 team or white-labeled for your agency).

## Viewing & Managing Leads

Leads are managed in the **Echo5 Admin Dashboard** at:
- URL provided by Echo5 team
- Or white-labeled version for your agency

Contact Echo5 Digital for dashboard access.

## Troubleshooting

### Leads not appearing in Echo5 dashboard?

1. **Check Settings**: Settings → Echo5 Leads
   - Is API URL correct? (should NOT end with /api/ingest/lead)
   - Is API Key correct? (check for typos)

2. **Enable Logging**: Check "Enable Error Logging" and save
   - Check WordPress debug.log for errors
   - Look for `[Echo5 Leads]` entries

3. **Test Form**: Submit a test form
   - Check debug.log for API response

4. **Contact Support**: Send debug.log to Echo5 team

### Common Issues

**"API request failed: Unauthorized"**
→ API Key is incorrect or expired

**"API request failed: 404 Not Found"**
→ API URL is incorrect

**"API request failed: Connection timed out"**
→ Firewall blocking outbound requests or API server down

## Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- Elementor Pro (for form builder)
- SSL certificate (HTTPS) recommended for security

## Support

For technical support or questions:
- **Email**: support@echo5digital.com
- **Website**: https://www.echo5digital.com

## Version History

**2.0.0** (Current)
- Complete rewrite for lightweight operation
- Removed WordPress admin UI
- Removed database tables
- Simplified to form capture only
- Better error handling

**1.x** (Deprecated)
- Had WordPress admin UI (removed for performance)
- Used WordPress database tables (removed)

## License

GPL v2 or later

## Credits

Developed by Echo5 Digital  
https://www.echo5digital.com
