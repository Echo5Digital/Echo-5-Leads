'use client';

import { useState, useEffect } from 'react';
import { leadsApi } from '@/lib/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [settings, setSettings] = useState({
    tenantName: '',
    slaHours: 24,
    spamKeywords: [],
    stages: [],
    users: [],
  });

  const [newStage, setNewStage] = useState('');
  const [newUserName, setNewUserName] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);
      const config = await leadsApi.getTenantConfig();
      setSettings({
        tenantName: config.name,
        slaHours: config.slaHours,
        spamKeywords: config.spamKeywords,
        stages: config.stages,
        users: config.users,
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

  function addUser() {
    if (!newUserName.trim()) return;
    if (settings.users.some(u => u.name === newUserName)) {
      alert('User already exists');
      return;
    }
    setSettings({
      ...settings,
      users: [...settings.users, { name: newUserName, email: '', active: true }]
    });
    setNewUserName('');
  }

  function removeUser(index) {
    const newUsers = settings.users.filter((_, i) => i !== index);
    setSettings({ ...settings, users: newUsers });
  }

  function toggleUserActive(index) {
    const newUsers = [...settings.users];
    newUsers[index].active = !newUsers[index].active;
    setSettings({ ...settings, users: newUsers });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      await leadsApi.updateTenantConfig({
        stages: settings.stages,
        users: settings.users,
        spamKeywords: settings.spamKeywords,
        slaHours: parseInt(settings.slaHours),
      });
      
      setSuccess(true);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Configure stages, users, and tenant settings</p>
        </div>

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

          {/* Users Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Members</h2>
            <p className="text-sm text-gray-600 mb-4">
              Manage users who can be assigned to leads.
            </p>
            
            {/* Users List */}
            <div className="space-y-2 mb-4">
              {settings.users.map((user, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded border">
                  <span className={`flex-1 font-medium ${user.active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {user.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleUserActive(index)}
                    className={`px-3 py-1 rounded ${user.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}
                  >
                    {user.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeUser(index)}
                    className="px-3 py-1 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Add New User */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="User name (e.g., Baylee)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUser())}
              />
              <button
                type="button"
                onClick={addUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add User
              </button>
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
            <strong>💡 Note:</strong> Changes to stages and users apply immediately. All historical leads are preserved with their current stage values.
          </p>
        </div>
      </div>
    </div>
  );
}
