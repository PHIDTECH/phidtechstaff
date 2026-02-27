"use client";
import { useState, useEffect } from "react";
import { companies as defaultCompanies } from "./data";
import type { Company } from "./types";

const STORAGE_KEY = "phidtech_companies";
const ACTIVE_KEY = "phidtech_active_company";

export function useCompanies() {
  const [companiesList, setCompaniesList] = useState<Company[]>(defaultCompanies);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string>(defaultCompanies[0]?.id ?? "c1");

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCompaniesList(JSON.parse(stored));
      const active = localStorage.getItem(ACTIVE_KEY);
      if (active) setActiveCompanyIdState(active);
    } catch {}
  };

  useEffect(() => {
    loadFromStorage();
    window.addEventListener("phidtech_companies_updated", loadFromStorage);
    return () => window.removeEventListener("phidtech_companies_updated", loadFromStorage);
  }, []);

  const saveCompanies = (list: Company[]) => {
    setCompaniesList(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event("phidtech_companies_updated"));
    } catch {}
  };

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
      window.dispatchEvent(new Event("phidtech_companies_updated"));
    } catch {}
  };

  const addCompany = (company: Omit<Company, "id" | "createdAt">) => {
    const newCompany: Company = {
      ...company,
      id: `c${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const updated = [...companiesList, newCompany];
    saveCompanies(updated);
    setActiveCompanyId(newCompany.id);
    return newCompany;
  };

  const editCompany = (id: string, data: Omit<Company, "id" | "createdAt">) => {
    const updated = companiesList.map(c =>
      c.id === id ? { ...c, ...data } : c
    );
    saveCompanies(updated);
  };

  const activeCompany = companiesList.find(c => c.id === activeCompanyId) ?? companiesList[0];

  return { companiesList, activeCompanyId, activeCompany, setActiveCompanyId, addCompany, editCompany };
}
