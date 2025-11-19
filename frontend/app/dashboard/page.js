'use client';

import { useState, useEffect } from 'react';
import { leadsApi, tenantsApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useTenant } from '@/lib/TenantContext';
import Link from 'next/link';
import PageContainer from '../components/PageContainer';
import { Card, CardHeader, StatCard, LoadingSpinner, ErrorMessage, Button } from '../components/UIComponents';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [overdueData, setOverdueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const { user } = useAuth();
  const { getStages } = useTenant();

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  // Get dynamic stages from tenant config
  const stages = getStages();

  useEffect(() => {
    loadStats();
    loadOverdueLeads();
  }, [selectedTenant]);

  useEffect(() => {
    // Load tenants for SuperAdmin users
    if (user?.role === 'super_admin') {
      loadTenants();
    }
  }, [user]);

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

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      
      // Add tenantId to params if a specific tenant is selected
      const params = {};
      if (selectedTenant) {
        params.tenantId = selectedTenant;
      }
      
      const data = await leadsApi.getDashboardStats(params);
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOverdueLeads() {
    try {
      let url = `${API_URL}/api/sla/overdue`;
      if (selectedTenant) {
        url += `?tenantId=${selectedTenant}`;
      }
      
      const response = await fetch(url, {
        headers: { 'X-Tenant-Key': API_KEY },
      });
      const data = await response.json();
      setOverdueData(data);
    } catch (err) {
      console.error('Failed to load overdue leads:', err);
    }
  }

  if (loading) {
    return (
      <PageContainer title="Dashboard" subtitle="Overview of your leads and pipeline">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Dashboard">
        <ErrorMessage message={error} onRetry={loadStats} />
      </PageContainer>
    );
  }

  const maxCount = Math.max(...Object.values(stats.stageDistribution || {}), 1);

  return (
    <PageContainer 
      title="Dashboard"
      subtitle="Overview of your leads and pipeline"
      actions={
        <Link href="/leads">
          <Button variant="primary">View All Leads</Button>
        </Link>
      }
    >
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
                  Viewing: {tenants.find(t => t._id === selectedTenant)?.name || 'Unknown'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          label="Total Leads" 
          value={stats.totalLeads}
          icon="📊"
        />

        <StatCard 
          label="Leads This Week" 
          value={stats.leadsThisWeek}
          icon="📈"
        />

        <StatCard 
          label="Avg. Time to First Contact" 
          value={stats.avgTimeToContact !== null ? `${stats.avgTimeToContact}h` : 'N/A'}
          icon="⏱️"
        />

        <StatCard 
          label={overdueData?.totalOverdue > 0 ? '⚠️ Overdue Leads' : '% Within SLA'}
          value={overdueData?.totalOverdue > 0 ? overdueData.totalOverdue : `${stats.pctWithinSLA.toFixed(1)}%`}
          alert={overdueData?.totalOverdue > 0}
          trend={overdueData?.totalOverdue > 0 ? 'Require immediate attention' : null}
        />
      </div>

      {/* Lead Funnel */}
      <Card className="mb-8">
        <CardHeader 
          title="Lead Funnel" 
          subtitle="Distribution by stage"
        />
        <div className="space-y-3">
          {stages.map((stage) => {
            const count = stats.stageDistribution[stage] || 0;
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            
            return (
              <div key={stage} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700 capitalize">
                  {stage.replace(/_/g, ' ')}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-10 relative overflow-hidden">
                  <div
                    className="bg-blue-600 h-full flex items-center justify-end pr-4 text-white text-sm font-semibold transition-all duration-500 shadow-inner"
                    style={{ width: `${percentage}%`, minWidth: count > 0 ? '50px' : '0' }}
                  >
                    {count > 0 && <span>{count}</span>}
                  </div>
                </div>
                <div className="w-16 text-right text-sm text-gray-500">
                  {count > 0 && `${((count / stats.totalLeads) * 100).toFixed(1)}%`}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Source Distribution */}
      <Card>
        <CardHeader 
          title="Lead Sources" 
          subtitle="Where your leads are coming from"
        />
        <div className="space-y-2">
          {stats.sourceDistribution.length === 0 && (
            <p className="text-gray-500 text-sm py-8 text-center">No leads yet</p>
          )}
          {stats.sourceDistribution.map((item) => (
            <div key={item.source} className="flex justify-between items-center py-3 px-4 rounded-lg hover:bg-gray-50 transition">
              <span className="text-gray-700 font-medium capitalize">{item.source || 'Unknown'}</span>
              <span className="font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-full text-sm">{item.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}
