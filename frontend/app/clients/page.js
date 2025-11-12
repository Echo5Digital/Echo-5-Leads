'use client';

import { useState, useEffect } from 'react';
import { tenantsApi } from '@/lib/api';
import Link from 'next/link';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      setError(null);
      const data = await tenantsApi.listTenants();
      setClients(data.tenants);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <p className="text-gray-600">Loading clients...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="mt-2 text-gray-600">Manage all client organizations</p>
          </div>
          <Link
            href="/clients/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            + Add New Client
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Clients List */}
        {clients.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">No clients found</p>
            <Link
              href="/clients/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Add Your First Client
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <div key={client._id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {client.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        @{client.slug}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Stages:</span>
                      <span className="font-medium text-gray-900">
                        {client.config?.stages?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Users:</span>
                      <span className="font-medium text-gray-900">
                        {client.config?.users?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">API Keys:</span>
                      <span className="font-medium text-gray-900">
                        {client.activeApiKeys || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(client.createdAt)}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/clients/${client._id}`}
                    className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-md hover:bg-gray-200 transition"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
