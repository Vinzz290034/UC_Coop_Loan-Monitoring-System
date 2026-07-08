'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface BreadcrumbContextType {
  breadcrumbLabels: Record<string, string>;
  setBreadcrumbLabel: (key: string, label: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbLabels, setLabels] = useState<Record<string, string>>({});

  const setBreadcrumbLabel = useCallback((key: string, label: string) => {
    setLabels((prev) => {
      if (prev[key] === label) return prev;
      return { ...prev, [key]: label };
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbLabels, setBreadcrumbLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
}
