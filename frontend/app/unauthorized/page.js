'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Access Denied
        </h1>
        
        <p className="mt-2 text-gray-600">
          You don't have permission to access this page.
        </p>
        
        {user && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Current Role:</strong> {user.role}
            </p>
            {user.tenant && (
              <p className="text-sm text-gray-700">
                <strong>Tenant:</strong> {user.tenant.name}
              </p>
            )}
          </div>
        )}
        
        <div className="mt-6 space-x-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
          
          <button
            onClick={logout}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}