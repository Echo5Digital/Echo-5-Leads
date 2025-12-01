'use client';

import { useState, useEffect, useRef } from 'react';
import { leadsApi, metaLeadsApi, tenantsApi, usersApi, STAGES } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useTenant } from '@/lib/TenantContext';
import Link from 'next/link';

export default function LeadsListPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState('website'); // 'website' or 'meta'
  
  const [leads, setLeads] = useState([]);
  const [metaLeads, setMetaLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const { user } = useAuth();
  const { getStages, selectedTenant } = useTenant();
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
  
  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const fileInputRef = useRef(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadDetails, setLeadDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Get stages from tenant config or fallback to default
  const stages = getStages();

  useEffect(() => {
    // Only load if we have a selected tenant (for Super Admins) or always load for other roles
    if (user?.role === 'super_admin') {
      if (selectedTenant) {
        if (activeTab === 'website') {
          loadLeads();
        } else {
          loadMetaLeads();
        }
      }
    } else {
      if (activeTab === 'website') {
        loadLeads();
      } else {
        loadMetaLeads();
      }
    }
  }, [filters, selectedTenant, user, activeTab]);

  useEffect(() => {
    // Load team members when tenant is selected or user changes
    if (selectedTenant || user?.tenantId) {
      const tenantId = user?.role === 'super_admin' && selectedTenant ? selectedTenant._id : user?.tenantId;
      if (tenantId) {
        loadTeamMembers(tenantId);
      }
    }
  }, [selectedTenant, user]);

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
      
      // Add tenantId to params if Super Admin and a specific tenant is selected
      if (user?.role === 'super_admin' && selectedTenant) {
        params.tenantId = selectedTenant._id;
      }
      
      params.page = filters.page;
      params.limit = filters.limit;

      console.log('Frontend: Loading leads with params:', params);
      console.log('Frontend: selectedTenant:', selectedTenant);

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

  async function loadMetaLeads() {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.stage) params.stage = filters.stage;
      if (filters.q) params.q = filters.q;
      if (filters.spam_flag) params.spam_flag = filters.spam_flag;
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;
      
      // Add tenantId to params if Super Admin and a specific tenant is selected
      if (user?.role === 'super_admin' && selectedTenant) {
        params.tenantId = selectedTenant._id;
      }
      
      params.page = filters.page;
      params.limit = filters.limit;

      console.log('Frontend: Loading meta leads with params:', params);

      const data = await metaLeadsApi.getMetaLeads(params);
      setMetaLeads(data.items);
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

  async function handleQuickStageChange(leadId, newStage, isMeta = false) {
    try {
      if (isMeta) {
        await metaLeadsApi.updateMetaLead(leadId, { stage: newStage });
        loadMetaLeads();
      } else {
        await leadsApi.updateLead(leadId, { stage: newStage });
        loadLeads();
      }
    } catch (err) {
      alert('Error updating stage: ' + err.message);
    }
  }

  async function handleQuickAssignmentChange(leadId, userId, isMeta = false) {
    try {
      if (isMeta) {
        await metaLeadsApi.updateMetaLead(leadId, { assignedUserId: userId || null });
        loadMetaLeads();
      } else {
        await leadsApi.updateLead(leadId, { assignedUserId: userId || null });
        loadLeads();
      }
    } catch (err) {
      alert('Error updating assignment: ' + err.message);
    }
  }

  async function handleDeleteLead(leadId, leadName, isMeta = false) {
    if (!confirm(`Are you sure you want to delete ${leadName}? This cannot be undone.`)) {
      return;
    }
    
    try {
      if (isMeta) {
        await metaLeadsApi.deleteMetaLead(leadId);
      } else {
        await leadsApi.deleteLead(leadId);
      }
      alert('Lead deleted successfully');
      if (isMeta) {
        loadMetaLeads();
      } else {
        loadLeads();
      }
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
      if (activeTab === 'website') {
        // Delete all selected leads
        await Promise.all(selectedLeads.map(id => leadsApi.deleteLead(id)));
      } else {
        // Delete all selected meta leads
        await Promise.all(selectedLeads.map(id => metaLeadsApi.deleteMetaLead(id)));
      }
      alert(`Successfully deleted ${selectedLeads.length} lead(s)`);
      setSelectedLeads([]);
      if (activeTab === 'website') {
        loadLeads();
      } else {
        loadMetaLeads();
      }
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

  function handleImportClick() {
    setImportFile(null);
    setImportProgress('');
    setShowImportModal(true);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  }

  async function handleImportSubmit() {
    if (!importFile) {
      alert('Please select a CSV file');
      return;
    }

    // SuperAdmin must have selected a tenant
    if (user?.role === 'super_admin' && !selectedTenant) {
      alert('Please select a client from the sidebar before importing leads');
      return;
    }

    try {
      setImporting(true);
      setImportProgress('Reading file...');

      // Read file as text
      const fileText = await importFile.text();
      setImportProgress('Uploading...');

      // Call API - pass tenantId for SuperAdmin
      const result = await leadsApi.importCSV(
        fileText,
        user?.role === 'super_admin' ? selectedTenant?._id : null
      );

      setImportProgress(`Success! Imported ${result.imported} meta leads`);
      
      // Show errors if any
      if (result.errors.length > 0) {
        const errorMsg = result.errors.slice(0, 3).join('\n') + 
          (result.errors.length > 3 ? `\n... and ${result.errors.length - 3} more errors` : '');
        alert(`Import completed with errors:\n\n${errorMsg}`);
      }

      // Close modal and reload leads
      setTimeout(() => {
        setShowImportModal(false);
        setActiveTab('meta'); // Switch to meta leads tab
        loadMetaLeads();
      }, 1500);
    } catch (err) {
      setImportProgress(`Error: ${err.message}`);
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  }

  async function handleViewDetails(lead) {
    setSelectedLead(lead);
    setDetailLoading(true);
    setShowDetailModal(true);
    
    try {
      // Fetch full lead details including activities
      const details = await metaLeadsApi.getMetaLead(lead._id);
      setLeadDetails(details);
    } catch (err) {
      console.error('Failed to load lead details:', err);
      alert('Failed to load lead details: ' + err.message);
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
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
            {/* Import CSV Button */}
            {(user?.role === 'client_admin' || user?.role === 'super_admin') && (
              <button
                onClick={handleImportClick}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 shadow-md hover:shadow-lg transition-all duration-200"
              >
                📥 Import Facebook Leads
              </button>
            )}
            <Link
              href="/leads/new"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              + Add New Lead
            </Link>
          </div>
        </div>

        {/* Super Admin info banner - showing selected client */}
        {user?.role === 'super_admin' && selectedTenant && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Viewing <span className="font-bold">{total}</span> leads for: <span className="font-bold">{selectedTenant.name}</span>
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Use the sidebar client selector to switch between clients
                </p>
              </div>
            </div>
          </div>
        )}

        {user?.role === 'super_admin' && !selectedTenant && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  Please select a client from the sidebar to view or import leads
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => {setActiveTab('website'); setFilters({...filters, page: 1});}}
            className={`px-6 py-3 font-medium text-sm transition-all duration-200 ${
              activeTab === 'website'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🌐 Website Leads
          </button>
          <button
            onClick={() => {setActiveTab('meta'); setFilters({...filters, page: 1});}}
            className={`px-6 py-3 font-medium text-sm transition-all duration-200 ${
              activeTab === 'meta'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📱 Meta (Facebook) Leads
          </button>
        </div>

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
        {!loading && activeTab === 'website' && leads.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-white/20">
            <p className="text-gray-600">No website leads found. Adjust your filters or add a new lead.</p>
          </div>
        )}

        {!loading && activeTab === 'meta' && metaLeads.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-white/20">
            <p className="text-gray-600">No meta leads found. Import Facebook leads to get started.</p>
          </div>
        )}

        {/* Website Leads Table */}
        {!loading && activeTab === 'website' && leads.length > 0 && (
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
                      Email
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
                          title={lead.email || 'Unknown'}
                        >
                          {lead.email || 'Unknown'}
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
                        ) : user ? (
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
                        ) : (
                          <span className="text-gray-400 italic text-xs">Loading...</span>
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

        {/* Meta Leads Table */}
        {!loading && activeTab === 'meta' && metaLeads.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-white/20">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-3 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === metaLeads.length && metaLeads.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40 md:w-48">
                      Email
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
                  {metaLeads.map((lead) => (
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
                        <button
                          onClick={() => handleViewDetails(lead)}
                          className="text-blue-600 hover:text-blue-900 font-medium block truncate hover:underline"
                          title={lead.firstName ? `${lead.firstName} ${lead.lastName || ''}` : lead.email || 'Unknown'}
                        >
                          {lead.firstName ? `${lead.firstName} ${lead.lastName || ''}` : lead.email || 'Unknown'}
                        </button>
                        {lead.spamFlag && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                            SPAM
                          </span>
                        )}
                        <div className="md:hidden text-xs text-gray-500 mt-1 truncate">
                          {lead.city && <span className="truncate">{lead.city}</span>}
                          {lead.source && <span className="ml-2">• {lead.source}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 w-32 text-sm text-gray-600 hidden md:table-cell">
                        <div className="truncate" title={lead.city}>{lead.city || '-'}</div>
                        <div className="text-xs text-gray-500 truncate" title={lead.source}>{lead.source || 'facebook_import'}</div>
                      </td>
                      <td className="px-4 py-4 w-36">
                        <select
                          value={lead.stage}
                          onChange={(e) => handleQuickStageChange(lead._id, e.target.value, true)}
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
                            onChange={(e) => handleQuickAssignmentChange(lead._id, e.target.value, true)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map((member) => (
                              <option key={member._id} value={member._id}>
                                {member.firstName} {member.lastName}
                              </option>
                            ))}
                          </select>
                        ) : user ? (
                          <select
                            value={lead.assignedUserId === user._id ? user._id : (lead.assignedUserId || '')}
                            onChange={(e) => handleQuickAssignmentChange(lead._id, e.target.value, true)}
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
                        ) : (
                          <span className="text-gray-400 italic text-xs">Loading...</span>
                        )}
                      </td>
                      <td className="px-4 py-4 w-32 text-sm text-gray-500 hidden xl:table-cell">
                        <div className="truncate" title={formatDate(lead.createdAt)}>
                          {formatDate(lead.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 w-24 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(lead)}
                            className="text-blue-600 hover:text-blue-700 font-medium truncate transition-colors duration-200"
                            title="View details"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead._id, `${lead.firstName || ''} ${lead.lastName || ''}`, true)}
                            className="text-red-600 hover:text-red-700 font-medium truncate transition-colors duration-200"
                            title="Delete lead"
                          >
                            Delete
                          </button>
                        </div>
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

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900">Import Facebook Leads</h2>
                <p className="text-sm text-gray-600 mt-1">Upload a CSV file to import leads</p>
              </div>

              <div className="p-6 space-y-4">
                {!importing ? (
                  <>
                    {/* Client Alert for SuperAdmin */}
                    {user?.role === 'super_admin' && !selectedTenant && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-900 font-medium">⚠️ Select a client first</p>
                        <p className="text-xs text-red-800 mt-1">Use the sidebar to select a client before importing</p>
                      </div>
                    )}

                    {/* File Upload Area */}
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="text-4xl mb-2">📄</div>
                      <p className="font-medium text-gray-900">{importFile?.name || 'Click to select CSV file'}</p>
                      <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-900 font-medium mb-2">CSV Format:</p>
                      <p className="text-xs text-blue-800">Required columns: first_name, last_name, email, phone_e164 (at least email or phone)</p>
                      <p className="text-xs text-blue-800 mt-1">Optional: city, campaign_name, stage, assigned_to, created_at</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowImportModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleImportSubmit}
                        disabled={!importFile || (user?.role === 'super_admin' && !selectedTenant)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Import
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Progress */}
                    <div className="text-center py-8">
                      <div className="inline-block">
                        <div className="animate-spin">
                          <div className="text-4xl">⚙️</div>
                        </div>
                      </div>
                      <p className="mt-4 text-gray-900 font-medium">{importProgress}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedLead?.firstName} {selectedLead?.lastName}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Meta (Facebook) Lead Details</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedLead(null);
                    setLeadDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              {detailLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin text-2xl mb-4">⚙️</div>
                  <p className="text-gray-600">Loading details...</p>
                </div>
              ) : leadDetails ? (
                <div className="p-6 space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span>📞</span> Contact Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                        <p className="text-sm font-medium text-gray-900 break-all">{leadDetails.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                        <p className="text-sm font-medium text-gray-900">{leadDetails.phoneE164 || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">City</p>
                        <p className="text-sm font-medium text-gray-900">{leadDetails.city || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Source</p>
                        <p className="text-sm font-medium text-gray-900">{leadDetails.source || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Lead Status */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span>📋</span> Lead Status
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Stage</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{leadDetails.stage?.replace(/_/g, ' ') || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Assigned To</p>
                        <p className="text-sm font-medium text-gray-900">{leadDetails.assignedUserId || 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Campaign</p>
                        <p className="text-sm font-medium text-gray-900">{leadDetails.campaignName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Created</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(leadDetails.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Original Data */}
                  {leadDetails.originalPayload && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span>📄</span> Original Form Data
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3 max-h-40 overflow-y-auto">
                        {Object.entries(leadDetails.originalPayload).map(([key, value]) => (
                          <div key={key} className="border-b border-gray-200 pb-2 last:border-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">{key}</p>
                            <p className="text-sm text-gray-900 break-words">{String(value) || 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activities */}
                  {leadDetails.activities && leadDetails.activities.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span>📝</span> Activities ({leadDetails.activities.length})
                      </h3>
                      <div className="space-y-3">
                        {leadDetails.activities.map((activity, idx) => (
                          <div key={idx} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{activity.type === 'note' ? '📌 Note' : '🔄 ' + activity.type}</p>
                                {activity.content?.title && (
                                  <p className="text-sm font-medium text-gray-700 mt-1">{activity.content.title}</p>
                                )}
                                {activity.content?.note && (
                                  <p className="text-sm text-gray-600 mt-1">{activity.content.note}</p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{formatDate(activity.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-600">Failed to load lead details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
