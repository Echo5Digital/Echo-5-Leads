'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Zap, AlertTriangle, BarChart2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useTenant } from '@/lib/TenantContext';
import Cookies from 'js-cookie';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch(endpoint, token) {
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
const ACTIVE_STAGES = ['new', 'contacted', 'qualified', 'orientation', 'application', 'home_study'];

export default function ExecutiveDashboard() {
  const { user, isExecutive, isStaff, isSuperAdmin, loading: authLoading } = useAuth();
  const { selectedTenant, getStages } = useTenant();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [slaData, setSlaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLines, setActiveLines] = useState({ total: true, qualified: true });
  const [trendView, setTrendView] = useState('week'); // 'week' | 'month'

  useEffect(() => {
    if (!authLoading && user && !isExecutive() && !isStaff() && !isSuperAdmin()) {
      router.replace('/dashboard');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && user) loadData();
  }, [authLoading, user, selectedTenant]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const token = Cookies.get('accessToken');
      const params = new URLSearchParams();
      if (isSuperAdmin() && selectedTenant) params.set('tenantId', selectedTenant._id);
      const query = params.toString() ? `?${params.toString()}` : '';

      // Pass tenantId to sla/overdue so it only fetches for the user's own tenant
      const slaParams = new URLSearchParams();
      if (isSuperAdmin() && selectedTenant) slaParams.set('tenantId', selectedTenant._id);
      else if (user?.tenantId) slaParams.set('tenantId', user.tenantId);
      const slaQuery = slaParams.toString() ? `?${slaParams.toString()}` : '';

      const [statsData, slaResult] = await Promise.all([
        apiFetch(`/api/dashboard/stats${query}`, token),
        apiFetch(`/api/sla/overdue${slaQuery}`, token),
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading Executive Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalLeads = stats.totalLeads || 0;
  const qualifiedLeads = QUALIFIED_STAGES.reduce((s, st) => s + (stats.stageDistribution?.[st] || 0), 0);
  const qualifiedPct = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0.0';
  const activePipelines = ACTIVE_STAGES.reduce((s, st) => s + (stats.stageDistribution?.[st] || 0), 0);
  const slaCompliance = stats.pctWithinSLA ?? null;
  const avgContactHours = stats.avgTimeToContact;
  const avgContactMins = avgContactHours !== null ? Math.round(avgContactHours * 60) : null;
  const overdueCount = slaData?.totalOverdue || 0;
  const overdueLeads = slaData?.tenants?.flatMap(t => t.leads) || [];
  const teamPerformance = stats.teamPerformance || [];
  const sourceEntries = (stats.sourceDistribution || []).slice(0, 8);
  const topSource = sourceEntries[0];

  // Conversion rate: derive from qualified % of total
  let conversionRate = null;

  // Stage order for funnel
  const stageOrder = getStages();
  const stageEntries = stageOrder.map(s => [s, stats.stageDistribution?.[s] || 0]);
  const maxStageCount = Math.max(...stageEntries.map(([, v]) => v), 1);

  // Top closer
  const topCloser = teamPerformance.length > 0
    ? [...teamPerformance].sort((a, b) => b.assignedLeads - a.assignedLeads)[0]
    : null;

  // Top Bottlenecks: largest drop % between consecutive stages
  const bottlenecks = [];
  for (let i = 0; i < stageEntries.length - 1; i++) {
    const [stageA, countA] = stageEntries[i];
    const [stageB, countB] = stageEntries[i + 1];
    if (countA > 0) {
      const drop = ((countA - countB) / countA) * 100;
      bottlenecks.push({ from: stageA, to: stageB, drop: Math.max(0, drop) });
    }
  }
  bottlenecks.sort((a, b) => b.drop - a.drop);
  const topBottlenecks = bottlenecks.slice(0, 3);

  // Executive Alerts
  const alerts = [];
  topBottlenecks.forEach(b => {
    if (b.drop > 35) alerts.push({ color: 'red', text: `High drop: ${fmt(b.from)} → ${fmt(b.to)} (${b.drop.toFixed(0)}%)` });
  });
  if (overdueCount > 0) alerts.push({ color: 'red', text: `${overdueCount} lead${overdueCount > 1 ? 's' : ''} overdue SLA` });
  const qualifiedOverdue = overdueLeads.filter(l => QUALIFIED_STAGES.includes(l.stage)).length;
  if (qualifiedOverdue > 0) alerts.push({ color: 'amber', text: `${qualifiedOverdue} overdue qualified lead${qualifiedOverdue > 1 ? 's' : ''}` });
  if (slaCompliance !== null && slaCompliance < 80) alerts.push({ color: 'red', text: `SLA compliance below target (${slaCompliance}%)` });
  if (slaCompliance !== null && slaCompliance >= 90) alerts.push({ color: 'green', text: `SLA compliance strong at ${slaCompliance}%` });
  if (topCloser) alerts.push({ color: 'green', text: `Top closer: ${topCloser.name} — ${topCloser.assignedLeads} leads` });
  if (alerts.length === 0) alerts.push({ color: 'green', text: 'All systems healthy — no critical alerts' });

  // Lead Volume Trend chart data — weekly or monthly
  const trendData = buildTrendData(trendView === 'month' ? stats.leadVelocityMonthly : stats.leadVelocity);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const roleLabel = user?.role?.toUpperCase() || 'EXECUTIVE';

  return (
    <div className="min-h-screen bg-[#eef2f7]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Executive Dashboard</h1>
              <p className="text-xs text-slate-400">{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-7 space-y-6">

        {/* ── KPI Row ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <KpiCard
            label="Total Leads"
            value={totalLeads.toLocaleString()}
            sub={`+${stats.leadsThisWeek || 0} this week`}
            accent="blue"
            icon={<UsersIcon />}
          />
          <KpiCard
            label="Qualified Leads"
            value={qualifiedLeads.toLocaleString()}
            sub={`${qualifiedPct}% of total`}
            accent="green"
            icon={<CheckIcon />}
          />
          <KpiCard
            label="Conversion Rate"
            value={conversionRate !== null ? `${conversionRate}%` : `${qualifiedPct}%`}
            sub="new → qualified"
            accent="blue"
            icon={<TrendIcon />}
          />
          <KpiCard
            label="SLA Compliance"
            value={slaCompliance !== null ? `${slaCompliance}%` : 'N/A'}
            badge={slaCompliance !== null ? (slaCompliance >= 80 ? { text: 'On Target', color: 'green' } : { text: 'Below Target', color: 'red' }) : null}
            accent={slaCompliance !== null && slaCompliance < 80 ? 'red' : 'green'}
            icon={<ShieldIcon />}
          />
          <KpiCard
            label="Avg Response Time"
            value={avgContactMins !== null ? `${avgContactMins} mins` : 'N/A'}
            sub="from lead creation"
            accent="amber"
            icon={<ClockIcon />}
          />
          <KpiCard
            label="Active Pipelines"
            value={activePipelines.toLocaleString()}
            sub="leads in pipeline"
            accent="indigo"
            icon={<PipeIcon />}
            miniChart={stageEntries.slice(0, 5).map(([, v]) => v)}
          />
          <KpiCard
            label="Top Source"
            value={topSource?.source ? fmtSource(topSource.source) : 'N/A'}
            sub={topSource ? `${topSource.count} leads` : ''}
            accent="violet"
            icon={<StarIcon />}
          />
        </div>

        {/* ── Lead Volume Trend ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-800">Lead Volume Trend</h2>
              {/* Weekly / Monthly toggle */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
                <button
                  onClick={() => setTrendView('week')}
                  className={`px-3 py-1 rounded-md transition-all ${trendView === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setTrendView('month')}
                  className={`px-3 py-1 rounded-md transition-all ${trendView === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Monthly
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ToggleChip
                active={activeLines.total}
                color="#3b82f6"
                label="Total Leads"
                onClick={() => setActiveLines(p => ({ ...p, total: !p.total }))}
              />
              <ToggleChip
                active={activeLines.qualified}
                color="#10b981"
                label="Qualified Leads"
                onClick={() => setActiveLines(p => ({ ...p, qualified: !p.qualified }))}
              />
            </div>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradQualified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#475569', fontWeight: 600 }}
                />
                {activeLines.total && (
                  <Area type="monotone" dataKey="total" name="Total Leads" stroke="#3b82f6" strokeWidth={2} fill="url(#gradTotal)" dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                )}
                {activeLines.qualified && (
                  <Area type="monotone" dataKey="qualified" name="Qualified Leads" stroke="#10b981" strokeWidth={2} fill="url(#gradQualified)" dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              No trend data available yet.
            </div>
          )}
        </div>

        {/* ── Bottom 3-column grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.4fr_1.4fr] gap-5">

          {/* Pipeline Funnel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Pipeline Funnel</h2>
            <p className="text-xs text-slate-400 mb-5">Distribution by stage</p>
            <div className="space-y-2.5">
              {stageEntries.map(([stage, count], i) => {
                const barW = maxStageCount > 0 ? (count / maxStageCount) * 100 : 0;
                const funnelW = Math.max(40, 100 - i * (60 / Math.max(stageEntries.length - 1, 1)));
                const colors = [
                  'bg-blue-600', 'bg-blue-500', 'bg-teal-500', 'bg-emerald-500',
                  'bg-green-500', 'bg-lime-500', 'bg-yellow-400', 'bg-orange-400',
                ];
                const barColor = colors[i % colors.length];
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium text-slate-500 capitalize truncate">
                      {fmt(stage)}
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div style={{ width: `${funnelW}%` }} className="bg-slate-100 rounded h-7 overflow-hidden">
                        <div
                          className={`h-full ${barColor} flex items-center justify-center transition-all duration-500`}
                          style={{ width: `${barW}%`, minWidth: count > 0 ? '44px' : '0' }}
                        >
                          {count > 0 && <span className="text-xs font-bold text-white px-1">{count.toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle column: Top Bottlenecks + Team Performance */}
          <div className="space-y-5">

            {/* Top Bottlenecks */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Top Bottlenecks</h2>
              {topBottlenecks.length === 0 ? (
                <p className="text-slate-400 text-xs">No bottleneck data available.</p>
              ) : (
                <div className="space-y-3">
                  {topBottlenecks.map((b, i) => {
                    const dotColor = b.drop > 35 ? 'bg-red-500' : b.drop > 20 ? 'bg-amber-400' : 'bg-emerald-400';
                    const textColor = b.drop > 35 ? 'text-red-600' : b.drop > 20 ? 'text-amber-600' : 'text-emerald-600';
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
                          <span className="text-xs text-slate-600">
                            <span className="font-medium">{capFirst(fmt(b.from))}</span>
                            <span className="text-slate-400"> → </span>
                            <span className="font-medium">{capFirst(fmt(b.to))}</span>
                          </span>
                        </div>
                        <span className={`text-xs font-bold ${textColor}`}>{b.drop.toFixed(0)}% Drop</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Team Performance (compact) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex-1">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Team Performance</h2>
              <div className="space-y-3">
                {topCloser && (
                  <TeamRow
                    icon={<Trophy size={14} className="text-yellow-500" />}
                    label="Top Closer"
                    value={topCloser.name}
                    sub={`${topCloser.assignedLeads} Leads`}
                    ok
                  />
                )}
                <TeamRow
                  icon={<Zap size={14} className="text-blue-500" />}
                  label="Avg Response"
                  value={avgContactMins !== null ? `${avgContactMins} mins` : 'N/A'}
                  sub="avg. time to contact"
                  ok={avgContactMins !== null && avgContactMins < 30}
                />
                <TeamRow
                  icon={<AlertTriangle size={14} className="text-red-500" />}
                  label="Overdue Leads"
                  value={overdueCount.toString()}
                  sub="Past Due"
                  ok={overdueCount === 0}
                />
                {teamPerformance.length > 1 && (
                  <TeamRow
                    icon={<BarChart2 size={14} className="text-indigo-500" />}
                    label="Team Size"
                    value={teamPerformance.length.toString()}
                    sub="active members"
                    ok
                  />
                )}
              </div>
            </div>
          </div>

          {/* Executive Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Executive Alerts</h2>
            <div className="space-y-3">
              {alerts.map((alert, i) => {
                const dot = alert.color === 'red' ? 'bg-red-500' : alert.color === 'amber' ? 'bg-amber-400' : 'bg-emerald-400';
                const text = alert.color === 'red' ? 'text-slate-700' : 'text-slate-600';
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${dot}`} />
                    <span className={`text-xs leading-relaxed ${text}`}>{alert.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Source Performance mini-list */}
            {sourceEntries.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Top Sources</p>
                <div className="space-y-2">
                  {sourceEntries.slice(0, 4).map(({ source, count }) => {
                    const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                    return (
                      <div key={source} className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 w-20 truncate">{fmtSource(source)}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── SLA Overdue detail (if any) ────────────────────────────────────── */}
        {overdueCount > 0 && (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">SLA Overdue Leads</h2>
                <p className="text-xs text-slate-400 mt-0.5">Leads that have exceeded response SLA</p>
              </div>
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">{overdueCount} Overdue</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                    <th className="text-left pb-2.5 font-medium">Lead Name</th>
                    <th className="text-left pb-2.5 font-medium">Stage</th>
                    <th className="text-right pb-2.5 font-medium">Hours Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {overdueLeads.slice(0, 8).map(lead => (
                    <tr key={lead._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 text-slate-700 font-medium">{lead.firstName} {lead.lastName}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs capitalize">
                          {lead.stage?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-red-500 font-bold">{Math.round(lead.hoursOverdue)}h</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overdueLeads.length > 8 && (
                <p className="text-xs text-slate-400 mt-3 text-right">+{overdueLeads.length - 8} more overdue leads</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(str) { return str?.replace(/_/g, ' ') || ''; }
function capFirst(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

const SOURCE_LABELS = {
  facebook_import: 'Facebook',
  facebook:        'Facebook',
  pro_elements:    'Website Leads',
  pro_element:     'Website Leads',
  manual:          'Manual',
  meta:            'Meta',
  google:          'Google Ads',
  google_ads:      'Google Ads',
  website:         'Website',
};
function fmtSource(src) {
  if (!src) return 'Unknown';
  const key = src.toLowerCase().replace(/\s+/g, '_');
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key];
  if (key.startsWith('pro_element') || key.startsWith('elementor')) return 'Website Leads';
  if (key.startsWith('facebook') || key.startsWith('fb_')) return 'Facebook';
  if (key.startsWith('google')) return 'Google Ads';
  return capFirst(src.replace(/_import$/i, '').replace(/_/g, ' '));
}

function buildTrendData(leadVelocity) {
  if (!Array.isArray(leadVelocity) || leadVelocity.length === 0) return [];
  return leadVelocity;
}

// ── Sub-components ─────────────────────────────────────────────────────────────


function ToggleChip({ active, color, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        active ? 'border-slate-300 text-slate-700 bg-white shadow-sm' : 'border-transparent text-slate-400 bg-transparent'
      }`}
    >
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: active ? color : '#cbd5e1' }} />
      {label}
    </button>
  );
}

function KpiCard({ label, value, sub, badge, accent = 'blue', icon, miniChart }) {
  const accentMap = {
    blue:   { bar: 'bg-blue-500',   icon: 'text-blue-500',   val: 'text-blue-700' },
    green:  { bar: 'bg-emerald-500', icon: 'text-emerald-500', val: 'text-emerald-700' },
    red:    { bar: 'bg-red-500',    icon: 'text-red-500',    val: 'text-red-600' },
    amber:  { bar: 'bg-amber-400',  icon: 'text-amber-500',  val: 'text-amber-700' },
    indigo: { bar: 'bg-indigo-500', icon: 'text-indigo-500', val: 'text-indigo-700' },
    violet: { bar: 'bg-violet-500', icon: 'text-violet-500', val: 'text-violet-700' },
  };
  const c = accentMap[accent] || accentMap.blue;
  const maxMini = miniChart ? Math.max(...miniChart, 1) : 1;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar}`} />
      <div className={`mb-2.5 ${c.icon} w-4 h-4`}>{icon}</div>
      <p className={`text-xl font-bold ${c.val} leading-tight truncate`} title={value}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 font-medium leading-snug">{label}</p>
      {sub && !badge && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      {badge && (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${
          badge.color === 'green' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}>{badge.text}</span>
      )}
      {miniChart && (
        <div className="flex items-end gap-0.5 mt-2 h-6">
          {miniChart.map((v, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${c.bar} opacity-70`}
              style={{ height: `${Math.max(10, (v / maxMini) * 100)}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamRow({ icon, label, value, sub, ok }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-xs text-slate-500">{label}:</span>
        <span className="text-xs font-semibold text-slate-700">{value}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-400">{sub}</span>
        {ok !== undefined && (
          <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
        )}
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function UsersIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function CheckIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function TrendIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
}
function ShieldIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
function ClockIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function PipeIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function StarIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
}
