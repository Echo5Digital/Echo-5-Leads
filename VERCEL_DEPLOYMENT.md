# Vercel Deployment Instructions

## Problem
The repo contains both a WordPress plugin (PHP) and a Node.js API (JavaScript). Vercel detects the PHP file in git and throws:
```
Error: Function Runtimes must have a valid version, for example `now-php@1.0.0`.
```

## Solution: Set Root Directory in Vercel

### Steps
1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **General**
3. Scroll to **Root Directory**
4. Set it to: `vercel-api`
5. Click **Save**
6. Trigger a new deployment

### What this does
- Vercel will only build from the `vercel-api` folder
- WordPress plugin files are completely outside the build context
- No PHP detection occurs
- Only Node.js functions under `vercel-api/api/` are deployed

### Endpoints after deployment
- `POST /api/ingest/lead` - Accepts leads with X-Tenant-Key header
- `GET /api/leads` - Lists leads (requires X-Tenant-Key)
- `GET /api/leads/:id` - Lead details
- `POST /api/leads/:id/activity` - Add activity

### Environment Variables (set in Vercel)
```
MONGODB_URI=mongodb+srv://...
MONGODB_DB=echo5_leads
E5D_API_KEY_PEPPER=<your-secret-pepper>
E5D_DEFAULT_PHONE_REGION=US
LOG_LEVEL=info
```

### After Deployment
1. Run the seed script locally (with env vars set):
   ```bash
   cd vercel-api
   npm run seed
   ```
   Copy the API Key it outputs.

2. Configure WordPress plugin:
   - Install `wp-plugin/echo5-leads-connector/` on your WordPress site
   - Go to Settings > Echo5 Leads
   - Set API Base URL: `https://your-vercel-domain.vercel.app`
   - Set Tenant API Key: `<key-from-seed-script>`
   - Click "Test Connection" to verify

### Alternative (Not Recommended)
You could remove the PHP file from git tracking, but keeping the WordPress plugin in the repo is useful for distribution. The Root Directory approach is cleaner.
