'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { leadsApi, STAGES as DEFAULT_STAGES } from './api';

const TenantContext = createContext();

export function TenantProvider({ children }) {
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tenantConfig, setTenantConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load selected tenant from localStorage on mount, then load config
  useEffect(() => {
    const stored = localStorage.getItem('selectedTenant');
    let parsed = null;
    if (stored) {
      try {
        parsed = JSON.parse(stored);
        setSelectedTenant(parsed);
      } catch (e) {
        console.error('Failed to parse stored tenant:', e);
      }
    }
    // Always load tenant config on mount — regular users get it via JWT,
    // SuperAdmin gets it via the selectedTenant id
    loadTenantConfig(parsed?._id || null);
    setLoading(false);
  }, []);

  // Save to localStorage and reload config when SuperAdmin switches tenant
  useEffect(() => {
    if (selectedTenant) {
      localStorage.setItem('selectedTenant', JSON.stringify(selectedTenant));
      loadTenantConfig(selectedTenant._id);
    }
  }, [selectedTenant]);

  const loadTenantConfig = async (tenantId = null) => {
    try {
      const config = await leadsApi.getTenantConfig(tenantId);
      setTenantConfig(config);
    } catch (error) {
      console.error('Failed to load tenant config:', error);
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
