'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { leadsApi, usersApi, STAGES } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useTenant } from '@/lib/TenantContext';
import { Pencil, CheckCircle, Archive, Phone, Mail, MessageSquare, RefreshCw, Link, FileText, Activity, Send, Upload, Download, Paperclip } from 'lucide-react';

export default function LeadDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, isSuperAdmin, isClientAdmin, hasPermission, isExecutive } = useAuth();
  const { getStages } = useTenant();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: 'note',
    title: '',
    note: '',
    stage: '',
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initiative-specific state
  const [tenantFeatures, setTenantFeatures] = useState({});
  const [formSending, setFormSending] = useState({ demographics: false, 'sliding-fee': false });
  const [formSendStatus, setFormSendStatus] = useState({ demographics: null, 'sliding-fee': null });
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadType, setUploadType] = useState('demographics');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Get stages from tenant config or fallback to default
  const stages = getStages();

  useEffect(() => {
    loadLead();
  }, [params.id]);

  useEffect(() => {
    // Load team members after lead is loaded (so we have the lead's tenantId)
    if (lead?.tenantId) {
      loadTeamMembers(lead.tenantId);
    }
  }, [lead?.tenantId]);

  async function loadLead() {
    try {
      setLoading(true);
      setError(null);
      const data = await leadsApi.getLead(params.id);
      setLead(data.lead);
      setActivities(data.activities);
      setAssignedTo(data.lead.assignedUserId || '');
      setEditForm({
        firstName: data.lead.firstName || '',
        lastName: data.lead.lastName || '',
        email: data.lead.email || '',
        phone: data.lead.phoneE164 || '',
        city: data.lead.city || '',
        notes: data.lead.notes || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamMembers(tenantId) {
    try {
      // Load team members for the lead's tenant
      const response = await usersApi.listUsers(tenantId);
      setTeamMembers(response.users || []);
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  }

  // ── Initiative: load tenant features + documents once the lead is available ─
  useEffect(() => {
    if (!lead?._id) return;

    async function loadFeatures() {
      try {
        // SuperAdmin must supply tenantId; all other roles use their JWT implicitly
        const config = await leadsApi.getTenantConfig(isSuperAdmin() ? lead.tenantId : null);
        const features = config.features || {};
        setTenantFeatures(features);
        if (features.initiativeForms) {
          loadDocuments();
        }
      } catch (err) {
        console.error('Failed to load tenant features:', err);
      }
    }
    loadFeatures();
  }, [lead?._id]);

  async function loadDocuments() {
    try {
      setDocsLoading(true);
      const data = await leadsApi.getDocuments(params.id);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setDocsLoading(false);
    }
  }

  async function handleSendForm(formType) {
    if (!lead.email) {
      alert('This lead has no email address on file. Please add one before sending a form.');
      return;
    }
    setFormSending(prev => ({ ...prev, [formType]: true }));
    setFormSendStatus(prev => ({ ...prev, [formType]: null }));
    try {
      await leadsApi.sendInitiativeForm(params.id, formType);
      setFormSendStatus(prev => ({ ...prev, [formType]: 'success' }));
      setTimeout(() => setFormSendStatus(prev => ({ ...prev, [formType]: null })), 4000);
      loadLead(); // refresh activities
    } catch (err) {
      setFormSendStatus(prev => ({ ...prev, [formType]: 'error:' + err.message }));
    } finally {
      setFormSending(prev => ({ ...prev, [formType]: false }));
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset input so same file can be re-uploaded
    setUploading(true);
    setUploadStatus(null);
    try {
      await leadsApi.uploadDocument(params.id, file, uploadType);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus(null), 4000);
      loadDocuments();
      loadLead(); // refresh activities
    } catch (err) {
      setUploadStatus('error:' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleAssignmentChange(userId) {
    try {
      await leadsApi.updateLead(params.id, { assignedUserId: userId || null });
      setAssignedTo(userId);
      // Reload to get updated lead data
      loadLead();
    } catch (err) {
      alert('Error updating assignment: ' + err.message);
    }
  }

  async function handleStageChange(newStage) {
    try {
      await leadsApi.updateLead(params.id, { stage: newStage });
      // Reload to get updated lead data
      loadLead();
    } catch (err) {
      alert('Error updating stage: ' + err.message);
    }
  }

  async function handleEditSave() {
    try {
      setSaving(true);
      await leadsApi.updateLead(params.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone,
        city: editForm.city,
        notes: editForm.notes,
      });
      await loadLead();
      setEditMode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error saving changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEditCancel() {
    setEditForm({
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phoneE164 || '',
      city: lead.city || '',
      notes: lead.notes || '',
    });
    setEditMode(false);
  }

  async function handleToggleArchive() {
    const isArchived = lead.archived === true;
    const msg = isArchived
      ? 'Return this lead to the main pipeline?'
      : 'Archive this lead? They will be moved out of the main pipeline and into the Archived folder.';
    if (!confirm(msg)) return;
    try {
      await leadsApi.updateLead(params.id, { archived: !isArchived });
      loadLead();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleAddActivity(e) {
    e.preventDefault();
    try {
      const activityData = {
        type: activityForm.type,
        content: {},
      };

      if (activityForm.type === 'note') {
        activityData.content = {
          title: activityForm.title,
          note: activityForm.note,
        };
      } else if (activityForm.type === 'status_change') {
        activityData.stage = activityForm.stage;
        activityData.content = {
          note: activityForm.note || `Stage changed to ${activityForm.stage}`,
        };
      } else {
        activityData.content = {
          note: activityForm.note,
        };
      }

      await leadsApi.addActivity(params.id, activityData);
      setShowActivityForm(false);
      setActivityForm({ type: 'note', title: '', note: '', stage: '' });
      loadLead();
    } catch (err) {
      alert('Error adding activity: ' + err.message);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getActivityIcon(type) {
    const icons = {
      note: <FileText size={18} className="text-blue-500" />,
      call: <Phone size={18} className="text-green-500" />,
      email: <Mail size={18} className="text-purple-500" />,
      sms: <MessageSquare size={18} className="text-cyan-500" />,
      status_change: <RefreshCw size={18} className="text-orange-500" />,
      utm_snapshot: <Link size={18} className="text-gray-400" />,
      archived: <Archive size={18} className="text-amber-500" />,
      unarchived: <Archive size={18} className="text-emerald-500" />,
    };
    return icons[type] || <Activity size={18} className="text-gray-400" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <p className="text-gray-600">Loading lead...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error || 'Lead not found'}</p>
            <button
              onClick={() => window.history.back()}
              className="text-blue-600 hover:text-blue-900 mt-2 inline-block bg-transparent border-0 cursor-pointer"
            >
              ← Back to Leads
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-900 mb-4 inline-block bg-transparent border-0 cursor-pointer"
          >
            ← Back to Leads
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {lead.firstName} {lead.lastName}
          </h1>
          <div className="mt-2">
            <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
              {(lead.stage || 'New').replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Lead Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
            {hasPermission('canEditLeads') && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200"
              >
                <Pencil size={14} /> Edit Info
              </button>
            )}
          </div>

          {/* Save success banner */}
          {saveSuccess && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
              <CheckCircle size={16} className="inline mr-1" /> Changes saved successfully
            </div>
          )}

          {/* Stage Change Section */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stage
            </label>
            {hasPermission('canEditLeads') && !isExecutive() ? (
              <select
                value={lead.stage || 'New'}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            ) : (
              <span className="inline-block px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700">
                {(lead.stage || 'New').replace(/_/g, ' ').toUpperCase()}
              </span>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Update the lead's current stage in the pipeline
            </p>
          </div>

          {/* Archive / Unarchive */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archive
            </label>
            {lead.archived ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded font-medium"><Archive size={12} /> Archived</span>
                <button
                  onClick={handleToggleArchive}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors duration-200"
                >
                  Unarchive — Return to Pipeline
                </button>
              </div>
            ) : (
              <button
                onClick={handleToggleArchive}
                className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors duration-200"
              >
                Archive Lead
              </button>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {lead.archived ? 'This lead is archived and hidden from the main pipeline.' : 'Move this lead out of the main pipeline into the Archived folder.'}
            </p>
          </div>

          {/* ── Send Initiative Forms (Open Arms Initiative only) ── */}
          {tenantFeatures.initiativeForms && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send Forms
              </label>
              <div className="flex flex-wrap gap-3">
                {/* Demographics Form */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleSendForm('demographics')}
                    disabled={formSending['demographics'] || !lead.email}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <Send size={14} />
                    {formSending['demographics'] ? 'Sending…' : 'Send Demographics Form'}
                  </button>
                  {formSendStatus['demographics'] === 'success' && (
                    <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Sent to {lead.email}</span>
                  )}
                  {formSendStatus['demographics']?.startsWith('error:') && (
                    <span className="text-xs text-red-600">{formSendStatus['demographics'].replace('error:', '')}</span>
                  )}
                </div>

                {/* Sliding Fee Form */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleSendForm('sliding-fee')}
                    disabled={formSending['sliding-fee'] || !lead.email}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <Send size={14} />
                    {formSending['sliding-fee'] ? 'Sending…' : 'Send Sliding Fee Form'}
                  </button>
                  {formSendStatus['sliding-fee'] === 'success' && (
                    <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Sent to {lead.email}</span>
                  )}
                  {formSendStatus['sliding-fee']?.startsWith('error:') && (
                    <span className="text-xs text-red-600">{formSendStatus['sliding-fee'].replace('error:', '')}</span>
                  )}
                </div>
              </div>
              {!lead.email && (
                <p className="mt-2 text-xs text-amber-600">Add an email address to this lead before sending forms.</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Emails the blank PDF form directly to {lead.email || 'the client'} as an attachment.
              </p>
            </div>
          )}

          {/* Assigned To Section - Only for SuperAdmin and ClientAdmin */}
          {(isSuperAdmin() || isClientAdmin() || user?.role === 'manager') && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <select
                value={assignedTo}
                onChange={(e) => handleAssignmentChange(e.target.value)}
                className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.firstName} {member.lastName} ({member.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Assign this lead to a team member for follow-up
              </p>
            </div>
          )}
          
          {editMode ? (
            /* ── Edit Mode ── */
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Source <span className="text-xs">(read-only)</span></label>
                  <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">{lead.source || '—'}</p>
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Internal notes about this lead..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleEditCancel}
                  disabled={saving}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ── View Mode ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">First Name</label>
                <p className="mt-1 text-gray-900">{lead.firstName || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Last Name</label>
                <p className="mt-1 text-gray-900">{lead.lastName || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-gray-900">{lead.email || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone</label>
                <p className="mt-1 text-gray-900">{lead.phoneE164 || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">City</label>
                <p className="mt-1 text-gray-900">{lead.city || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Source</label>
                <p className="mt-1 text-gray-900">{lead.source || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Campaign</label>
                <p className="mt-1 text-gray-900">{lead.campaignName || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-gray-900">{formatDate(lead.createdAt)}</p>
              </div>
              {lead.notes && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Notes</label>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* All Form Fields */}
        {lead.originalPayload && Object.keys(lead.originalPayload).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">All Form Fields</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(lead.originalPayload)
                .filter(([key]) => !['original_payload', '_id', 'tenantId'].includes(key))
                .map(([key, value]) => {
                  // Skip label keys (they're metadata used below)
                  if (key.includes('_label_') || key.endsWith('_label')) return null;
                  
                  // Try to get friendly label - use the EXACT pattern from Pro Forms plugin
                  let friendlyLabel = null;
                  
                  // Pattern 1: pro_field_label_* (WordPress Pro Forms - PROVEN WORKING)
                  if (key.startsWith('pro_field_')) {
                    const labelKey = key.replace('pro_field_', 'pro_field_label_');
                    friendlyLabel = lead.originalPayload[labelKey];
                  }
                  
                  // Pattern 2: elementor_field_label_* (Elementor - same structure)
                  else if (key.startsWith('elementor_field_')) {
                    const labelKey = key.replace('elementor_field_', 'elementor_field_label_');
                    friendlyLabel = lead.originalPayload[labelKey];
                  }
                  
                  // Pattern 3: cf7_label_* (Contact Form 7)
                  else if (key.startsWith('cf7_')) {
                    const labelKey = `cf7_label_${key.replace('cf7_', '')}`;
                    friendlyLabel = lead.originalPayload[labelKey];
                  }
                  
                  // Fallback: Format the key nicely
                  if (!friendlyLabel) {
                    friendlyLabel = key
                      .replace(/_/g, ' ')
                      .replace(/pro field /g, '')
                      .replace(/elementor field /g, '')
                      .replace(/elementor /g, '')
                      .replace(/cf7 /g, '')
                      .split(' ')
                      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ');
                  }
                  
                  // Format value
                  let displayValue = value;
                  if (typeof value === 'object') {
                    displayValue = JSON.stringify(value, null, 2);
                  } else if (value === null || value === undefined || value === '') {
                    return null; // Skip empty values
                  }
                  
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-500">
                        {friendlyLabel}
                      </label>
                      <p className="mt-1 text-gray-900 break-words">
                        {String(displayValue)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Documents (Open Arms Initiative only) ── */}
        {tenantFeatures.initiativeForms && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Paperclip size={20} className="text-gray-500" /> Documents
              </h2>

              {/* Upload controls */}
              {hasPermission('canEditLeads') && !isExecutive() && (
                <div className="flex items-center gap-2">
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="text-sm px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="demographics">Demographics Form</option>
                    <option value="sliding_fee">Sliding Fee Application</option>
                    <option value="other">Other</option>
                  </select>
                  <label className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors duration-200 ${uploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                    <Upload size={14} />
                    {uploading ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Upload status feedback */}
            {uploadStatus === 'success' && (
              <div className="mb-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
                <CheckCircle size={14} /> File uploaded successfully.
              </div>
            )}
            {uploadStatus?.startsWith('error:') && (
              <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {uploadStatus.replace('error:', '')}
              </div>
            )}

            {/* Document list */}
            {docsLoading ? (
              <p className="text-sm text-gray-500 py-4 text-center">Loading documents…</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No documents uploaded yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {documents.map((doc) => {
                  const typeLabels = { demographics: 'Demographics Form', sliding_fee: 'Sliding Fee Application', other: 'Document' };
                  return (
                    <div key={doc._id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {typeLabels[doc.type] || doc.type} &middot; {(doc.fileSize / 1024).toFixed(1)} KB &middot; {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <a
                        href={leadsApi.downloadDocumentUrl(params.id, doc._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                      >
                        <Download size={14} /> Download
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Activities */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Activity Timeline</h2>
            {hasPermission('canEditLeads') && !isExecutive() && (
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                {showActivityForm ? 'Cancel' : '+ Add Activity'}
              </button>
            )}
          </div>

          {/* Activity Form */}
          {showActivityForm && (
            <form onSubmit={handleAddActivity} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Type
                  </label>
                  <select
                    value={activityForm.type}
                    onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="note">Note</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="status_change">Status Change</option>
                  </select>
                </div>

                {activityForm.type === 'status_change' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Stage
                    </label>
                    <select
                      value={activityForm.stage}
                      onChange={(e) => setActivityForm({ ...activityForm, stage: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select stage...</option>
                      {stages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage.replace(/_/g, ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activityForm.type === 'note' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={activityForm.title}
                      onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Note title"
                    />
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Details
                </label>
                <textarea
                  value={activityForm.note}
                  onChange={(e) => setActivityForm({ ...activityForm, note: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Activity details..."
                  required
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
              >
                Save Activity
              </button>
            </form>
          )}

          {/* Activity List */}
          <div className="space-y-4">
            {activities.length === 0 && (
              <p className="text-gray-500 text-center py-8">No activities yet</p>
            )}
            {activities.map((activity) => (
              <div key={activity._id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-start">
                  <span className="mr-3 mt-0.5 flex-shrink-0">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {activity.type.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        {activity.content?.title && (
                          <p className="text-sm font-semibold text-gray-700">
                            {activity.content.title}
                          </p>
                        )}
                        {activity.content?.note && (
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.content.note}
                          </p>
                        )}
                        {activity.type === 'utm_snapshot' && (
                          <div className="text-sm text-gray-600 mt-1">
                            {Object.entries(activity.content).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {value}
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
