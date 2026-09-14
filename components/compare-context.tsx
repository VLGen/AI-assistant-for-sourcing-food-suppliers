"use client";

import { createContext, useContext, useMemo, useState } from "react";

type CompareContextValue = {
  selectedIds: string[];
  toggleId: (id: string) => void;
  clear: () => void;
  maxItems: number;
};

const CompareContext = createContext<CompareContextValue | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleId = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 4) {
        return [...current.slice(1), id];
      }

      return [...current, id];
    });
  };

  const clear = () => setSelectedIds([]);

  const value = useMemo<CompareContextValue>(
    () => ({ selectedIds, toggleId, clear, maxItems: 4 }),
    [selectedIds],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const context = useContext(CompareContext);

  if (!context) {
    throw new Error("useCompare must be used inside CompareProvider");
  }

  return context;
}
