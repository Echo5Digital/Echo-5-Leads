# Quick Installation Guide

## Step 1: Install the Plugin

1. **Copy the plugin folder** to WordPress:
   ```
   wp-plugin-vercel-sync/ → /wp-content/plugins/echo5-leads-vercel-sync/
   ```

2. **Activate the plugin:**
   - WordPress Admin → Plugins
   - Find "Echo5 Leads Manager with Vercel Sync"
   - Click "Activate"

## Step 2: Configure Vercel Sync

1. Go to **WordPress Admin → Echo5 Leads → Settings**

2. Fill in the **Vercel API Sync** section:
   ```
   Vercel API URL: https://echo5-digital-leads.vercel.app
   Vercel API Key: open_523e0520a0fd927169f2fb0a14099fb2
   ```

3. Click **Save Settings**

4. You should see: ✅ **Vercel sync is enabled**

## Step 3: Test

1. **Submit a form** on your WordPress site (Elementor Pro, Contact Form 7, etc.)

2. **Check WordPress:**
   - Go to WordPress Admin → Echo5 Leads → Leads
   - Lead should appear in the list

3. **Check Vercel Frontend:**
   - Go to http://localhost:3000/leads (local dev) or your production frontend
   - Lead should appear in the dashboard

## Troubleshooting

### Leads don't appear in Vercel

**Enable debug logging:**

Edit `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

**Check logs:**
```
wp-content/debug.log
```

Look for messages like:
- `Vercel API: Sending 12 fields to https://...`
- `Vercel API Success: ...` (good!)
- `Vercel API Error: HTTP 401` (wrong API key)
- `Vercel API Error: HTTP 404` (wrong URL or backend down)

### Backend API not responding

**Check backend is running:**

**Local:**
```bash
cd backend
npm run dev
```

**Production:** Visit Vercel dashboard to check deployment status

### Wrong API key error

**List your API keys:**
```bash
cd backend
node scripts/list-api-keys.js
```

Copy the correct key to WordPress settings.

## Next Steps

Once working:
1. Disable other lead capture plugins (if any) to avoid duplicates
2. Configure SLA notifications (optional)
3. Set up Facebook Lead Ads integration (optional)
4. Customize spam filter keywords (optional)

## Support

- **WordPress plugin issues:** Check wp-content/debug.log
- **Vercel API issues:** Check Vercel dashboard logs
- **Frontend issues:** Check browser console at http://localhost:3000
