'use client';

import { useState, useEffect } from 'react';
import { leadsApi } from '@/lib/api';
import Link from 'next/link';
import PageContainer from '../components/PageContainer';
import { Card, CardHeader, StatCard, LoadingSpinner, ErrorMessage, Button } from '../components/UIComponents';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [overdueData, setOverdueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  useEffect(() => {
    loadStats();
    loadOverdueLeads();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await leadsApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOverdueLeads() {
    try {
      const response = await fetch(`${API_URL}/api/sla/overdue`, {
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

  const stageOrder = ['new', 'contacted', 'qualified', 'orientation', 'application', 'home_study', 'licensed', 'placement', 'not_fit'];
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
          {stageOrder.map((stage) => {
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
