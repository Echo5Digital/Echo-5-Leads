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
  const { user } = useAuth();
  const { getStages, selectedTenant } = useTenant();

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  // Get dynamic stages from tenant config
  const stages = getStages();

  useEffect(() => {
    // Only load stats if we have a selected tenant (for Super Admins) or always load for other roles
    if (user?.role === 'super_admin') {
      if (selectedTenant) {
        loadStats();
        loadOverdueLeads();
      }
    } else {
      loadStats();
      loadOverdueLeads();
    }
  }, [selectedTenant, user]);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      
      // Add tenantId to params if Super Admin and a specific tenant is selected
      const params = {};
      if (user?.role === 'super_admin' && selectedTenant) {
        params.tenantId = selectedTenant._id;
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
      if (user?.role === 'super_admin' && selectedTenant) {
        url += `?tenantId=${selectedTenant._id}`;
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
                Viewing data for: <span className="font-bold">{selectedTenant.name}</span>
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
                Please select a client from the sidebar to view dashboard data
              </p>
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
