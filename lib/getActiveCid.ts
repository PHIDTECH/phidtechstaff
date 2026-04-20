/**
 * Resolves the correct active company ID for any logged-in user.
 *
 * Rules:
 * - SuperAdmin: uses ACTIVE_KEY (whichever company they've switched to, or "" for Group HQ)
 * - Regular staff: ALWAYS uses their own sess.companyId — never ACTIVE_KEY
 *   (ACTIVE_KEY may reflect a company an admin last switched to on a shared browser)
 *
 * Usage: const cid = getActiveCid(sess);
 */
export function getActiveCid(
  sess: { isSuperAdmin?: boolean; companyId?: string | null } | null | undefined
): string {
  if (!sess) return "";

  if (sess.isSuperAdmin) {
    try {
      const raw = localStorage.getItem("phidtech_active_company") ?? "";
      return raw && raw !== '""' ? raw.replace(/^"|"$/g, "") : "";
    } catch {
      return "";
    }
  }

  // Regular staff: strictly their own companyId
  return sess.companyId ?? "";
}
