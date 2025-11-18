'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tenantsApi } from '@/lib/api';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    slaHours: 24,
  });

  function handleChange(field, value) {
    setFormData({ ...formData, [field]: value });
    
    // Auto-generate slug from name
    if (field === 'name' && !formData.slug) {
      const autoSlug = value.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData({ ...formData, name: value, slug: autoSlug });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.name || !formData.slug) {
      setError('Name and slug are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await tenantsApi.createTenant({
        name: formData.name,
        slug: formData.slug,
        slaHours: parseInt(formData.slaHours),
      });
      
      setApiKey(result.apiKey);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (apiKey) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Client Created Successfully!</h1>
              <p className="text-gray-600">Save the API key below - it will only be shown once</p>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key (Save This Now!)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  className="flex-1 px-4 py-2 border-2 border-yellow-300 rounded-md bg-white font-mono text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    alert('API key copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition"
                >
                  Copy
                </button>
              </div>
              <p className="mt-2 text-xs text-yellow-800">
                ⚠️ <strong>Important:</strong> This key cannot be retrieved again. Save it securely.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Client Name:</span>
                <span className="font-medium">{formData.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Slug:</span>
                <span className="font-mono text-sm">{formData.slug}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">SLA Hours:</span>
                <span className="font-medium">{formData.slaHours}h</span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Link
                href="/clients"
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-center rounded-md hover:bg-gray-300 transition"
              >
                Back to Clients
              </Link>
              <button
                onClick={() => router.push(`/clients`)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Client</h1>
          <p className="mt-2 text-gray-600">Create a new client organization</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Openarms Foster Care"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  The display name for this client organization
                </p>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="e.g., openarms-foster-care"
                  pattern="[a-z0-9-]+"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  URL-friendly identifier (lowercase, hyphens only). Used in API keys.
                </p>
              </div>

              {/* SLA Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SLA Response Time (hours)
                </label>
                <input
                  type="number"
                  value={formData.slaHours}
                  onChange={(e) => handleChange('slaHours', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Target time to make first contact with new leads
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Default stages and empty user list will be created. You can configure these later in the client details page.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <Link
                href="/clients"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
