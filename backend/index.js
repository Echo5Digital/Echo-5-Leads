import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb } from './src/lib/mongo.js';

// Routes
import ingestLeadRoute from './src/routes/ingest-lead.js';
import leadsRoute from './src/routes/leads.js';
import leadDetailRoute from './src/routes/lead-detail.js';
import leadActivityRoute from './src/routes/lead-activity.js';
import dashboardStatsRoute from './src/routes/dashboard-stats.js';
import updateLeadRoute from './src/routes/update-lead.js';
import exportLeadsRoute from './src/routes/export-leads.js';
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
import analyticsOverviewRoute from './src/routes/analytics-overview.js';
import { verifyWebhook as metaVerifyWebhook, handleWebhook as metaHandleWebhook } from './src/routes/ingest-meta-lead.js';
import { handleGoogleLead } from './src/routes/ingest-google-lead.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/api/ingest/lead', ingestLeadRoute);

// Meta (Facebook/Instagram) Lead Ads Webhook
app.get('/api/ingest/meta-lead', metaVerifyWebhook);
app.post('/api/ingest/meta-lead', metaHandleWebhook);

// Google Ads Lead Form Webhook
app.post('/api/ingest/google-lead', handleGoogleLead);

app.get('/api/leads', leadsRoute);
app.get('/api/leads/:id', leadDetailRoute);
app.post('/api/leads/:id/activity', leadActivityRoute);
app.put('/api/leads/:id', updateLeadRoute);
app.get('/api/dashboard/stats', dashboardStatsRoute);
app.get('/api/leads/export/csv', exportLeadsRoute);
app.get('/api/tenant/config', tenantConfigRoute);
app.put('/api/tenant/config', updateTenantConfigRoute);

// Tenant Management (Admin)
app.get('/api/tenants', listTenantsRoute);
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

// Analytics & Reporting
app.get('/api/analytics/overview', analyticsOverviewRoute);

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
