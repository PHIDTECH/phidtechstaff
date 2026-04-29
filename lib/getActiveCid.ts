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
const GROUP_ROLES = ["group_ceo","group_cfo","group_manager","group_controller","group_hr","group_auditor","group_legal","group_it","group_accountant"];

export function getActiveCid(
  sess: { isSuperAdmin?: boolean; companyId?: string | null; role?: string; position?: string } | null | undefined
): string {
  if (!sess) return "";

  const r = (sess.role ?? "").toLowerCase();
  const p = (sess.position ?? "").toLowerCase();
  const isGroupUser = sess.companyId === "group" || GROUP_ROLES.includes(r) || GROUP_ROLES.includes(p);

  // SuperAdmin and Group HQ staff use ACTIVE_KEY so they can switch between companies
  if (sess.isSuperAdmin || isGroupUser) {
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
