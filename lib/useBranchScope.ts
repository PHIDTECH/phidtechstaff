"use client";
import { useState, useEffect } from "react";

const SESSION_KEY = "phidtech_session";

export interface BranchSession {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string;
  companyId: string | null;
  branchId: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
}

export interface BranchScope {
  session: BranchSession | null;
  /** The branchId of the logged-in user (null = no branch restriction) */
  branchId: string | null;
  /**
   * true  → user is a branch-level manager; sees ONLY their branch's staff
   * false → general manager / superadmin / group role; sees ALL branches
   */
  isBranchManager: boolean;
  /**
   * Filter a staff array to only those in the same branch as the session.
   * If the user is not branch-scoped, all items are returned unchanged.
   * staff items must have a `branchId` property (may be undefined/null).
   */
  filterByBranch: <T extends { branchId?: string | null }>(items: T[]) => T[];
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * General Manager / admin positions that can see ALL branches within a company.
 * Extend this list as new senior roles are added.
 */
const GENERAL_MANAGER_POSITIONS = [
  "admin", "general_manager", "group_ceo", "group_cfo",
  "group_manager", "group_controller", "group_auditor",
  "group_hr", "group_legal", "group_it",
  "accountant", "hr",
];

export function useBranchScope(): BranchScope {
  const [session, setSession] = useState<BranchSession | null>(null);

  useEffect(() => {
    const sess = lsGet<BranchSession>(SESSION_KEY, null as never);
    setSession(sess);

    const onUpdate = () => {
      const updated = lsGet<BranchSession>(SESSION_KEY, null as never);
      setSession(updated);
    };
    window.addEventListener("phidtech_session_updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("phidtech_session_updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  if (!session) {
    return {
      session: null,
      branchId: null,
      isBranchManager: false,
      filterByBranch: (items) => items,
    };
  }

  const isGroupOrSenior =
    session.isSuperAdmin ||
    GENERAL_MANAGER_POSITIONS.includes(session.position ?? "") ||
    GENERAL_MANAGER_POSITIONS.includes(session.role ?? "");

  // A branch manager = has a branchId assigned AND is not a senior/general role
  const isBranchManager = !isGroupOrSenior && !!session.branchId;

  const filterByBranch = <T extends { branchId?: string | null }>(items: T[]): T[] => {
    if (!isBranchManager || !session.branchId) return items;
    return items.filter((item) => item.branchId === session.branchId);
  };

  return {
    session,
    branchId: session.branchId,
    isBranchManager,
    filterByBranch,
  };
}
