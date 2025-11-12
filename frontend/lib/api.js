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

  // Add activity to lead
  async addActivity(leadId, data) {
    return apiRequest(`/api/leads/${leadId}/activity`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Ingest lead (for testing)
  async ingestLead(data) {
    return apiRequest('/api/ingest/lead', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

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
