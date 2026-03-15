"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SESSION_KEY = "phidtech_session";

interface Session {
  isSuperAdmin?: boolean;
  permissions?: string[];
}

/**
 * Redirects to /login if there is no session.
 * Redirects to the first permitted page (or /profile) if the user lacks the required permission.
 * Superadmin always passes.
 */
export function usePermissionGuard(requiredPermission: string) {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) { router.replace("/login"); return; }

      const sess: Session = JSON.parse(raw);
      if (!sess) { router.replace("/login"); return; }

      // Superadmin bypasses all permission checks
      if (sess.isSuperAdmin) return;

      const perms: string[] = sess.permissions ?? [];
      if (!perms.includes(requiredPermission)) {
        // Redirect to the first page they do have access to, or profile
        const fallbacks = [
          { perm: "attendance",  href: "/attendance" },
          { perm: "leave",       href: "/leave" },
          { perm: "payroll",     href: "/payroll" },
          { perm: "tasks",       href: "/tasks" },
          { perm: "expenses",    href: "/expenses" },
          { perm: "accounting",  href: "/accounting" },
          { perm: "invoices",    href: "/invoices" },
          { perm: "sales",       href: "/sales" },
          { perm: "reports",     href: "/reports" },
        ];
        const fallback = fallbacks.find(f => perms.includes(f.perm));
        router.replace(fallback ? fallback.href : "/profile");
      }
    } catch {
      router.replace("/login");
    }
  }, [requiredPermission, router]);
}
