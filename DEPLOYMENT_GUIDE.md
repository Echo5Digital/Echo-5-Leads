# Deployment Guide - Vercel

This guide walks through deploying both backend and frontend to Vercel.

## Prerequisites

- GitHub account
- Vercel account (sign up at vercel.com)
- MongoDB Atlas cluster set up
- API key from backend seed script

## Part 1: Deploy Backend

### Step 1: Prepare Backend

1. Ensure `backend/vercel.json` exists with correct configuration
2. Ensure all dependencies are listed in `backend/package.json`
3. Test locally first: `cd backend && npm run dev`

### Step 2: Push to GitHub

```bash
git add backend/
git commit -m "Add backend API"
git push origin main
```

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
cd backend
vercel
```

Follow prompts to link/create project.

#### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Set **Root Directory** to `backend`
5. Click "Deploy"

### Step 4: Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

```
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB = echo5_leads
E5D_API_KEY_PEPPER = your-long-random-string-keep-secret
CORS_ORIGINS = https://your-frontend.vercel.app
```

**Important**: After adding environment variables, redeploy:
```bash
vercel --prod
```

### Step 5: Test Backend

```bash
# Test health endpoint
curl https://your-backend.vercel.app/health

# Test with your API key
curl -X POST https://your-backend.vercel.app/api/ingest/lead \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Key: your_api_key" \
  -d '{"first_name":"Test","email":"test@example.com"}'
```

## Part 2: Deploy Frontend

### Step 1: Update Frontend Config

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
NEXT_PUBLIC_API_KEY=your_api_key_from_seed
```

### Step 2: Test Locally

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 and verify it connects to your Vercel backend.

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
cd frontend
vercel
```

#### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repository (or select same repo)
4. Set **Root Directory** to `frontend`
5. Click "Deploy"

### Step 4: Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

```
NEXT_PUBLIC_API_URL = https://your-backend.vercel.app
NEXT_PUBLIC_API_KEY = your_api_key_from_seed_script
```

**Important**: After adding environment variables, redeploy:
```bash
vercel --prod
```

### Step 5: Update Backend CORS

Go back to backend project and update `CORS_ORIGINS`:

```
CORS_ORIGINS = https://your-frontend.vercel.app
```

Redeploy backend after this change.

## Part 3: Verify Deployment

### 1. Test Backend Directly

```bash
curl https://your-backend.vercel.app/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### 2. Test Frontend

1. Visit `https://your-frontend.vercel.app`
2. Should see "Echo5 Leads Management" page
3. If you have leads, they should load
4. Check browser console for any errors

### 3. Test Full Flow

1. Ingest a test lead via API:
```bash
curl -X POST https://your-backend.vercel.app/api/ingest/lead \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Key: your_api_key" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "phone": "+13105551234",
    "city": "Los Angeles",
    "utm_source": "website"
  }'
```

2. Check frontend - new lead should appear
3. Click on lead to view details
4. Add an activity
5. Verify activity appears in timeline

## Common Issues

### Backend Issues

**Error: "Invalid API key"**
- Verify `NEXT_PUBLIC_API_KEY` in frontend matches a key in your database
- Check `E5D_API_KEY_PEPPER` is the same as when you ran seed script

**Error: "MongoDB connection failed"**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas network access allows Vercel IPs (or use 0.0.0.0/0)
- Ensure database user has read/write permissions

**CORS errors**
- Add frontend URL to `CORS_ORIGINS` in backend
- Redeploy backend after changing

### Frontend Issues

**Error: "Failed to fetch" or network errors**
- Verify `NEXT_PUBLIC_API_URL` points to your backend
- Check backend health endpoint is accessible
- Check browser console for CORS errors

**Empty lead list**
- Verify backend is deployed and accessible
- Check API key is correct
- Try ingesting a test lead
- Check browser network tab for failed requests

### General Debugging

1. **Check Vercel Logs**
   - Go to Vercel Dashboard → Project → Deployments → Click deployment → Logs

2. **Check Runtime Logs**
   - Go to Project → Logs tab to see real-time logs

3. **Test Locally First**
   - Always test locally before deploying
   - Use production-like environment variables

## Production Checklist

- [ ] Backend deployed and health check working
- [ ] Frontend deployed and loads correctly
- [ ] Environment variables configured for both
- [ ] CORS configured correctly
- [ ] MongoDB network access configured
- [ ] Test lead ingestion works
- [ ] Test frontend can list leads
- [ ] Test lead detail page works
- [ ] Test adding activities works
- [ ] API key secured (not in public code)
- [ ] Consider adding your domain (optional)

## Custom Domains (Optional)

### Add Domain to Backend
1. Go to Backend Project → Settings → Domains
2. Add your API domain (e.g., `api.yourdomain.com`)
3. Update DNS with provided values
4. Update frontend `NEXT_PUBLIC_API_URL`

### Add Domain to Frontend
1. Go to Frontend Project → Settings → Domains
2. Add your domain (e.g., `leads.yourdomain.com`)
3. Update DNS with provided values
4. Update backend `CORS_ORIGINS`

## Monitoring

- Set up Vercel Analytics (included free)
- Monitor Vercel logs for errors
- Check MongoDB Atlas metrics for database performance
- Consider setting up uptime monitoring (e.g., UptimeRobot)

## Updating

### Update Backend
```bash
cd backend
# Make changes
git commit -am "Update backend"
git push origin main
# Vercel auto-deploys on push
```

### Update Frontend
```bash
cd frontend
# Make changes
git commit -am "Update frontend"
git push origin main
# Vercel auto-deploys on push
```

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables
3. Test endpoints with curl
4. Check MongoDB Atlas logs
5. Review browser console errors
