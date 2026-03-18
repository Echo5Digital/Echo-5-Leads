'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useTenant } from '@/lib/TenantContext';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch(endpoint) {
  const token = Cookies.get('accessToken');
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
}

const QUALIFIED_STAGES = ['qualified', 'orientation', 'application', 'home_study', 'licensed', 'placement'];

export default function ExecutiveDashboard() {
  const { user, isExecutive, isSuperAdmin, loading: authLoading } = useAuth();
  const { selectedTenant, getStages } = useTenant();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [slaData, setSlaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Guard: only CEO/CFO (and super_admin for preview) can access this page
  useEffect(() => {
    if (!authLoading && user && !isExecutive() && !isSuperAdmin()) {
      router.replace('/dashboard');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user, selectedTenant]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (isSuperAdmin() && selectedTenant) {
        params.set('tenantId', selectedTenant._id);
      }
      const query = params.toString() ? `?${params.toString()}` : '';

      const [statsData, slaResult] = await Promise.all([
        apiFetch(`/api/dashboard/stats${query}`),
        apiFetch('/api/sla/overdue'),
      ]);

      setStats(statsData);
      setSlaData(slaResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading executive dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Derived KPIs
  const qualifiedLeads = QUALIFIED_STAGES.reduce(
    (sum, stage) => sum + (stats.stageDistribution?.[stage] || 0),
    0
  );
  const totalLeads = stats.totalLeads || 0;
  const qualifiedPct = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0.0';
  const slaCompliance = stats.pctWithinSLA ?? null;
  const avgContact = stats.avgTimeToContact;
  const overdueCount = slaData?.totalOverdue || 0;
  const overdueLeads = slaData?.tenants?.flatMap(t => t.leads) || [];
  const teamPerformance = stats.teamPerformance || [];

  const stageOrder = getStages();
  const stageEntries = stageOrder.map(s => [s, stats.stageDistribution?.[s] || 0]);
  const maxStageCount = Math.max(...stageEntries.map(([, v]) => v), 1);

  const sourceEntries = (stats.sourceDistribution || []).slice(0, 8);
  const totalSourceLeads = sourceEntries.reduce((s, r) => s + r.count, 0) || 1;
  const maxSourceCount = Math.max(...sourceEntries.map(r => r.count), 1);

  const roleLabel = user?.role?.toUpperCase() || 'EXECUTIVE';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const roleColor = user?.role === 'ceo' ? 'bg-purple-600' : 'bg-blue-600';

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <div className="bg-[#0d1424] border-b border-gray-800/60 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 ${roleColor} text-white text-xs font-bold rounded-full uppercase tracking-widest`}>
              {roleLabel}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Executive Dashboard</h1>
              <p className="text-gray-500 text-xs mt-0.5">{today}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-7">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Total Leads" value={totalLeads.toLocaleString()} accent="blue"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <KpiCard label="Qualified Leads" value={qualifiedLeads.toLocaleString()} sub={`${qualifiedPct}% of total`} accent="emerald"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <KpiCard label="SLA Compliance" value={slaCompliance !== null ? `${slaCompliance}%` : 'N/A'} accent={slaCompliance !== null && slaCompliance < 80 ? 'red' : 'emerald'}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          />
          <KpiCard label="Avg. Time to Contact" value={avgContact !== null ? `${avgContact}h` : 'N/A'} sub="from lead creation" accent="amber"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <KpiCard label="SLA Overdue" value={overdueCount} sub={overdueCount > 0 ? 'Needs attention' : 'All clear'} accent={overdueCount > 0 ? 'red' : 'emerald'} alert={overdueCount > 0}
            icon={overdueCount > 0
              ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
            }
          />
        </div>

        {/* Two-column: Funnel + Source */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Lead Funnel */}
          <Card title="Lead Funnel" sub="Distribution by pipeline stage">
            <div className="space-y-2.5">
              {stageEntries.length === 0 ? (
                <p className="text-gray-500 text-sm">No stage data available.</p>
              ) : (
                stageEntries.map(([stage, count]) => {
                  const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : '0.0';
                  const barWidth = maxStageCount > 0 ? (count / maxStageCount) * 100 : 0;
                  return (
                    <div key={stage} className="flex items-center gap-3 group">
                      <div className="w-28 text-xs font-medium text-gray-400 capitalize truncate group-hover:text-gray-200 transition-colors">
                        {stage.replace(/_/g, ' ')}
                      </div>
                      <div className="flex-1 bg-gray-800/70 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 flex items-center justify-end pr-2.5 transition-all duration-500"
                          style={{ width: `${barWidth}%`, minWidth: count > 0 ? '36px' : '0' }}
                        >
                          {count > 0 && <span className="text-xs font-bold text-white">{count}</span>}
                        </div>
                      </div>
                      <div className="w-11 text-right text-xs text-gray-500 group-hover:text-gray-300 transition-colors">{pct}%</div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Source Performance */}
          <Card title="Source Performance" sub="Lead volume by acquisition source">
            {sourceEntries.length === 0 ? (
              <p className="text-gray-500 text-sm">No source data available.</p>
            ) : (
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0d1424' }} className="text-xs text-gray-500 uppercase border-b border-gray-800">
                    <th className="text-left pb-2.5">Source</th>
                    <th className="text-right pb-2.5 w-16">Leads</th>
                    <th className="text-right pb-2.5 w-16">Share</th>
                    <th className="pb-2.5 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {sourceEntries.map(({ source, count }) => {
                    const sharePct = ((count / totalSourceLeads) * 100).toFixed(1);
                    const barW = (count / maxSourceCount) * 100;
                    return (
                      <tr
                        key={source}
                        className="text-sm border-b border-gray-800 transition-colors group"
                        style={{ backgroundColor: '#0d1424' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e2a3a'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0d1424'}
                      >
                        <td className="py-2.5 text-gray-300 capitalize group-hover:text-white transition-colors pr-2">{source || 'Unknown'}</td>
                        <td className="py-2.5 text-right font-semibold text-white w-16">{count}</td>
                        <td className="py-2.5 text-right text-gray-500 w-16">{sharePct}%</td>
                        <td className="py-2.5 w-24 pl-3">
                          <div className="bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${barW}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#0d1424' }} className="text-sm font-bold border-t border-gray-700">
                    <td className="pt-2.5 text-gray-400">Total</td>
                    <td className="pt-2.5 text-right text-white">{totalLeads}</td>
                    <td className="pt-2.5 text-right text-gray-500">100%</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </Card>
        </div>

        {/* SLA Alerts */}
        <Card title="SLA Alerts" sub="Leads that have exceeded response SLA"
          badge={overdueCount > 0 ? { text: `${overdueCount} Overdue`, color: 'red' } : null}>
          {overdueCount === 0 ? (
            <div className="flex items-center gap-3 py-3">
              <span className="text-2xl">✅</span>
              <p className="text-emerald-400 font-medium">All leads are within SLA. Great work!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-600 uppercase border-b border-gray-800">
                    <th className="text-left pb-2.5">Lead Name</th>
                    <th className="text-left pb-2.5">Stage</th>
                    <th className="text-right pb-2.5">Hours Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {overdueLeads.slice(0, 10).map((lead) => (
                    <tr key={lead._id} className="text-sm border-b border-gray-800 transition-colors group" style={{ backgroundColor: '#0d1424' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e2a3a'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0d1424'}>
                      <td className="py-2.5 text-gray-300 group-hover:text-white transition-colors">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs capitalize">
                          {lead.stage?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-red-400 font-bold">{Math.round(lead.hoursOverdue)}h</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overdueLeads.length > 10 && (
                <p className="text-xs text-gray-600 mt-3 text-right">
                  +{overdueLeads.length - 10} more overdue leads
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Team Performance */}
        {teamPerformance.length > 0 && (
          <Card title="Team Performance" sub="Assigned leads and activity logged per team member">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-600 uppercase border-b border-gray-800">
                    <th className="text-left pb-2.5">Member</th>
                    <th className="text-left pb-2.5">Role</th>
                    <th className="text-right pb-2.5">Assigned</th>
                    <th className="text-right pb-2.5">Activities</th>
                    <th className="text-right pb-2.5">Calls</th>
                    <th className="text-right pb-2.5">Emails</th>
                    <th className="text-right pb-2.5">Notes</th>
                    <th className="text-right pb-2.5">SMS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {teamPerformance.map((member, i) => (
                    <tr key={i} className="text-sm border-b border-gray-800 transition-colors group" style={{ backgroundColor: '#0d1424' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e2a3a'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0d1424'}>
                      <td className="py-2.5 text-gray-200 font-medium group-hover:text-white transition-colors">{member.name}</td>
                      <td className="py-2.5 text-gray-500 capitalize text-xs">{member.role?.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 text-right font-bold text-white">{member.assignedLeads}</td>
                      <td className="py-2.5 text-right text-gray-300">{member.activitiesTotal}</td>
                      <td className="py-2.5 text-right text-gray-500">{member.calls}</td>
                      <td className="py-2.5 text-right text-gray-500">{member.emails}</td>
                      <td className="py-2.5 text-right text-gray-500">{member.notes}</td>
                      <td className="py-2.5 text-right text-gray-500">{member.sms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pipeline Snapshot */}
        <div>
          <h2 className="text-base font-semibold text-gray-300 mb-3 uppercase tracking-wider text-xs">Pipeline Snapshot</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {stageEntries.slice(0, 10).map(([stage, count]) => (
              <div key={stage} className="bg-[#0d1424] border border-gray-800/60 rounded-xl p-4 text-center hover:border-gray-600 transition-colors">
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-gray-500 capitalize mt-1">{stage.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// Reusable card wrapper
function Card({ title, sub, badge, children }) {
  return (
    <div className="bg-[#0d1424] rounded-xl border border-gray-800/60 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {badge && (
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
            badge.color === 'red' ? 'bg-red-900/60 text-red-300' : 'bg-emerald-900/60 text-emerald-300'
          }`}>
            {badge.text}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// KPI card
function KpiCard({ label, value, sub, icon, accent = 'blue', alert = false }) {
  const accentMap = {
    blue:    { border: 'border-blue-500/40',    bg: 'bg-blue-500/10',    text: 'text-blue-300',    bar: 'bg-blue-500' },
    emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-300', bar: 'bg-emerald-500' },
    red:     { border: 'border-red-500/40',     bg: 'bg-red-500/10',     text: 'text-red-300',     bar: 'bg-red-500' },
    amber:   { border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   text: 'text-amber-300',   bar: 'bg-amber-500' },
  };
  const c = accentMap[accent] || accentMap.blue;
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 relative overflow-hidden ${alert ? 'animate-pulse' : ''}`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar}`} />
      <div className={`mb-3 ${c.text}`}>{icon}</div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1 font-medium">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}
