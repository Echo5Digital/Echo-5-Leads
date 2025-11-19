'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTenant } from '@/lib/TenantContext';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedTenant, switchTenant, tenants, setTenants } = useTenant();
  const { 
    user, 
    isAuthenticated, 
    loading: authLoading, 
    logout, 
    hasPermission,
    isSuperAdmin,
    isClientAdmin,
    isMember,
    apiCall
  } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch tenants on mount (authenticated users only) - MUST be called before any early returns
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchTenants() {
      try {
        const response = await apiCall('/api/tenants');
        const data = await response.json();
        const tenantsList = data.tenants || [];
        setTenants(tenantsList);
        
        // Auto-select user's tenant or first tenant
        if (!selectedTenant && tenantsList.length > 0) {
          const userTenant = user?.tenantId ? 
            tenantsList.find(t => t._id === user.tenantId) : 
            tenantsList[0];
          switchTenant(userTenant || tenantsList[0]);
        }
      } catch (error) {
        console.error('Failed to fetch tenants:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTenants();
  }, [isAuthenticated, user]);

  // Handle authentication redirects
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Role-based menu items
  const getMenuItems = () => {
    const allItems = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
        roles: ['super_admin', 'client_admin', 'member']
      },
      {
        name: isMember() ? 'My Leads' : 'All Leads',
        href: '/leads',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        roles: ['super_admin', 'client_admin', 'member']
      },
      {
        name: 'Add New Lead',
        href: '/leads/new',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        ),
        roles: ['super_admin', 'client_admin']
      },
      {
        name: 'Clients/Tenants',
        href: '/clients',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        roles: ['super_admin']
      },
      {
        name: 'Team Members',
        href: '/team',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        ),
        roles: ['super_admin', 'client_admin']
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        roles: ['super_admin', 'client_admin', 'member']
      }
    ];

    // Filter menu items based on user role
    return allItems.filter(item => 
      item.roles.includes(user?.role)
    );
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Early returns AFTER all hooks are declared
  // Hide sidebar on login and unauthorized pages
  if (pathname === '/login' || pathname === '/unauthorized') {
    return null;
  }

  // Show loading or redirect to login if not authenticated
  if (authLoading) {
    return (
      <div className="fixed top-0 left-0 w-64 h-full bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="w-64 bg-gray-900 min-h-screen fixed left-0 top-0 text-white">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Echo5 Leads</h1>
        <p className="text-xs text-gray-400 mt-1">Lead Management</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="w-full flex items-center gap-3 px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user?.role?.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            <svg className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* User Dropdown */}
          {showUserDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-lg z-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-700 transition-colors text-red-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4">
        <ul className="space-y-2">
          {getMenuItems().map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800">
        {/* Current Context Info */}
        <div className="p-4">
          <div className="text-xs text-gray-400">
            {isClientAdmin() || isMember() ? (
              // Show user's tenant info
              user?.tenant && (
                <>
                  <p className="font-medium text-gray-300">{user.tenant.name}</p>
                  <p className="mt-1">Your Organization</p>
                </>
              )
            ) : (
              // Show selected tenant for SuperAdmin
              selectedTenant && (
                <>
                  <p className="font-medium text-gray-300">{selectedTenant.name}</p>
                  <p className="mt-1">ID: {selectedTenant._id.substring(0, 8)}...</p>
                  <p>API Keys: {selectedTenant.activeApiKeys || 0}</p>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
