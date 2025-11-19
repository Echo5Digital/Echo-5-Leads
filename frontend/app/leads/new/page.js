'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { leadsApi, tenantsApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    interest: '',
    have_children: '',
    planning_to_foster: '',
    source: '',
    campaign_name: '',
    office: '',
    notes: '',
  });

  const handleChange = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  // Load tenants for SuperAdmin users
  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadTenants();
    }
  }, [user]);

  async function loadTenants() {
    try {
      const data = await tenantsApi.listTenants();
      setTenants(data.tenants || []);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation for SuperAdmin client selection
    if (user?.role === 'super_admin' && !selectedTenant) {
      setError('Please select which client this lead belongs to');
      setLoading(false);
      return;
    }

    if (!formData.first_name && !formData.last_name) {
      setError('Please provide at least a first name or last name');
      setLoading(false);
      return;
    }

    if (!formData.email && !formData.phone) {
      setError('Please provide either an email or phone number');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        city: formData.city || undefined,
        interest: formData.interest || undefined,
        campaign_name: formData.campaign_name || undefined,
        office: formData.office || undefined,
        source: formData.source || 'manual',
        notes: formData.notes || undefined,
        // Add tenantId for SuperAdmin users
        ...(user?.role === 'super_admin' && selectedTenant && { tenantId: selectedTenant }),
      };

      console.log('Frontend: Submitting lead with payload:', payload);
      console.log('Frontend: User role:', user?.role);
      console.log('Frontend: Selected tenant:', selectedTenant);

      // Add boolean fields if specified
      if (formData.have_children !== '') {
        payload.have_children = formData.have_children === 'true';
      }
      if (formData.planning_to_foster !== '') {
        payload.planning_to_foster = formData.planning_to_foster === 'true';
      }

      const result = await leadsApi.ingestLead(payload);
      router.push('/leads');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Lead</h1>
            <p className="mt-2 text-gray-600">Manually add a new lead to the system</p>
          </div>
          <Link
            href="/leads"
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
          >
            ← Back to Leads
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Client Selection - SuperAdmin Only */}
        {user?.role === 'super_admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Client <span className="text-red-600">*</span>
            </label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose which client this lead belongs to...</option>
              {tenants.map((tenant) => (
                <option key={tenant._id} value={tenant._id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            {!selectedTenant && (
              <p className="text-sm text-gray-600 mt-2">
                💡 As SuperAdmin, you must select which client this lead belongs to
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter first name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter last name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter phone number"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter city"
              />
            </div>

            {/* Interest */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interest/Program
              </label>
              <input
                type="text"
                value={formData.interest}
                onChange={(e) => handleChange('interest', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Foster Care, Adoption, etc."
              />
            </div>

            {/* Have Children */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Do you have children?
              </label>
              <select
                value={formData.have_children}
                onChange={(e) => handleChange('have_children', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Planning to Foster */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planning to foster in the next year?
              </label>
              <select
                value={formData.planning_to_foster}
                onChange={(e) => handleChange('planning_to_foster', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Source
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., website, google, referral, etc."
              />
            </div>

            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={formData.campaign_name}
                onChange={(e) => handleChange('campaign_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter campaign name if applicable"
              />
            </div>

            {/* Office */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Office/Location
              </label>
              <input
                type="text"
                value={formData.office}
                onChange={(e) => handleChange('office', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter office or location"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter any additional notes..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'Creating Lead...' : 'Create Lead'}
              </button>
              <Link
                href="/leads"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}