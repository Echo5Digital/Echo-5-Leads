'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const response = await fetch(`${API_URL}/api/analytics/overview`, {
        headers: { 'X-Tenant-Key': API_KEY },
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!analytics || !analytics.summary) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="text-gray-600 mt-2">Advanced insights into your lead pipeline</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Leads</div>
            <div className="text-2xl font-bold">{analytics.summary.totalLeads}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Last 30 Days</div>
            <div className="text-2xl font-bold">{analytics.summary.leadsLast30Days}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Activities</div>
            <div className="text-2xl font-bold">{analytics.summary.totalActivities}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">UTM Touchpoints</div>
            <div className="text-2xl font-bold">{analytics.summary.utmTouchpoints}</div>
          </div>
        </div>

        {/* Conversion Rates */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Conversion Rates by Stage</h2>
          <div className="space-y-4">
            {Object.entries(analytics.conversionRates).map(([key, data]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{key.replace(/_/g, ' ').toUpperCase()}</div>
                  <div className="text-sm text-gray-600">
                    {data.converted} of {data.count} leads
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">{data.rate}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Source Attribution */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Source Attribution (First-Touch)</h2>
          <div className="space-y-3">
            {Object.entries(analytics.sourceAttribution).map(([source, data]) => (
              <div key={source} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium capitalize">{source}</div>
                  <div className="text-sm text-gray-600">
                    {data.total} total leads, {data.licensed} licensed
                  </div>
                </div>
                <div className="text-lg font-bold text-green-600">{data.conversionRate}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Touch Attribution */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Multi-Touch Attribution</h2>
          <p className="text-sm text-gray-600 mb-4">Total touchpoints across all lead journeys</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.multiTouchAttribution).map(([channel, count]) => (
              <div key={channel} className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 capitalize">{channel}</div>
                <div className="text-3xl font-bold text-blue-600">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Average Stage Time */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Average Time in Each Stage (Days)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.averageStageTime).map(([stage, days]) => (
              <div key={stage} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 capitalize">{stage.replace(/_/g, ' ')}</div>
                <div className="text-2xl font-bold">{days}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Quality */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Lead Quality Distribution</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg p-6 text-center">
              <div className="text-sm text-red-600 font-medium">🔥 Hot Leads</div>
              <div className="text-4xl font-bold text-red-600">{analytics.leadQuality.hot}</div>
              <div className="text-xs text-gray-600 mt-2">High activity, progressing fast</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-6 text-center">
              <div className="text-sm text-yellow-600 font-medium">⚠️ Warm Leads</div>
              <div className="text-4xl font-bold text-yellow-600">{analytics.leadQuality.warm}</div>
              <div className="text-xs text-gray-600 mt-2">Moderate activity</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <div className="text-sm text-blue-600 font-medium">❄️ Cold Leads</div>
              <div className="text-4xl font-bold text-blue-600">{analytics.leadQuality.cold}</div>
              <div className="text-xs text-gray-600 mt-2">Low activity, need attention</div>
            </div>
          </div>
        </div>

        {/* Lead Velocity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Lead Velocity (Last 90 Days)</h2>
          <div className="h-64 flex items-end gap-2">
            {Object.entries(analytics.leadVelocity).map(([week, count]) => {
              const maxCount = Math.max(...Object.values(analytics.leadVelocity), 1);
              const height = (count / maxCount) * 100;
              return (
                <div key={week} className="flex-1 flex flex-col items-center">
                  <div className="text-xs font-bold text-gray-600 mb-1">{count}</div>
                  <div 
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-xs text-gray-500 mt-2 rotate-45 origin-left">{week}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
