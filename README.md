Echo5 Digital Leads Platform (WordPress + Vercel + MongoDB)

Overview
- Lightweight WordPress plugin forwards form submissions asynchronously to a Vercel serverless API.
- Vercel API (Node/TypeScript) stores and manages leads in MongoDB Atlas.
- Multi-tenant via per-tenant API keys (X-Tenant-Key) and tenantId isolation in all collections.

Key endpoints (Vercel)
- POST /api/ingest/lead
  - Auth: header X-Tenant-Key: <tenant-api-key>
  - Body fields (snake_case):
    - first_name, last_name, email, phone, city, notes?, form_id?, campaign_name?, source?
    - utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content?, gclid?, fbclid?, referrer?
    - original_payload? (object)
- GET /api/leads
  - Query: stage?, source?, spam_flag?=true|false, q?, date_from?, date_to?, page?=1, limit?=50
- GET /api/leads/:id
- POST /api/leads/:id/activity
  - Body: { type: "note"|"call"|"email"|"sms"|"status_change", content: object, stage? (when type=status_change) }

Headers & constants
- Auth header: X-Tenant-Key
- Default phone region (for E.164 normalization): E5D_DEFAULT_PHONE_REGION (default: US)
- Stage enum: new, contacted, qualified, orientation, application, home_study, licensed, placement, not_fit

Environment variables (.env on Vercel)
- MONGODB_URI=mongodb+srv://...
- MONGODB_DB=echo5_leads
- E5D_API_KEY_PEPPER=<long-random-string>
- E5D_DEFAULT_PHONE_REGION=US
- LOG_LEVEL=info

Collections & indexes (MongoDB)
- tenants: { _id: string, name, slug, config: { spamKeywords: string[], slaHours: number, allowedOrigins: string[] }, createdAt }
- api_keys: { _id, tenantId: string, keyHash: sha256(key+pepper), name, active, createdAt, lastUsedAt }
  - Indexes: keyHash (1), tenantId+active
- leads: { _id: ObjectId, tenantId: string, firstName, lastName, email, phoneE164, city, source, campaignName, stage, assignedUserId, office, spamFlag, createdAt, latestActivityAt, originalPayload }
  - Indexes: {tenantId, email} unique (partial), {tenantId, phoneE164} unique (partial), {tenantId, createdAt}, {tenantId, stage, latestActivityAt}
- activities: { _id, tenantId: string, leadId: ObjectId, type, content, createdAt }
  - Indexes: {tenantId, leadId, createdAt}

WordPress plugin (Echo5 Leads Connector)
- Settings (Options > Echo5 Leads):
  - API Base URL (e.g., https://leads.echo5digital.com)
  - Tenant API Key
- Hooks supported:
  - Elementor: elementor_pro/forms/new_record
  - Contact Form 7: wpcf7_mail_sent
  - MetForm: metform_after_form_submit
- Behavior: Build small JSON and send with wp_remote_post(..., ['timeout'=>0.01, 'blocking'=>false]) to /api/ingest/lead with X-Tenant-Key.

Development quick start
- Vercel API
  1) Create MongoDB Atlas cluster and set MONGODB_URI/MONGODB_DB in Vercel project.
  2) Deploy /vercel-api. Use scripts/seed-tenant.ts to create first tenant + API key.
  3) Configure WordPress plugin with API Base URL and Tenant API Key.

- WordPress plugin
  1) Copy wp-plugin/echo5-leads-connector folder into wp-content/plugins/ on the site.
  2) Activate plugin, go to Settings > Echo5 Leads.
  3) Enter API Base and Tenant Key.

Naming conventions
- API fields: snake_case for incoming payload, normalized to camelCase in DB.
- Headers: case-insensitive but documented as X-Tenant-Key.
- Constants placed in vercel-api/src/lib/constants.ts.

Company
- Echo5 Digital — https://www.echo5digital.com
