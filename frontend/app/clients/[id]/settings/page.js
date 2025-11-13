'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ClientSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  // Form state
  const [settings, setSettings] = useState({
    name: '',
    slaHours: 24,
    managerEmail: '',
    spamKeywords: [],
    stages: [],
    metaAccessToken: '',
  });

  const [newStage, setNewStage] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    loadTenant();
  }, [params.id]);

  async function loadTenant() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/tenants/${params.id}`, {
        headers: { 'X-Tenant-Key': API_KEY },
      });

      if (!response.ok) {
        throw new Error('Failed to load tenant');
      }

      const data = await response.json();
      setTenant(data);
      
      setSettings({
        name: data.name || '',
        slaHours: data.config?.slaHours || 24,
        managerEmail: data.config?.managerEmail || '',
        spamKeywords: data.config?.spamKeywords || [],
        stages: data.config?.stages || [],
        metaAccessToken: data.config?.metaAccessToken || '',
      });
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`${API_URL}/api/tenants/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Key': API_KEY,
        },
        body: JSON.stringify({
          name: settings.name,
          stages: settings.stages,
          spamKeywords: settings.spamKeywords,
          slaHours: parseInt(settings.slaHours),
          managerEmail: settings.managerEmail,
          metaAccessToken: settings.metaAccessToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      loadTenant(); // Refresh data
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function addStage() {
    if (!newStage.trim()) return;
    const stageValue = newStage.toLowerCase().replace(/\s+/g, '_');
    
    if (settings.stages.includes(stageValue)) {
      setError('Stage already exists');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSettings(prev => ({
      ...prev,
      stages: [...prev.stages, stageValue],
    }));
    setNewStage('');
  }

  function removeStage(index) {
    setSettings(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index),
    }));
  }

  function moveStage(index, direction) {
    const newStages = [...settings.stages];
    const newIndex = index + direction;
    
    if (newIndex < 0 || newIndex >= newStages.length) return;
    
    [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
    setSettings(prev => ({ ...prev, stages: newStages }));
  }

  function addKeyword() {
    if (!newKeyword.trim()) return;
    
    if (settings.spamKeywords.includes(newKeyword.toLowerCase())) {
      setError('Keyword already exists');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSettings(prev => ({
      ...prev,
      spamKeywords: [...prev.spamKeywords, newKeyword.toLowerCase()],
    }));
    setNewKeyword('');
  }

  function removeKeyword(index) {
    setSettings(prev => ({
      ...prev,
      spamKeywords: prev.spamKeywords.filter((_, i) => i !== index),
    }));
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Client
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Client Settings</h1>
        <p className="text-gray-600 mt-2">{tenant?.name}</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          ✅ Settings saved successfully!
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manager Email (for SLA alerts)
              </label>
              <input
                type="email"
                value={settings.managerEmail}
                onChange={(e) => setSettings(prev => ({ ...prev, managerEmail: e.target.value }))}
                placeholder="manager@agency.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Receives notifications when leads are overdue
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SLA Hours
              </label>
              <input
                type="number"
                min="1"
                value={settings.slaHours}
                onChange={(e) => setSettings(prev => ({ ...prev, slaHours: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum hours before a lead is considered overdue
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Pipeline Stages</h2>
          <p className="text-sm text-gray-600 mb-4">
            Define the stages leads go through in your pipeline. Order matters!
          </p>

          <div className="space-y-3 mb-4">
            {settings.stages.map((stage, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-600 font-mono text-sm flex-1">{stage}</span>
                <button
                  type="button"
                  onClick={() => moveStage(index, -1)}
                  disabled={index === 0}
                  className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-30"
                  title="Move up"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveStage(index, 1)}
                  disabled={index === settings.stages.length - 1}
                  className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-30"
                  title="Move down"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeStage(index)}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Remove"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStage())}
              placeholder="e.g., 'Follow-up Call'"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addStage}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Stage
            </button>
          </div>
        </div>

        {/* Spam Keywords */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Spam Filter Keywords</h2>
          <p className="text-sm text-gray-600 mb-4">
            Leads containing these keywords will be flagged as spam
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {settings.spamKeywords.map((keyword, index) => (
              <div key={index} className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full">
                <span className="text-sm text-red-800">{keyword}</span>
                <button
                  type="button"
                  onClick={() => removeKeyword(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              placeholder="e.g., 'viagra', 'casino'"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Keyword
            </button>
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Integrations</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta (Facebook/Instagram) Access Token
              </label>
              <input
                type="password"
                value={settings.metaAccessToken}
                onChange={(e) => setSettings(prev => ({ ...prev, metaAccessToken: e.target.value }))}
                placeholder="Enter Meta page access token"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for fetching full lead data from Facebook Lead Ads
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
