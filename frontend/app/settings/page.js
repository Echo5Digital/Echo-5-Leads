'use client';

import { useState, useEffect } from 'react';
import { leadsApi } from '@/lib/api';
import { useTenant } from '@/lib/TenantContext';
import { useAuth } from '@/lib/AuthContext';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const { selectedTenant, switchTenant, tenants } = useTenant();
  const { isSuperAdmin, user } = useAuth();

  const [settings, setSettings] = useState({
    tenantName: '',
    slaHours: 24,
    spamKeywords: [],
    stages: [],
  });

  const [newStage, setNewStage] = useState('');

  // Initialize: auto-select tenant for non-SuperAdmin users
  useEffect(() => {
    if (!isSuperAdmin() && user?.tenantId && tenants.length > 0) {
      const userTenant = tenants.find(t => t._id === user.tenantId);
      if (userTenant && !selectedTenant) {
        switchTenant(userTenant);
      }
    }
  }, [user, tenants, isSuperAdmin]);

  useEffect(() => {
    if (selectedTenant) {
      loadSettings();
    }
  }, [selectedTenant]);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);
      const config = await leadsApi.getTenantConfig(selectedTenant?._id);
      setSettings({
        tenantName: config.name,
        slaHours: config.slaHours,
        spamKeywords: config.spamKeywords,
        stages: config.stages,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field, value) {
    setSettings({ ...settings, [field]: value });
  }

  function addStage() {
    if (!newStage.trim()) return;
    const stageValue = newStage.toLowerCase().replace(/\s+/g, '_');
    if (settings.stages.includes(stageValue)) {
      alert('Stage already exists');
      return;
    }
    setSettings({ 
      ...settings, 
      stages: [...settings.stages, stageValue] 
    });
    setNewStage('');
  }

  function removeStage(index) {
    const newStages = settings.stages.filter((_, i) => i !== index);
    setSettings({ ...settings, stages: newStages });
  }

  function moveStage(index, direction) {
    const newStages = [...settings.stages];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newStages.length) return;
    [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
    setSettings({ ...settings, stages: newStages });
  }



  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      await leadsApi.updateTenantConfig({
        stages: settings.stages,
        spamKeywords: settings.spamKeywords,
        slaHours: parseInt(settings.slaHours),
      }, selectedTenant?._id);
      
      setSuccess(true);
      
      // Reload settings to confirm changes
      await loadSettings();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No client selected. Please select a client to view settings.</p>
          {isSuperAdmin() && tenants.length > 0 && (
            <button
              onClick={() => switchTenant(tenants[0])}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Select First Client
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Configure stages, users, and tenant settings</p>
        </div>

        {/* Client Switcher (SuperAdmin Only) */}
        {isSuperAdmin() && (
          <div className="mb-8 bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Manage Client</h2>
            <p className="text-sm text-gray-600 mb-4">Select which client's settings you want to configure.</p>
            <div className="max-w-md">
              <label htmlFor="client-select" className="block text-sm font-medium text-gray-700 mb-1">
                Current Client
              </label>
              <select
                id="client-select"
                value={selectedTenant?._id || ''}
                onChange={(e) => {
                  const tenant = tenants.find(t => t._id === e.target.value);
                  if (tenant) switchTenant(tenant);
                }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {tenants.map((tenant) => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.name} ({tenant.slug || 'No Slug'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">✅ Settings saved successfully!</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">❌ Error: {error}</p>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lead Stages Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Stages</h2>
            <p className="text-sm text-gray-600 mb-4">
              Manage your lead pipeline stages. These appear in dropdowns throughout the app.
            </p>
            
            {/* Stage List */}
            <div className="space-y-2 mb-4">
              {settings.stages.map((stage, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded border">
                  <span className="flex-1 font-medium text-gray-800 capitalize">
                    {stage.replace(/_/g, ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveStage(index, -1)}
                    disabled={index === 0}
                    className="px-2 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(index, 1)}
                    disabled={index === settings.stages.length - 1}
                    className="px-2 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStage(index)}
                    className="px-3 py-1 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Stage */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                placeholder="New stage name (e.g., Training/Orientation)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStage())}
              />
              <button
                type="button"
                onClick={addStage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Stage
              </button>
            </div>
          </div>

          {/* Team Members Section - Redirects to /team page */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Team Members Management</h2>
                <p className="text-sm text-gray-700 mb-4">
                  Team member accounts (with login credentials and permissions) are now managed on the dedicated Team page.
                </p>
                <a
                  href="/team"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Manage Team Members
                </a>
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">General Settings</h2>
            
            <div className="space-y-4">
              {/* Tenant Name (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={settings.tenantName}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                />
                <p className="mt-1 text-xs text-gray-500">Contact support to change organization name</p>
              </div>

              {/* SLA Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SLA Response Time (hours)
                </label>
                <input
                  type="number"
                  value={settings.slaHours}
                  onChange={(e) => handleChange('slaHours', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Target time to make first contact with new leads
                </p>
              </div>

              {/* Spam Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spam Keywords (comma-separated)
                </label>
                <textarea
                  value={settings.spamKeywords.join(', ')}
                  onChange={(e) => handleChange('spamKeywords', e.target.value.split(',').map(s => s.trim()))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="viagra, loan, casino"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leads containing these keywords will be flagged as spam
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={loadSettings}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Note:</strong> Changes to stages apply immediately and will be reflected in all lead dropdowns throughout the dashboard. All historical leads are preserved with their current stage values.
          </p>
        </div>
      </div>
    </div>
  );
}
