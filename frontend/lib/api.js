const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-Key': API_KEY,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

export const leadsApi = {
  // List leads with filters
  async getLeads(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const query = queryParams.toString();
    return apiRequest(`/api/leads${query ? `?${query}` : ''}`);
  },

  // Get single lead with activities
  async getLead(id) {
    return apiRequest(`/api/leads/${id}`);
  },

  // Update lead
  async updateLead(id, data) {
    return apiRequest(`/api/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Add activity to lead
  async addActivity(leadId, data) {
    return apiRequest(`/api/leads/${leadId}/activity`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Ingest lead (for testing or manual add)
  async ingestLead(data) {
    return apiRequest('/api/ingest/lead', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get dashboard stats
  async getDashboardStats() {
    return apiRequest('/api/dashboard/stats');
  },

  // Export leads as CSV
  exportLeadsUrl(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const query = queryParams.toString();
    return `${API_URL}/api/leads/export/csv${query ? `?${query}` : ''}`;
  },

  // Get tenant configuration
  async getTenantConfig() {
    return apiRequest('/api/tenant/config');
  },

  // Update tenant configuration
  async updateTenantConfig(data) {
    return apiRequest('/api/tenant/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Tenant Management API (Admin)
export const tenantsApi = {
  // List all tenants
  async listTenants() {
    return apiRequest('/api/tenants');
  },

  // Get specific tenant
  async getTenant(id) {
    return apiRequest(`/api/tenants/${id}`);
  },

  // Create new tenant
  async createTenant(data) {
    return apiRequest('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update tenant
  async updateTenant(id, data) {
    return apiRequest(`/api/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete tenant
  async deleteTenant(id) {
    return apiRequest(`/api/tenants/${id}`, {
      method: 'DELETE',
    });
  },
};

// Default stages (fallback if tenant config not loaded)
export const STAGES = [
  'new',
  'contacted',
  'qualified',
  'orientation',
  'application',
  'home_study',
  'licensed',
  'placement',
  'not_fit',
];
