import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

async function apiRequest(endpoint, options = {}) {
  const token = Cookies.get('accessToken');
  
  // Admin operations (when user is authenticated) - don't send API key
  // This allows SuperAdmin to create tenants and manage all clients
  const isAdminOperation = token && (
    endpoint.includes('/api/tenants') ||
    endpoint.includes('/api/users') ||
    endpoint.includes('/api/auth') ||
    endpoint.includes('/api/dashboard') || // Dashboard stats should use token
    endpoint.includes('/api/tenant') || // Tenant config should use token
    endpoint.startsWith('/api/leads') ||  // Include all leads operations for proper authentication
    endpoint.includes('/api/share-foster-application')  // Share form functionality
  );
  
  const headers = {
    'Content-Type': 'application/json',
    // Only send API key for non-admin operations (WordPress plugin compatibility)
    ...(!isAdminOperation && API_KEY && { 'X-Tenant-Key': API_KEY }),
    ...(token && { Authorization: `Bearer ${token}` }),
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
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    const query = queryParams.toString();
    
    console.log('API: Making request with params:', params); // Debug log
    console.log('API: Query string:', query); // Debug log
    
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

  // Delete lead
  async deleteLead(id) {
    return apiRequest(`/api/leads/${id}`, {
      method: 'DELETE',
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
  async getDashboardStats(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/dashboard/stats${query ? `?${query}` : ''}`);
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
  async getTenantConfig(tenantId = null) {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return apiRequest(`/api/tenant/config${query}`);
  },

  // Update tenant configuration
  async updateTenantConfig(data, tenantId = null) {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return apiRequest(`/api/tenant/config${query}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Import leads from CSV
  async importCSV(csvData, tenantId = null) {
    const body = {
      csvData,
      ...(tenantId && { tenantId })
    };
    return apiRequest('/api/leads/import/csv', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Send foster care application form to lead
  async sendFormToLead(recipientEmail, recipientName, message = '') {
    const formUrl = `${window.location.origin}/foster-care-application`;
    return apiRequest('/api/share-foster-application', {
      method: 'POST',
      body: JSON.stringify({
        recipientEmail,
        recipientName,
        message,
        formUrl
      }),
    });
  },
};

// Meta Leads API (Facebook/Meta Lead Ads)
export const metaLeadsApi = {
  // List meta leads with filters
  async getMetaLeads(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    const query = queryParams.toString();
    
    return apiRequest(`/api/meta-leads${query ? `?${query}` : ''}`);
  },

  // Get single meta lead with activities
  async getMetaLead(id) {
    return apiRequest(`/api/meta-leads/${id}`);
  },

  // Update meta lead
  async updateMetaLead(id, data) {
    return apiRequest(`/api/meta-leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete meta lead
  async deleteMetaLead(id) {
    return apiRequest(`/api/meta-leads/${id}`, {
      method: 'DELETE',
    });
  },

  // Add activity to meta lead
  async addActivity(leadId, data) {
    return apiRequest(`/api/meta-leads/${leadId}/activity`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Special API function for viewing specific client's data (SuperAdmin only)
async function apiRequestWithTenant(endpoint, tenantId = null, options = {}) {
  const token = Cookies.get('accessToken');
  
  // Admin operations (when user is authenticated) - don't send API key
  const isAdminOperation = token && (
    endpoint.includes('/api/tenants') ||
    endpoint.includes('/api/users') ||
    endpoint.includes('/api/auth') ||
    endpoint.includes('/api/leads')  // Include leads for tenant filtering
  );
  
  const headers = {
    'Content-Type': 'application/json',
    // Only send API key for non-admin operations
    ...(!isAdminOperation && API_KEY && { 'X-Tenant-Key': API_KEY }),
    ...(token && { Authorization: `Bearer ${token}` }),
    // Add tenant-specific context for SuperAdmin operations
    ...(tenantId && { 'X-Admin-Tenant-Filter': tenantId }),
    ...options.headers,
  };

  // Add tenantId as query parameter for SuperAdmin filtering
  let url = `${API_URL}${endpoint}`;
  if (tenantId && !endpoint.includes('?')) {
    url += `?tenantId=${tenantId}`;
  } else if (tenantId && endpoint.includes('?')) {
    url += `&tenantId=${tenantId}`;
  }

  console.log('API Request URL:', url); // Debug log
  console.log('Headers:', headers); // Debug log

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

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

// User Management API
export const usersApi = {
  // List users (SuperAdmin can pass tenantId)
  async listUsers(tenantId = null) {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return apiRequest(`/api/users${query}`);
  },

  // Create new user
  async createUser(data) {
    return apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update user
  async updateUser(userId, data) {
    return apiRequest(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete/deactivate user
  async deleteUser(userId) {
    return apiRequest(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },
};
