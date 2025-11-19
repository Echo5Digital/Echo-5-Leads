'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { leadsApi, STAGES as DEFAULT_STAGES } from './api';

const TenantContext = createContext();

export function TenantProvider({ children }) {
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tenantConfig, setTenantConfig] = useState(null);
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
      // Load tenant config when tenant changes
      loadTenantConfig();
    } else {
      setTenantConfig(null);
    }
  }, [selectedTenant]);

  const loadTenantConfig = async () => {
    if (!selectedTenant?._id) return;
    try {
      const config = await leadsApi.getTenantConfig(selectedTenant._id);
      setTenantConfig(config);
    } catch (error) {
      console.error('Failed to load tenant config:', error);
      // Fallback to default config
      setTenantConfig({ stages: DEFAULT_STAGES });
    }
  };

  const switchTenant = (tenant) => {
    setSelectedTenant(tenant);
  };

  const clearTenant = () => {
    setSelectedTenant(null);
    setTenantConfig(null);
    localStorage.removeItem('selectedTenant');
  };

  // Helper to get stages (from config or default)
  const getStages = () => {
    return tenantConfig?.stages || DEFAULT_STAGES;
  };

  return (
    <TenantContext.Provider value={{ 
      selectedTenant, 
      switchTenant, 
      clearTenant,
      tenants,
      setTenants,
      loading,
      tenantConfig,
      getStages,
      refreshTenantConfig: loadTenantConfig
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
