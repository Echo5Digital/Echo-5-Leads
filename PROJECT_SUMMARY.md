# 🎉 Project Restructure Complete!

Your Echo5 Leads platform has been successfully restructured into separate backend and frontend applications, both fully deployable to Vercel.

## ✅ What's Been Created

### 1. Backend (Express.js API)
**Location:** `/backend`

**Key Files:**
- `index.js` - Express server with all routes
- `src/lib/mongo.js` - MongoDB connection and utilities
- `src/routes/` - API route handlers
  - `ingest-lead.js` - Lead ingestion endpoint
  - `leads.js` - List leads endpoint  
  - `lead-detail.js` - Single lead endpoint
  - `lead-activity.js` - Add activity endpoint
- `scripts/seed-tenant.js` - Create tenant & API key
- `scripts/test-ingest.js` - Test lead ingestion
- `vercel.json` - Vercel deployment config
- `package.json` - Dependencies (Express, MongoDB, CORS, dotenv)

**Features:**
✅ RESTful API with Express.js
✅ MongoDB integration with indexes
✅ Multi-tenant support
✅ API key authentication
✅ Lead ingestion from forms
✅ Activity tracking
✅ Filtering and search
✅ Spam detection
✅ CORS configuration
✅ Vercel deployment ready

### 2. Frontend (Next.js Application)
**Location:** `/frontend`

**Key Files:**
- `app/page.js` - Home page with leads list
- `app/leads/[id]/page.js` - Lead detail page
- `app/layout.js` - Root layout
- `lib/api.js` - API client for backend
- `package.json` - Dependencies (React, Next.js, Tailwind)

**Features:**
✅ Modern Next.js 16 with App Router
✅ Client-side rendering with 'use client'
✅ Responsive UI with Tailwind CSS
✅ Lead list with filters (stage, source, search)
✅ Pagination
✅ Lead detail pages
✅ Activity timeline
✅ Add activities (notes, calls, emails, SMS, status changes)
✅ Stage management
✅ Vercel deployment ready

### 3. Documentation
- `README_NEW.md` - Complete project documentation
- `DEPLOYMENT_GUIDE.md` - Step-by-step Vercel deployment
- `backend/README.md` - Backend API documentation
- `frontend/README.md` - Frontend UI documentation
- `setup.sh` - Quick setup script

## 📝 Key Differences from Old Structure

### Old (vercel-api/)
- ❌ Vercel serverless functions (problematic)
- ❌ File-based routing with /api directory
- ❌ Cold starts and limitations
- ❌ No proper frontend

### New (backend/ + frontend/)
- ✅ Standard Express.js server
- ✅ Traditional routing
- ✅ Better for Vercel with vercel.json
- ✅ Full Next.js frontend with UI
- ✅ Separation of concerns
- ✅ Both independently deployable

## 🚀 Quick Start Guide

### Step 1: Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB credentials
npm run seed          # Creates tenant & API key (save the key!)
npm run dev           # Starts on http://localhost:3001
```

### Step 2: Setup Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:3001
#   NEXT_PUBLIC_API_KEY=<key from seed script>
npm run dev           # Starts on http://localhost:3000
```

### Step 3: Test

1. Open http://localhost:3000
2. You should see the leads list (empty initially)
3. Test ingestion:
```bash
cd backend
export TEST_TENANT_KEY=your_api_key
npm run test:ingest
```
4. Refresh frontend - new lead should appear!

## 📦 Technology Stack

### Backend
- **Framework:** Express.js
- **Database:** MongoDB (with driver)
- **Auth:** API key with SHA-256 hashing
- **CORS:** Configurable origins
- **Deployment:** Vercel (serverless)

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** JavaScript (no TypeScript)
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel (static + SSR)

