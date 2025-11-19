'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function ProtectedRoute({ children, requiredRole = null, requiredPermissions = [] }) {
  const { isAuthenticated, loading, user, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Check role requirement
      if (requiredRole && user?.role !== requiredRole) {
        router.push('/unauthorized');
        return;
      }

      // Check permission requirements
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(permission => 
          hasPermission(permission)
        );
        
        if (!hasAllPermissions) {
          router.push('/unauthorized');
          return;
        }
      }
    }
  }, [loading, isAuthenticated, user, requiredRole, requiredPermissions, router, hasPermission]);

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || 
      (requiredRole && user?.role !== requiredRole) ||
      (requiredPermissions.length > 0 && !requiredPermissions.every(p => hasPermission(p)))) {
    return null;
  }

  return children;
}