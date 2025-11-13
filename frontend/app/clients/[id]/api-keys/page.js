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
  const [revealedKeys, setRevealedKeys] = useState({}); // Track which keys are revealed
  const [revealedFullKeys, setRevealedFullKeys] = useState({}); // Store decrypted full keys
  const [revealing, setRevealing] = useState({}); // Track loading state

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

  function toggleKeyVisibility(keyId) {
    setRevealedKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  }

  async function revealFullKey(keyId) {
    if (revealedFullKeys[keyId]) {
      // Already revealed, just toggle visibility
      toggleKeyVisibility(keyId);
      return;
    }

    // Fetch the full key from backend
    setRevealing(prev => ({ ...prev, [keyId]: true }));
    try {
      const response = await fetch(`${API_URL}/api/tenants/${params.id}/api-keys/${keyId}/reveal`, {
        headers: { 'X-Tenant-Key': API_KEY },
      });

      if (!response.ok) {
        throw new Error('Failed to reveal key');
      }

      const data = await response.json();
      setRevealedFullKeys(prev => ({ ...prev, [keyId]: data.rawKey }));
      setRevealedKeys(prev => ({ ...prev, [keyId]: true }));
      setSuccess('Full API key revealed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to reveal API key');
      console.error(err);
    } finally {
      setRevealing(prev => ({ ...prev, [keyId]: false }));
    }
  }

  function getKeyDisplay(key) {
    // If full key is revealed, show it
    if (revealedFullKeys[key._id] && revealedKeys[key._id]) {
      return revealedFullKeys[key._id];
    }

    // Otherwise show hint
    if (!key.keyHint) {
      return '••••••••••••••••••••••••';
    }
    // Show hint when revealed, masked when hidden
    return revealedKeys[key._id] 
      ? `${key.keyHint}••••••••••••••••••••••••` 
      : '••••••••' + key.keyHint.substring(key.keyHint.length - 4);
  }

  function copyCurlCommand(keyId) {
    const key = apiKeys.find(k => k._id === keyId);
    if (!key) return;
    
    const curlCmd = `curl -H "X-Tenant-Key: YOUR_API_KEY_HERE" ${API_URL}/api/leads`;
    copyToClipboard(curlCmd);
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key Hash Preview</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No API keys found. Create one above.
                  </td>
                </tr>
              ) : (
                apiKeys.map((key) => (
                  <tr key={key._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{key.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded break-all max-w-md">
                          {getKeyDisplay(key)}
                        </code>
                        <button
                          onClick={() => revealFullKey(key._id)}
                          disabled={revealing[key._id]}
                          className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                          title={revealedFullKeys[key._id] ? (revealedKeys[key._id] ? 'Hide full key' : 'Show full key') : 'Reveal full API key'}
                        >
                          {revealing[key._id] ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : revealedKeys[key._id] ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                        {revealedFullKeys[key._id] && (
                          <button
                            onClick={() => copyToClipboard(revealedFullKeys[key._id])}
                            className="text-blue-500 hover:text-blue-700"
                            title="Copy full API key"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {revealedFullKeys[key._id] 
                          ? (revealedKeys[key._id] ? '� Full key visible - Keep it secure!' : '🔒 Full key loaded - Click eye to show')
                          : (revealedKeys[key._id] ? '👁️ Showing key hint' : '🔒 Click eye to reveal full key')}
                      </div>
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
