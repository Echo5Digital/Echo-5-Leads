// Backend API Server - Updated Jan 28, 2026.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb } from './src/lib/mongo.js';

// Routes
import ingestLeadRoute from './src/routes/ingest-lead.js';
import leadsRoute from './src/routes/leads.js';
import leadDetailRoute from './src/routes/lead-detail.js';
import leadActivityRoute, { protectedAddLeadActivity } from './src/routes/lead-activity.js';
import metaLeadsRoute from './src/routes/meta-leads.js';
import metaLeadDetailRoute from './src/routes/meta-lead-detail.js';
import metaLeadActivityRoute from './src/routes/meta-lead-activity.js';
import updateMetaLeadRoute from './src/routes/update-meta-lead.js';
import deleteMetaLeadRoute from './src/routes/delete-meta-lead.js';
import dashboardStatsRoute from './src/routes/dashboard-stats.js';
import updateLeadRoute from './src/routes/update-lead.js';
import deleteLeadRoute from './src/routes/delete-lead.js';
import exportLeadsRoute from './src/routes/export-leads.js';
import importLeadsCSVRoute from './src/routes/import-leads-csv.js';
import tenantConfigRoute from './src/routes/tenant-config.js';
import updateTenantConfigRoute from './src/routes/update-tenant-config.js';
import listTenantsRoute from './src/routes/list-tenants.js';
import createTenantRoute from './src/routes/create-tenant.js';
import getTenantRoute from './src/routes/get-tenant.js';
import updateTenantRoute from './src/routes/update-tenant.js';
import deleteTenantRoute from './src/routes/delete-tenant.js';
import listApiKeysRoute from './src/routes/list-api-keys.js';
import createApiKeyRoute from './src/routes/create-api-key.js';
import revokeApiKeyRoute from './src/routes/revoke-api-key.js';
import revealApiKeyRoute from './src/routes/reveal-api-key.js';
import slaOverdueRoute from './src/routes/sla-overdue.js';
import { verifyWebhook as metaVerifyWebhook, handleWebhook as metaHandleWebhook } from './src/routes/ingest-meta-lead.js';
import { handleGoogleLead } from './src/routes/ingest-google-lead.js';

// Foster Care Application routes
import fosterCareApplicationRoute from './src/routes/foster-care-application.js';
import fosterCareApplicationPdfRoute from './src/routes/foster-care-application-pdf.js';
import shareFosterApplicationRoute from './src/routes/share-foster-application.js';

// Auth routes
import loginRoute from './src/routes/auth-login.js';
import refreshTokenRoute from './src/routes/auth-refresh.js';
import { protectedLogout } from './src/routes/auth-logout.js';
import { protectedProfile } from './src/routes/auth-profile.js';
import { 
  protectedListUsers, 
  protectedCreateUser, 
  protectedUpdateUser, 
  protectedDeleteUser 
} from './src/routes/user-management.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins temporarily to fix CORS
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Tenant-Key', 'Authorization']
}));

// Additional CORS headers for preflight
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-Key, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes (public)
app.post('/api/auth/login', loginRoute);
app.post('/api/auth/refresh', refreshTokenRoute);
app.post('/api/auth/logout', ...protectedLogout);
app.get('/api/auth/profile', ...protectedProfile);

// User Management Routes (protected)
app.get('/api/users', ...protectedListUsers);
app.post('/api/users', ...protectedCreateUser);
app.put('/api/users/:userId', ...protectedUpdateUser);
app.delete('/api/users/:userId', ...protectedDeleteUser);

// API Routes
app.post('/api/ingest/lead', ingestLeadRoute);

// Meta (Facebook/Instagram) Lead Ads Webhook
app.get('/api/ingest/meta-lead', metaVerifyWebhook);
app.post('/api/ingest/meta-lead', metaHandleWebhook);

// Google Ads Lead Form Webhook
app.post('/api/ingest/google-lead', handleGoogleLead);

app.get('/api/leads', ...leadsRoute);
app.get('/api/leads/:id', ...leadDetailRoute);
app.post('/api/leads/:id/activity', ...protectedAddLeadActivity);
app.put('/api/leads/:id', ...updateLeadRoute);
app.delete('/api/leads/:id', deleteLeadRoute);

// Meta Leads Routes (Facebook/Meta Lead Ads)
app.get('/api/meta-leads', ...metaLeadsRoute);
app.get('/api/meta-leads/:id', ...metaLeadDetailRoute);
app.post('/api/meta-leads/:leadId/activity', metaLeadActivityRoute);
app.put('/api/meta-leads/:id', ...updateMetaLeadRoute);
app.delete('/api/meta-leads/:id', deleteMetaLeadRoute);

app.get('/api/dashboard/stats', ...dashboardStatsRoute);
app.get('/api/leads/export/csv', exportLeadsRoute);
app.post('/api/leads/import/csv', ...importLeadsCSVRoute);
app.get('/api/tenant/config', ...tenantConfigRoute);
app.put('/api/tenant/config', ...updateTenantConfigRoute);

// Tenant Management (Admin)
app.get('/api/tenants', ...listTenantsRoute);
app.post('/api/tenants', createTenantRoute);
app.get('/api/tenants/:id', getTenantRoute);
app.put('/api/tenants/:id', updateTenantRoute);
app.delete('/api/tenants/:id', deleteTenantRoute);

// API Key Management
app.get('/api/tenants/:id/api-keys', listApiKeysRoute);
app.post('/api/tenants/:id/api-keys', createApiKeyRoute);
app.get('/api/tenants/:tenantId/api-keys/:keyId/reveal', revealApiKeyRoute);
app.delete('/api/tenants/:tenantId/api-keys/:keyId', revokeApiKeyRoute);

// SLA Monitoring
app.get('/api/sla/overdue', slaOverdueRoute);

// Foster Care Application Routes
app.post('/api/foster-care-application', fosterCareApplicationRoute);
app.get('/api/foster-care-application/:id/pdf', fosterCareApplicationPdfRoute);
app.post('/api/share-foster-application', shareFosterApplicationRoute);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'internal_error', 
    details: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await getDb();
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
