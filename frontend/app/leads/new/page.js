'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { leadsApi } from '@/lib/api';
import Link from 'next/link';

export default function AddNewLead() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  function handleChange(key, value) {
    setFormData({ ...formData, [key]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.first_name && !formData.last_name) {
      alert('Please provide at least a first or last name');
      return;
    }

    if (!formData.email && !formData.phone) {
      alert('Please provide at least an email or phone number');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert form data to API format
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        city: formData.city || undefined,
        interest: formData.interest || undefined,
        campaign_name: formData.campaign_name || undefined,
        source: formData.source || 'manual',
        notes: formData.notes || undefined,
      };

      // Add boolean fields if specified
      if (formData.have_children !== '') {
        payload.have_children = formData.have_children === 'true';
      }
      if (formData.planning_to_foster !== '') {
        payload.planning_to_foster = formData.planning_to_foster === 'true';
      }

      const result = await leadsApi.ingestLead(payload);
      
      // Redirect to the new lead's detail page
      router.push(`/leads/${result.leadId}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/leads" className="text-blue-600 hover:text-blue-900 mb-4 inline-block">
            ← Back to Leads
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Add New Lead</h1>
          <p className="mt-2 text-gray-600">
            Add leads manually for clients who contacted you by phone or other offline methods.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
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
                required
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
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="john@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., +12345678900"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter phone number with country code (e.g., +12345678900)
              </p>
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
                placeholder="Los Angeles"
              />
            </div>

            {/* Interest/Service */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interest/Service
              </label>
              <select
                value={formData.interest}
                onChange={(e) => handleChange('interest', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an interest...</option>
                <option value="fostering">Fostering</option>
                <option value="adoption">Adoption</option>
                <option value="respite">Respite Care</option>
                <option value="general">General Inquiry</option>
              </select>
            </div>

            {/* Have Children */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Have Children?
              </label>
              <select
                value={formData.have_children}
                onChange={(e) => handleChange('have_children', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Not specified</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Planning to Foster */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planning to Foster?
              </label>
              <select
                value={formData.planning_to_foster}
                onChange={(e) => handleChange('planning_to_foster', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Not specified</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Lead Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Source <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select source...</option>
                <option value="manual">Manual Entry</option>
                <option value="phone">Phone Call</option>
                <option value="email">Email</option>
                <option value="walk-in">Walk-In</option>
                <option value="referral">Referral</option>
                <option value="event">Event</option>
              </select>
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
                placeholder="e.g., Spring 2025 Phone Campaign"
              />
              <p className="mt-1 text-sm text-gray-500">
                Optional campaign or marketing source details
              </p>
            </div>

            {/* Office */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Office
              </label>
              <select
                value={formData.office}
                onChange={(e) => handleChange('office', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select office...</option>
                <option value="main">Main Office</option>
                <option value="north">North Branch</option>
                <option value="south">South Branch</option>
                <option value="east">East Branch</option>
                <option value="west">West Branch</option>
              </select>
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
                placeholder="Add any additional notes about this lead..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Lead...' : 'Create Lead'}
            </button>
            <Link
              href="/leads"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
