# Echo5 Leads Backend

Express.js backend API for Echo5 Leads Management Platform.

## Features

- RESTful API for lead management
- MongoDB integration with indexes
- Multi-tenant support via API keys
- Lead ingestion from forms
- Activity tracking
- Spam detection

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Set up your MongoDB connection and other environment variables in `.env`

4. Seed your first tenant:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### POST /api/ingest/lead
Ingest a new lead from a form submission.

**Headers:**
- `X-Tenant-Key`: Your tenant API key

**Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+13105550123",
  "city": "Los Angeles",
  "utm_source": "google",
  "utm_campaign": "spring-2024",
  "form_id": "contact-form"
}
```

### GET /api/leads
List leads with filtering and pagination.

**Query Parameters:**
- `stage`: Filter by stage
- `source`: Filter by source
- `spam_flag`: true/false
- `q`: Search query
- `date_from`: ISO date string
- `date_to`: ISO date string
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

### GET /api/leads/:id
Get a single lead with activities.

### POST /api/leads/:id/activity
Add an activity to a lead.

**Body:**
```json
{
  "type": "note",
  "content": {
    "title": "Follow up",
    "note": "Called lead, left voicemail"
  }
}
```

**Activity Types:**
- `note`
- `call`
- `email`
- `sms`
- `status_change` (include `stage` field)

## Deployment to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
- MONGODB_URI
- MONGODB_DB
- E5D_API_KEY_PEPPER
- CORS_ORIGINS

## Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB`: Database name
- `E5D_API_KEY_PEPPER`: Secret for API key hashing
- `PORT`: Server port (default: 3001)
- `CORS_ORIGINS`: Comma-separated list of allowed origins

## Testing

```bash
# Set your test API key
export TEST_TENANT_KEY=your_api_key

# Run test
npm run test:ingest
```
