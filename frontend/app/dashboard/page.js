'use client';

import { useState, useEffect } from 'react';
import { leadsApi } from '@/lib/api';
import Link from 'next/link';

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
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const stageOrder = ['new', 'contacted', 'qualified', 'orientation', 'application', 'home_study', 'licensed', 'placement', 'not_fit'];
  const maxCount = Math.max(...Object.values(stats.stageDistribution || {}), 1);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Overview of your leads and pipeline</p>
          </div>
          <Link
            href="/leads"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            View All Leads
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Total Leads</div>
            <div className="text-4xl font-bold text-gray-900">{stats.totalLeads}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Leads This Week</div>
            <div className="text-4xl font-bold text-gray-900">{stats.leadsThisWeek}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Avg. Time to First Contact</div>
            <div className="text-4xl font-bold text-gray-900">
              {stats.avgTimeToContact !== null ? `${stats.avgTimeToContact}h` : 'N/A'}
            </div>
          </div>

          <div className={`bg-white rounded-lg shadow p-6 ${overdueData?.totalOverdue > 0 ? 'border-2 border-red-400' : ''}`}>
            <div className="text-sm font-medium text-gray-500 mb-2">
              {overdueData?.totalOverdue > 0 ? '⚠️ Overdue Leads' : '% Within SLA'}
            </div>
            <div className={`text-4xl font-bold ${overdueData?.totalOverdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {overdueData?.totalOverdue > 0 ? overdueData.totalOverdue : `${stats.pctWithinSLA.toFixed(1)}%`}
            </div>
            {overdueData?.totalOverdue > 0 && (
              <p className="text-sm text-red-600 mt-2">Require immediate attention</p>
            )}
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Funnel</h2>
          <p className="text-sm text-gray-500 mb-6">(Represented as a horizontal bar chart)</p>
          <div className="space-y-3">
            <div className="text-center text-sm font-medium text-gray-600 mb-4">
              Lead Distribution by Stage
            </div>
            {stageOrder.map((stage) => {
              const count = stats.stageDistribution[stage] || 0;
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <div key={stage} className="flex items-center">
                  <div className="w-32 text-sm text-gray-600 capitalize">
                    {stage.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="bg-blue-500 h-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500"
                      style={{ width: `${percentage}%`, minWidth: count > 0 ? '40px' : '0' }}
                    >
                      {count > 0 && <span>{count}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Sources</h2>
          <div className="space-y-3">
            {stats.sourceDistribution.length === 0 && (
              <p className="text-gray-500 text-sm">No leads yet</p>
            )}
            {stats.sourceDistribution.map((item) => (
              <div key={item.source} className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700 capitalize">{item.source || 'Unknown'}</span>
                <span className="font-semibold text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
