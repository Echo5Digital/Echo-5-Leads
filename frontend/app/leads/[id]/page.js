'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { leadsApi, usersApi, STAGES } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

export default function LeadDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, isSuperAdmin, isClientAdmin } = useAuth();
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
      note: '📝',
      call: '📞',
      email: '✉️',
      sms: '💬',
      status_change: '🔄',
      utm_snapshot: '🔗',
    };
    return icons[type] || '•';
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
            <Link href="/" className="text-blue-600 hover:text-blue-900 mt-2 inline-block">
              ← Back to Leads
            </Link>
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
          <Link href="/" className="text-blue-600 hover:text-blue-900 mb-4 inline-block">
            ← Back to Leads
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {lead.firstName} {lead.lastName}
          </h1>
          <div className="mt-2">
            <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
              {lead.stage.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Lead Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
          
          {/* Assigned To Section - Only for SuperAdmin and ClientAdmin */}
          {(isSuperAdmin() || isClientAdmin()) && (
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-gray-900">{lead.email || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone</label>
              <p className="mt-1 text-gray-900">{lead.phoneE164 || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">City</label>
              <p className="mt-1 text-gray-900">{lead.city || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Source</label>
              <p className="mt-1 text-gray-900">{lead.source || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Campaign</label>
              <p className="mt-1 text-gray-900">{lead.campaignName || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Created</label>
              <p className="mt-1 text-gray-900">{formatDate(lead.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* All Form Fields */}
        {lead.originalPayload && Object.keys(lead.originalPayload).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">All Form Fields</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(lead.originalPayload)
                .filter(([key]) => !['original_payload', '_id', 'tenantId'].includes(key))
                .map(([key, value]) => {
                  // Try to get friendly label from pro_field_label_* keys
                  const labelKey = `pro_field_label_${key.replace('pro_field_', '')}`;
                  const friendlyLabel = lead.originalPayload[labelKey] || 
                                       key.replace(/_/g, ' ')
                                          .replace(/pro field /g, '')
                                          .replace(/elementor field /g, '')
                                          .replace(/cf7 /g, '')
                                          .split(' ')
                                          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                          .join(' ');
                  
                  // Skip label keys (they're used above)
                  if (key.includes('_label_')) return null;
                  
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
                        {typeof displayValue === 'string' && displayValue.length > 100 
                          ? displayValue.substring(0, 100) + '...' 
                          : String(displayValue)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Activities */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Activity Timeline</h2>
            <button
              onClick={() => setShowActivityForm(!showActivityForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              {showActivityForm ? 'Cancel' : '+ Add Activity'}
            </button>
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
                      {STAGES.map((stage) => (
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
                  <span className="text-2xl mr-3">{getActivityIcon(activity.type)}</span>
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
