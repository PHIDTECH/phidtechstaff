import { readDb, writeDb } from "./serverDb";

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const MAX_ATTEMPTS  = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes lockout

interface RateRecord {
  key: string;          // email or IP
  attempts: number;
  lockedUntil: number;  // 0 = not locked
  lastAttempt: number;
}

export function checkRateLimit(key: string): { blocked: boolean; minutesLeft?: number } {
  const records = readDb<RateRecord[]>("login_rate_limit", []);
  const now = Date.now();
  const rec = records.find(r => r.key === key);
  if (!rec) return { blocked: false };
  if (rec.lockedUntil > now) {
    const minutesLeft = Math.ceil((rec.lockedUntil - now) / 60000);
    return { blocked: true, minutesLeft };
  }
  return { blocked: false };
}

export function recordFailedAttempt(key: string): { locked: boolean; attemptsLeft: number } {
  const records = readDb<RateRecord[]>("login_rate_limit", []);
  const now = Date.now();
  const idx = records.findIndex(r => r.key === key);
  let rec: RateRecord = idx >= 0 ? { ...records[idx] } : { key, attempts: 0, lockedUntil: 0, lastAttempt: now };

  // Reset if previous lock expired
  if (rec.lockedUntil > 0 && rec.lockedUntil <= now) {
    rec.attempts = 0; rec.lockedUntil = 0;
  }

  rec.attempts += 1;
  rec.lastAttempt = now;

  if (rec.attempts >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCK_DURATION;
  }

  if (idx >= 0) records[idx] = rec; else records.push(rec);
  // Prune old unlocked records (older than 1 hour)
  const pruned = records.filter(r => r.lockedUntil > now || now - r.lastAttempt < 3600000);
  writeDb("login_rate_limit", pruned);

  return { locked: rec.lockedUntil > now, attemptsLeft: Math.max(0, MAX_ATTEMPTS - rec.attempts) };
}

export function clearRateLimit(key: string) {
  const records = readDb<RateRecord[]>("login_rate_limit", []);
  writeDb("login_rate_limit", records.filter(r => r.key !== key));
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export function writeAuditLog(entry: Omit<AuditEntry, "id" | "timestamp">) {
  const logs = readDb<AuditEntry[]>("audit_log", []);
  logs.push({
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  // Keep last 2000 entries
  if (logs.length > 2000) logs.splice(0, logs.length - 2000);
  writeDb("audit_log", logs);
}

export function getClientIp(req: { headers: { get: (k: string) => string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
