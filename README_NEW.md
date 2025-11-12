# Echo5 Leads Management Platform

Complete lead management system with separate backend and frontend, both deployable to Vercel.

## Project Structure

```
Echo-5-Leads/
├── backend/           # Express.js API server
│   ├── index.js
│   ├── src/
│   │   ├── lib/
│   │   │   └── mongo.js
│   │   └── routes/
│   ├── scripts/
│   ├── vercel.json
│   └── README.md
├── frontend/          # Next.js application
│   ├── app/
│   ├── lib/
│   ├── public/
│   └── README.md
└── vercel-api/        # Old serverless implementation (deprecated)
```

## Quick Start

### Prerequisites
- Node.js 22.20.0 or higher
- MongoDB Atlas account
- Vercel account (for deployment)

### 1. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB credentials
npm run seed          # Create first tenant and API key
npm run dev           # Start on port 3001
```

### 2. Setup Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with backend URL and API key
npm run dev           # Start on port 3000
```

### 3. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Features

### Backend API
- ✅ Lead ingestion from forms
- ✅ Multi-tenant support with API keys
- ✅ Lead management (CRUD operations)
- ✅ Activity tracking
- ✅ Filtering and search
- ✅ Spam detection
- ✅ MongoDB with optimized indexes

### Frontend UI
- ✅ Lead list with filters and search
- ✅ Lead detail pages
- ✅ Activity timeline
- ✅ Add notes, calls, emails, SMS
- ✅ Stage management
- ✅ Responsive design

## Deployment to Vercel

### Deploy Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Install Vercel CLI (if not already installed):
```bash
npm i -g vercel
```

3. Deploy:
```bash
vercel
```

4. Set environment variables in Vercel dashboard:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `E5D_API_KEY_PEPPER`
   - `CORS_ORIGINS` (comma-separated, include your frontend URL)

### Deploy Frontend

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` (your backend URL from step above)
   - `NEXT_PUBLIC_API_KEY` (from backend seed script)

## API Endpoints

### POST /api/ingest/lead
Ingest a new lead from form submission.
- Header: `X-Tenant-Key: your_api_key`
- Body: `{ first_name, last_name, email, phone, city, utm_source, ... }`

### GET /api/leads
List leads with filters.
- Query params: `stage`, `source`, `spam_flag`, `q`, `date_from`, `date_to`, `page`, `limit`

### GET /api/leads/:id
Get single lead with activities.

### POST /api/leads/:id/activity
Add activity to lead.
- Body: `{ type: "note|call|email|sms|status_change", content: {...}, stage?: "..." }`

## Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=echo5_leads
E5D_API_KEY_PEPPER=your-long-random-string
PORT=3001
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=your_tenant_api_key
```

## Database Schema

### Collections

1. **tenants** - Organization/client data
2. **api_keys** - Authentication keys (hashed)
3. **leads** - Lead information
4. **activities** - Lead activity timeline

See `backend/src/lib/mongo.js` for full schema and indexes.

## Development

### Backend
```bash
cd backend
npm run dev          # Start with --watch mode
npm run seed         # Create tenant & API key
npm run test:ingest  # Test lead ingestion
```

### Frontend
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
```

## Testing Lead Ingestion

Use the test script or curl:

```bash
# Using test script
cd backend
export TEST_TENANT_KEY=your_api_key
npm run test:ingest

# Using curl
curl -X POST http://localhost:3001/api/ingest/lead \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Key: your_api_key" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+13105550123",
    "utm_source": "google"
  }'
```

## Stage Workflow

Leads progress through these stages:
1. **new** - Initial lead
2. **contacted** - First contact made
3. **qualified** - Lead qualified
4. **orientation** - In orientation
5. **application** - Application submitted
6. **home_study** - Home study in progress
7. **licensed** - Licensed
8. **placement** - Placement made
9. **not_fit** - Not a fit

## Support

For issues or questions:
- Backend issues: Check `backend/README.md`
- Frontend issues: Check `frontend/README.md`
- MongoDB issues: Verify connection string and network access
- Vercel deployment: Check environment variables and logs

## Company

Echo5 Digital — https://www.echo5digital.com
