'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export function TenantProvider({ children }) {
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load selected tenant from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedTenant');
    if (stored) {
      try {
        setSelectedTenant(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored tenant:', e);
      }
    }
    setLoading(false);
  }, []);

  // Save to localStorage when tenant changes
  useEffect(() => {
    if (selectedTenant) {
      localStorage.setItem('selectedTenant', JSON.stringify(selectedTenant));
    }
  }, [selectedTenant]);

  const switchTenant = (tenant) => {
    setSelectedTenant(tenant);
  };

  const clearTenant = () => {
    setSelectedTenant(null);
    localStorage.removeItem('selectedTenant');
  };

  return (
    <TenantContext.Provider value={{ 
      selectedTenant, 
      switchTenant, 
      clearTenant,
      tenants,
      setTenants,
      loading 
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}
