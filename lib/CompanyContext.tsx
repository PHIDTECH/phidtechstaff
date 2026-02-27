"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { companies as defaultCompanies } from "./data";
import type { Company } from "./types";

const STORAGE_KEY = "phidtech_companies";
const ACTIVE_KEY = "phidtech_active_company";

interface CompanyContextType {
  companiesList: Company[];
  activeCompanyId: string;
  activeCompany: Company | undefined;
  hydrated: boolean;
  setActiveCompanyId: (id: string) => void;
  addCompany: (c: Omit<Company, "id" | "createdAt">) => Company;
  editCompany: (id: string, c: Omit<Company, "id" | "createdAt">) => void;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readLSString(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companiesList, setCompaniesList] = useState<Company[]>(
    () => readLS<Company[]>(STORAGE_KEY, defaultCompanies)
  );
  const [activeCompanyId, setActiveCompanyIdState] = useState<string>(
    () => readLSString(ACTIVE_KEY, defaultCompanies[0]?.id ?? "c1")
  );
  const [hydrated, setHydrated] = useState(true);

  useEffect(() => {
    // Re-read on mount in case SSR gave wrong values
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCompaniesList(JSON.parse(stored));
      const active = localStorage.getItem(ACTIVE_KEY);
      if (active) setActiveCompanyIdState(active);
    } catch {}
  }, []);

  const persist = (list: Company[]) => {
    setCompaniesList(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
  };

  const addCompany = (data: Omit<Company, "id" | "createdAt">): Company => {
    const newCompany: Company = { ...data, id: `c${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    persist([...companiesList, newCompany]);
    setActiveCompanyId(newCompany.id);
    return newCompany;
  };

  const editCompany = (id: string, data: Omit<Company, "id" | "createdAt">) => {
    persist(companiesList.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const activeCompany = companiesList.find(c => c.id === activeCompanyId) ?? companiesList[0];

  return (
    <CompanyContext.Provider value={{ companiesList, activeCompanyId, activeCompany, hydrated, setActiveCompanyId, addCompany, editCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

const fallback: CompanyContextType = {
  companiesList: defaultCompanies,
  activeCompanyId: defaultCompanies[0]?.id ?? "c1",
  activeCompany: defaultCompanies[0],
  hydrated: false,
  setActiveCompanyId: () => {},
  addCompany: (c) => ({ ...c, id: "c1", createdAt: "" }),
  editCompany: () => {},
};

export function useCompanyContext() {
  const ctx = useContext(CompanyContext);
  return ctx ?? fallback;
}
