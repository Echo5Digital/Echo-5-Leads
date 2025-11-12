'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tenantsApi } from '@/lib/api';
import Link from 'next/link';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  const [client, setClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    stages: [],
    users: [],
    spamKeywords: [],
    slaHours: 24,
  });

  const [newStage, setNewStage] = useState('');
  const [newUserName, setNewUserName] = useState('');

  useEffect(() => {
    loadClient();
  }, [params.id]);

  async function loadClient() {
    try {
      setLoading(true);
      setError(null);
      const data = await tenantsApi.getTenant(params.id);
      setClient(data.tenant);
      setFormData({
        name: data.tenant.name,
        stages: data.tenant.config?.stages || [],
        users: data.tenant.config?.users || [],
        spamKeywords: data.tenant.config?.spamKeywords || [],
        slaHours: data.tenant.config?.slaHours || 24,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field, value) {
    setFormData({ ...formData, [field]: value });
  }

  function addStage() {
    if (!newStage.trim()) return;
    const stageValue = newStage.toLowerCase().replace(/\s+/g, '_');
    if (formData.stages.includes(stageValue)) {
      alert('Stage already exists');
      return;
    }
    setFormData({ 
      ...formData, 
      stages: [...formData.stages, stageValue] 
    });
    setNewStage('');
  }

  function removeStage(index) {
    const newStages = formData.stages.filter((_, i) => i !== index);
    setFormData({ ...formData, stages: newStages });
  }

  function moveStage(index, direction) {
    const newStages = [...formData.stages];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newStages.length) return;
    [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
    setFormData({ ...formData, stages: newStages });
  }

  function addUser() {
    if (!newUserName.trim()) return;
    if (formData.users.some(u => u.name === newUserName)) {
      alert('User already exists');
      return;
    }
    setFormData({
      ...formData,
      users: [...formData.users, { name: newUserName, email: '', active: true }]
    });
    setNewUserName('');
  }

  function removeUser(index) {
    const newUsers = formData.users.filter((_, i) => i !== index);
    setFormData({ ...formData, users: newUsers });
  }

  function toggleUserActive(index) {
    const newUsers = [...formData.users];
    newUsers[index].active = !newUsers[index].active;
    setFormData({ ...formData, users: newUsers });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      await tenantsApi.updateTenant(params.id, {
        name: formData.name,
        stages: formData.stages,
        users: formData.users,
        spamKeywords: formData.spamKeywords,
        slaHours: parseInt(formData.slaHours),
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadClient(); // Reload to get updated data
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    try {
      await tenantsApi.deleteTenant(params.id);
      router.push('/clients');
    } catch (err) {
      setError(err.message);
      setDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <p className="text-gray-600">Loading client...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Client not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            <p className="mt-2 text-gray-600">@{client.slug}</p>
          </div>
          <Link
            href="/clients"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition"
          >
            ← Back to Clients
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Leads</div>
            <div className="text-2xl font-bold text-gray-900">{client.leadCount || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Active API Keys</div>
            <div className="text-2xl font-bold text-gray-900">{client.apiKeys?.filter(k => k.active).length || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Created</div>
            <div className="text-lg font-bold text-gray-900">
              {new Date(client.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">✅ Client updated successfully!</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">❌ Error: {error}</p>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug (read-only)
                </label>
                <input
                  type="text"
                  value={client.slug}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SLA Hours
                </label>
                <input
                  type="number"
                  value={formData.slaHours}
                  onChange={(e) => handleChange('slaHours', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Lead Stages */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Stages</h2>
            
            <div className="space-y-2 mb-4">
              {formData.stages.map((stage, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded border">
                  <span className="flex-1 font-medium text-gray-800 capitalize">
                    {stage.replace(/_/g, ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveStage(index, -1)}
                    disabled={index === 0}
                    className="px-2 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(index, 1)}
                    disabled={index === formData.stages.length - 1}
                    className="px-2 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
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

            <div className="flex gap-2">
              <input
                type="text"
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                placeholder="New stage name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStage())}
              />
              <button
                type="button"
                onClick={addStage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Members</h2>
            
            <div className="space-y-2 mb-4">
              {formData.users.map((user, index) => (
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

            <div className="flex gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="User name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUser())}
              />
              <button
                type="button"
                onClick={addUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Spam Keywords */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Spam Keywords</h2>
            <textarea
              value={formData.spamKeywords.join(', ')}
              onChange={(e) => handleChange('spamKeywords', e.target.value.split(',').map(s => s.trim()))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="viagra, loan, casino"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className={`px-6 py-2 rounded-md transition ${
                deleteConfirm 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              {deleteConfirm ? 'Confirm Delete?' : 'Delete Client'}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={loadClient}
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
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
