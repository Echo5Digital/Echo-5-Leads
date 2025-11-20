'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const AuthContext = createContext();

// User roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CLIENT_ADMIN: 'client_admin', 
  MEMBER: 'member'
};

// Permission levels for easier role checking
export const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    canViewAllTenants: true,
    canManageTenants: true,
    canViewAllLeads: true,
    canManageUsers: true,
    canAssignLeads: true
  },
  [ROLES.CLIENT_ADMIN]: {
    canViewAllTenants: false,
    canManageTenants: false,
    canViewAllLeads: false, // Only their tenant's leads
    canManageUsers: true,   // Only their tenant's users
    canAssignLeads: true    // Only within their tenant
  },
  [ROLES.MEMBER]: {
    canViewAllTenants: false,
    canManageTenants: false,
    canViewAllLeads: false, // Only assigned leads
    canManageUsers: false,
    canAssignLeads: true    // Only reassign within same tenant
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // API helper function
  const apiCall = async (url, options = {}) => {
    const token = Cookies.get('accessToken');
    console.log('📞 API Call:', url, 'hasToken:', !!token);
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, config);
    console.log('📡 API Response:', url, 'status:', response.status);
    
    // Handle token expiration - but DON'T call logout here to avoid infinite loop
    if (response.status === 403 && token) {
      console.log('🔄 Token expired, attempting refresh...');
      const refreshSuccess = await refreshToken();
      if (refreshSuccess) {
        // Retry the original request with new token
        console.log('✅ Retrying request with new token');
        config.headers.Authorization = `Bearer ${Cookies.get('accessToken')}`;
        return fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, config);
      } else {
        console.log('❌ Refresh failed');
        // Don't call logout here - let the caller handle it
        throw new Error('Session expired');
      }
    }

    return response;
  };

  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens with proper cookie attributes
        Cookies.set('accessToken', data.accessToken, { 
          expires: 7, 
          path: '/',
          sameSite: 'lax'
        });
        Cookies.set('refreshToken', data.refreshToken, { 
          expires: 30, 
          path: '/',
          sameSite: 'lax'
        });
        
        setUser(data.user);
        setIsAuthenticated(true);
        
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const refreshTokenValue = Cookies.get('refreshToken');
      if (!refreshTokenValue) return false;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      const data = await response.json();

      if (response.ok) {
        Cookies.set('accessToken', data.accessToken, { 
          expires: 7, 
          path: '/',
          sameSite: 'lax'
        });
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to clear server-side refresh token
      await apiCall('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear client-side tokens and state
      Cookies.remove('accessToken', { path: '/' });
      Cookies.remove('refreshToken', { path: '/' });
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Get user profile
  const getUserProfile = async () => {
    try {
      console.log('👤 Getting user profile...');
      const response = await apiCall('/api/auth/profile');
      console.log('📡 Profile response status:', response.status);
      const data = await response.json();

      if (response.ok) {
        console.log('✅ Profile fetched successfully:', data.user.email);
        setUser(data.user);
        setIsAuthenticated(true);
        return data.user;
      } else {
        console.log('❌ Profile fetch failed:', data);
        return null;
      }
    } catch (error) {
      console.error('❌ Get profile error:', error);
      return null;
    }
  };

  // Check permissions
  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    return PERMISSIONS[user.role]?.[permission] || false;
  };

  // Check if user can access specific tenant
  const canAccessTenant = (tenantId) => {
    if (!user) return false;
    
    // SuperAdmin can access all tenants
    if (user.role === ROLES.SUPER_ADMIN) return true;
    
    // Others can only access their own tenant
    return user.tenantId && user.tenantId === tenantId;
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔐 Initializing auth...');
      const token = Cookies.get('accessToken');
      const refreshTokenValue = Cookies.get('refreshToken');
      
      console.log('🍪 Tokens found:', { 
        hasAccessToken: !!token, 
        hasRefreshToken: !!refreshTokenValue 
      });
      console.log('🍪 Tokens found:', { 
        hasAccessToken: !!token, 
        hasRefreshToken: !!refreshTokenValue 
      });
      
      if (token || refreshTokenValue) {
        console.log('📞 Fetching user profile...');
        // Try to get user profile with existing token
        let profile = await getUserProfile();
        console.log('👤 Profile result:', !!profile);
        
        // If profile fetch failed but we have a refresh token, try refreshing
        if (!profile && refreshTokenValue) {
          console.log('🔄 Attempting token refresh...');
          const refreshSuccess = await refreshToken();
          console.log('✅ Refresh success:', refreshSuccess);
          if (refreshSuccess) {
            profile = await getUserProfile();
            console.log('👤 Profile after refresh:', !!profile);
          }
        }
        
        // If still no profile after refresh attempt, clear tokens
        if (!profile) {
          console.log('❌ No profile, clearing tokens');
          Cookies.remove('accessToken', { path: '/' });
          Cookies.remove('refreshToken', { path: '/' });
          setUser(null);
          setIsAuthenticated(false);
        } else {
          console.log('✅ Auth successful, user:', profile.email);
        }
      } else {
        console.log('⚠️ No tokens found');
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  // Update user in context (for profile updates)
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    getUserProfile,
    updateUser,
    hasPermission,
    canAccessTenant,
    apiCall,
    // Helper functions for role checking
    isSuperAdmin: () => user?.role === ROLES.SUPER_ADMIN,
    isClientAdmin: () => user?.role === ROLES.CLIENT_ADMIN,
    isMember: () => user?.role === ROLES.MEMBER,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}