'use client';

import { useState, useEffect } from 'react';
import { leadsApi, tenantsApi, usersApi, STAGES } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useTenant } from '@/lib/TenantContext';
import Link from 'next/link';

export default function LeadsListPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(''); // For SuperAdmin filtering
  const { user } = useAuth();
  const { getStages } = useTenant();
  const [teamMembers, setTeamMembers] = useState([]);
  const [filters, setFilters] = useState({
    stage: '',
    source: '',
    q: '',
    spam_flag: '',
    assignedTo: '',
    page: 1,
    limit: 10,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageStart = total === 0 ? 0 : (filters.page - 1) * filters.limit + 1;
  const pageEnd = Math.min(filters.page * filters.limit, total);

  // Get stages from tenant config or fallback to default
  const stages = getStages();

  useEffect(() => {
    loadLeads();
  }, [filters, selectedTenant]);

  useEffect(() => {
    // Load tenants for SuperAdmin users
    if (user?.role === 'super_admin') {
      loadTenants();
    }
  }, [user]);

  useEffect(() => {
    // Load team members when tenant is selected or user changes
    if (selectedTenant || user?.tenantId) {
      const tenantId = selectedTenant || user?.tenantId;
      if (tenantId) {
        loadTeamMembers(tenantId);
      }
    }
  }, [selectedTenant, user]);

  async function loadTenants() {
    try {
      const data = await tenantsApi.listTenants();
      const tenantsList = data.tenants || [];
      setTenants(tenantsList);
      
      // Auto-select first tenant if no tenant is currently selected
      if (tenantsList.length > 0 && !selectedTenant) {
        setSelectedTenant(tenantsList[0]._id);
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  }

  async function loadTeamMembers(tenantId) {
    try {
      const data = await usersApi.listUsers(tenantId);
      setTeamMembers(data.users || []);
    } catch (err) {
      console.error('Failed to load team members:', err);
      setTeamMembers([]);
    }
  }

  async function loadLeads() {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.stage) params.stage = filters.stage;
      if (filters.source) params.source = filters.source;
      if (filters.q) params.q = filters.q;
      if (filters.spam_flag) params.spam_flag = filters.spam_flag;
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;
      
      // Add tenantId to params if a specific tenant is selected
      if (selectedTenant) {
        params.tenantId = selectedTenant;
      }
      
      params.page = filters.page;
      params.limit = filters.limit;

      console.log('Frontend: Loading leads with params:', params); // Debug log
      console.log('Frontend: selectedTenant:', selectedTenant); // Debug log

      const data = await leadsApi.getLeads(params);
      setLeads(data.items);
      setTotal(data.total);
      setTotalPages(Math.ceil(data.total / data.limit));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key, value) {
    setFilters({ ...filters, [key]: value, page: 1 });
  }

  function handleExport() {
    const params = {};
    if (filters.stage) params.stage = filters.stage;
    if (filters.source) params.source = filters.source;
    if (filters.q) params.q = filters.q;
    if (filters.spam_flag) params.spam_flag = filters.spam_flag;
    
    const url = leadsApi.exportLeadsUrl(params);
    // Open in new tab to download
    window.open(url + `&X-Tenant-Key=${process.env.NEXT_PUBLIC_API_KEY}`, '_blank');
  }

  async function handleQuickStageChange(leadId, newStage) {
    try {
      await leadsApi.updateLead(leadId, { stage: newStage });
      loadLeads(); // Reload
    } catch (err) {
      alert('Error updating stage: ' + err.message);
    }
  }

  async function handleQuickAssignmentChange(leadId, userId) {
    try {
      await leadsApi.updateLead(leadId, { assignedUserId: userId || null });
      loadLeads(); // Reload
    } catch (err) {
      alert('Error updating assignment: ' + err.message);
    }
  }

  async function handleDeleteLead(leadId, leadName) {
    if (!confirm(`Are you sure you want to delete ${leadName}? This cannot be undone.`)) {
      return;
    }
    
    try {
      await leadsApi.deleteLead(leadId);
      alert('Lead deleted successfully');
      loadLeads(); // Reload
    } catch (err) {
      alert('Error deleting lead: ' + err.message);
    }
  }

  async function handleBulkDelete() {
    if (selectedLeads.length === 0) {
      alert('Please select leads to delete');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedLeads.length} lead(s)? This cannot be undone.`)) {
      return;
    }
    
    try {
      // Delete all selected leads
      await Promise.all(selectedLeads.map(id => leadsApi.deleteLead(id)));
      alert(`Successfully deleted ${selectedLeads.length} lead(s)`);
      setSelectedLeads([]);
      loadLeads(); // Reload
    } catch (err) {
      alert('Error deleting leads: ' + err.message);
    }
  }

  function toggleSelectAll() {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l._id));
    }
  }

  function toggleSelectLead(leadId) {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Leads Management</h1>
            <p className="mt-2 text-gray-700">Manage and track your leads</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200"
            >
              Dashboard
            </Link>
            <Link
              href="/leads/new"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              + Add New Lead
            </Link>
          </div>
        </div>

        {/* Client Filter for SuperAdmin */}
        {user?.role === 'super_admin' && (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  View Client:
                </label>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[200px] transition-all duration-200"
                >
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      🏢 {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-600">
                {selectedTenant && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Viewing: {tenants.find(t => t._id === selectedTenant)?.name || 'Unknown'} ({total} leads)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                placeholder="Name, email, phone..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage
              </label>
              <select
                value={filters.stage}
                onChange={(e) => handleFilterChange('stage', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
              >
                <option value="">All Stages</option>
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <input
                type="text"
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                placeholder="website, google, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spam Filter
              </label>
              <select
                value={filters.spam_flag}
                onChange={(e) => handleFilterChange('spam_flag', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
              >
                <option value="">All</option>
                <option value="false">Non-Spam</option>
                <option value="true">Spam</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <select
                value={filters.assignedTo}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
              >
                <option value="">All Members</option>
                <option value="unassigned">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setFilters({ stage: '', source: '', q: '', spam_flag: '', assignedTo: '', page: 1, limit: 10 });
                  // Don't reset selectedTenant as it's separate from regular filters
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              >
                Clear
              </button>
              <button
                onClick={handleExport}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
              >
                Export CSV
              </button>
            </div> */}
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {total > 0 ? (
              <>Showing {pageStart}
              {'–'}{pageEnd} of {total} leads</>
            ) : (
              <>Showing 0 of 0 leads</>
            )}
            {selectedLeads.length > 0 && (
              <span className="ml-4 text-blue-600 font-medium">
                ({selectedLeads.length} selected)
              </span>
            )}
          </div>
          {selectedLeads.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 shadow-md hover:shadow-lg transition-all duration-200"
            >
              Delete Selected ({selectedLeads.length})
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl shadow-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-white/20">
            <p className="text-gray-600">Loading leads...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && leads.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-white/20">
            <p className="text-gray-600">No leads found. Adjust your filters or add a new lead.</p>
          </div>
        )}

        {/* Leads Table */}
        {!loading && leads.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-white/20">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-3 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === leads.length && leads.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40 md:w-48">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 hidden md:table-cell">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                      Stage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40 hidden lg:table-cell">
                      Assigned To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 hidden xl:table-cell">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead._id)}
                          onChange={() => toggleSelectLead(lead._id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-4 w-40 md:w-48">
                        <Link
                          href={`/leads/${lead._id}`}
                          className="text-blue-600 hover:text-blue-900 font-medium block truncate"
                          title={`${lead.firstName || ''} ${lead.lastName || ''}`}
                        >
                          {lead.firstName || ''} {lead.lastName || ''}
                        </Link>
                        {lead.spamFlag && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                            SPAM
                          </span>
                        )}
                        {/* Show contact info on mobile */}
                        <div className="md:hidden text-xs text-gray-500 mt-1 truncate">
                          {lead.city && <span className="truncate">{lead.city}</span>}
                          {lead.source && <span className="ml-2">• {lead.source}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 w-32 text-sm text-gray-600 hidden md:table-cell">
                        <div className="truncate" title={lead.city}>{lead.city || '-'}</div>
                        <div className="text-xs text-gray-500 truncate" title={lead.source}>{lead.source || '-'}</div>
                      </td>
                      <td className="px-4 py-4 w-36">
                        <select
                          value={lead.stage}
                          onChange={(e) => handleQuickStageChange(lead._id, e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        >
                          {stages.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage.replace(/_/g, ' ').toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 w-40 text-sm text-gray-600 hidden lg:table-cell">
                        {(user?.role === 'super_admin' || user?.role === 'client_admin') ? (
                          <select
                            value={lead.assignedUserId || ''}
                            onChange={(e) => handleQuickAssignmentChange(lead._id, e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map((member) => (
                              <option key={member._id} value={member._id}>
                                {member.firstName} {member.lastName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={lead.assignedUserId === user._id ? user._id : (lead.assignedUserId || '')}
                            onChange={(e) => handleQuickAssignmentChange(lead._id, e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                          >
                            <option value="">Unassigned</option>
                            <option value={user._id}>
                              {lead.assignedUserId === user._id ? '✓ ' : ''}Self Assign ({user.firstName} {user.lastName})
                            </option>
                            {teamMembers.filter(m => m._id !== user._id).map((member) => (
                              <option key={member._id} value={member._id} disabled>
                                {member.firstName} {member.lastName} (Assigned)
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-4 w-32 text-sm text-gray-500 hidden xl:table-cell">
                        <div className="truncate" title={formatDate(lead.createdAt)}>
                          {formatDate(lead.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 w-24 text-sm">
                        <button
                          onClick={() => handleDeleteLead(lead._id, `${lead.firstName || ''} ${lead.lastName || ''}`)}
                          className="text-red-600 hover:text-red-700 font-medium truncate transition-colors duration-200"
                          title="Delete lead"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    disabled={filters.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    disabled={filters.page === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{filters.page}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                        disabled={filters.page === 1}
                        className="relative inline-flex items-center px-4 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                        disabled={filters.page === totalPages}
                        className="relative inline-flex items-center px-4 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
