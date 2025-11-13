'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ApiKeysPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  useEffect(() => {
    fetchTenantAndKeys();
  }, [params.id]);

  async function fetchTenantAndKeys() {
    try {
      // Fetch tenant info
      const tenantRes = await fetch(`${API_URL}/api/tenants/${params.id}`, {
        headers: { 'X-Tenant-Key': API_KEY },
      });
      const tenantData = await tenantRes.json();
      setTenant(tenantData);

      // Fetch API keys
      const keysRes = await fetch(`${API_URL}/api/tenants/${params.id}/api-keys`, {
        headers: { 'X-Tenant-Key': API_KEY },
      });
      const keysData = await keysRes.json();
      setApiKeys(keysData);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey(e) {
    e.preventDefault();
    if (!newKeyName.trim()) {
      setError('Key name is required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/tenants/${params.id}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Key': API_KEY,
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewKeyResult(data);
        setNewKeyName('');
        setSuccess('API key created successfully');
        fetchTenantAndKeys();
      } else {
        setError(data.error || 'Failed to create API key');
      }
    } catch (err) {
      setError('Failed to create API key');
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeKey(keyId) {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/tenants/${params.id}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'X-Tenant-Key': API_KEY },
      });

      if (response.ok) {
        setSuccess('API key revoked successfully');
        fetchTenantAndKeys();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to revoke API key');
      }
    } catch (err) {
      setError('Failed to revoke API key');
      console.error(err);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
        <p className="text-gray-600 mt-2">{tenant?.name}</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}

      {/* New Key Result (One-time display) */}
      {newKeyResult && (
        <div className="mb-6 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <h3 className="text-lg font-bold text-yellow-900 mb-2">⚠️ Save This API Key Now</h3>
          <p className="text-sm text-yellow-800 mb-4">
            This key will only be shown once. Copy it now and store it securely.
          </p>
          <div className="bg-white p-4 rounded border border-yellow-300 mb-4">
            <code className="text-sm font-mono break-all">{newKeyResult.rawKey}</code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(newKeyResult.rawKey)}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={() => setNewKeyResult(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              I've Saved It
            </button>
          </div>
        </div>
      )}

      {/* Create New Key Form */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Create New API Key</h2>
        <form onSubmit={handleCreateKey} className="flex gap-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., 'Production WordPress Plugin')"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {creating ? 'Creating...' : 'Create Key'}
          </button>
        </form>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Existing API Keys</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No API keys found. Create one above.
                  </td>
                </tr>
              ) : (
                apiKeys.map((key) => (
                  <tr key={key._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{key.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {key.active ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {key.active && (
                        <button
                          onClick={() => handleRevokeKey(key._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