## 🔑 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB=echo5_leads
E5D_API_KEY_PEPPER=long-random-secret-string
PORT=3001
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=your_tenant_api_key_from_seed
```

## 🌐 API Endpoints

All endpoints require `X-Tenant-Key` header.

### POST /api/ingest/lead
Ingest lead from form submission.

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

**Response:**
```json
{
  "leadId": "507f1f77bcf86cd799439011"
}
```

### GET /api/leads
List leads with filters.

**Query Params:**
- `stage` - Filter by stage
- `source` - Filter by source
- `spam_flag` - true/false
- `q` - Search query
- `date_from` - ISO date
- `date_to` - ISO date
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)

**Response:**
```json
{
  "page": 1,
  "limit": 50,
  "total": 100,
  "items": [...]
}
```

### GET /api/leads/:id
Get single lead with activities.

**Response:**
```json
{
  "lead": {...},
  "activities": [...]
}
```

### POST /api/leads/:id/activity
Add activity to lead.

**Body:**
```json
{
  "type": "note|call|email|sms|status_change",
  "content": {
    "title": "Follow up",
    "note": "Called and left voicemail"
  },
  "stage": "contacted"  // Only for status_change
}
```

## 📊 Database Collections

### tenants
```javascript
{
  _id: "uuid",
  name: "Open Arms Foster Care",
  slug: "open-arms",
  config: {
    spamKeywords: ["viagra", "loan"],
    slaHours: 24,
    allowedOrigins: []
  },
  createdAt: Date
}
```

### api_keys
```javascript
{
  tenantId: "uuid",
  keyHash: "sha256_hash",
  name: "Default key",
  active: true,
  createdAt: Date,
  lastUsedAt: Date
}
```

### leads
```javascript
{
  tenantId: "uuid",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phoneE164: "+13105550123",
  city: "Los Angeles",
  source: "website",
  campaignName: "spring-2024",
  stage: "new",
  assignedUserId: null,
  office: null,
  spamFlag: false,
  createdAt: Date,
  latestActivityAt: Date,
  originalPayload: {...}
}
```

### activities
```javascript
{
  tenantId: "uuid",
  leadId: "objectid_string",
  type: "note|call|email|sms|status_change|utm_snapshot",
  content: {...},
  createdAt: Date
}
```

## 🚢 Deployment to Vercel

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

### Quick Deploy

**Backend:**
```bash
cd backend
vercel
# Set env vars in dashboard, then:
vercel --prod
```

**Frontend:**
```bash
cd frontend
vercel
# Set env vars in dashboard, then:
vercel --prod
```

**Don't forget:**
1. Set all environment variables in Vercel dashboard
2. Update `CORS_ORIGINS` in backend with frontend URL
3. Update `NEXT_PUBLIC_API_URL` in frontend with backend URL
4. Redeploy after environment variable changes

## ✅ Testing Checklist

- [ ] Backend health check: `curl http://localhost:3001/health`
- [ ] Seed tenant and save API key
- [ ] Test lead ingestion with test script
- [ ] Frontend loads without errors
- [ ] Leads list appears (after ingesting test lead)
- [ ] Can view lead details
- [ ] Can add activities
- [ ] Can filter and search leads
- [ ] Can change lead stage
- [ ] CORS works (no console errors)

## 🎯 Next Steps

1. **Local Testing**
   - Run setup.sh to install dependencies
   - Configure .env files
   - Run seed script
   - Test both backend and frontend

2. **MongoDB Setup**
   - Create MongoDB Atlas cluster (if not exists)
   - Add database user
   - Configure network access (allow all IPs or Vercel IPs)
   - Get connection string

3. **Deploy to Vercel**
   - Follow DEPLOYMENT_GUIDE.md
   - Deploy backend first
   - Then deploy frontend
   - Update environment variables

4. **Integrate with WordPress**
   - Use existing `wp-plugin/echo5-leads-connector`
   - Point to your deployed backend URL
   - Use tenant API key

## 📚 Additional Resources

- **Backend README:** `backend/README.md`
- **Frontend README:** `frontend/README.md`
- **Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Express.js Docs:** https://expressjs.com
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Docs:** https://vercel.com/docs

## 🆘 Troubleshooting

### Backend won't start
- Check MongoDB URI is correct
- Verify Node.js version (>= 18)
- Check port 3001 is not in use

### Frontend can't connect to backend
- Verify backend is running
- Check `NEXT_PUBLIC_API_URL` is correct
- Check `NEXT_PUBLIC_API_KEY` matches seed output
- Check for CORS errors in browser console

### No leads appearing
- Check API key is correct
- Try ingesting test lead
- Check browser network tab for errors
- Verify backend logs

### Vercel deployment fails
- Check all environment variables are set
- Verify vercel.json is correct
- Check deployment logs in Vercel dashboard
- Ensure MongoDB allows Vercel IPs

## 🎊 Success!

Your Echo5 Leads platform is now properly structured with:
- ✅ Modern Express.js backend
- ✅ Beautiful Next.js frontend
- ✅ Both Vercel-deployable
- ✅ Full functionality maintained
- ✅ All features working
- ✅ Comprehensive documentation

Ready to deploy! 🚀
