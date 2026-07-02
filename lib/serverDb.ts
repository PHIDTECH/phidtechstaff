import fs from "fs";
import path from "path";

// DATA_PATH env var explicitly pins the storage location.
// Falls back to a path that is NEVER inside .next/standalone/ (wiped on every build).
const DATA_DIR = (() => {
  if (process.env.DATA_PATH) return path.resolve(process.env.DATA_PATH);
  const cwd = process.cwd().replace(/\\/g, "/");
  // If running from inside .next/standalone (Next.js standalone mode), go up to project root
  const nextIdx = cwd.indexOf("/.next/");
  if (nextIdx >= 0) {
    const projectRoot = cwd.slice(0, nextIdx);
    return path.join(projectRoot, "data");
  }
  return path.join(cwd, "data");
})();

const BACKUP_DIR = path.join(DATA_DIR, "backups");

// Log data directory on first load
console.log(`[serverDb] Using DATA_DIR: ${DATA_DIR}`);

// One-time migration: recover any .json files that were previously written into
// .next/standalone/data/ (wiped on each build) and copy them to DATA_DIR.
// Safe to run on every startup — skips files that already exist in DATA_DIR.
(function migrateStandaloneData() {
  try {
    const cwd = process.cwd().replace(/\\/g, "/");
    const nextIdx = cwd.indexOf("/.next/");
    const projectRoot = nextIdx >= 0 ? cwd.slice(0, nextIdx) : cwd;
    const standaloneData = path.join(projectRoot, ".next", "standalone", "data");
    if (!fs.existsSync(standaloneData)) return;
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const files = fs.readdirSync(standaloneData).filter(f => f.endsWith(".json") && !f.startsWith("_"));
    for (const file of files) {
      const src = path.join(standaloneData, file);
      const dst = path.join(DATA_DIR, file);
      if (fs.existsSync(dst)) continue; // already migrated — skip
      try {
        fs.copyFileSync(src, dst);
        console.log(`[serverDb] migrated ${file} from standalone → ${dst}`);
      } catch {}
    }
  } catch {}
})();

// ── In-process read cache ──────────────────────────────────────────────────
// Eliminates repeated disk reads for the same file within a short window.
// Safe because PM2 runs a single process (instances: 1).
// Invalidated immediately on every writeDb call.
const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ── Directory existence flag ───────────────────────────────────────────────
let _dirReady = false;
function ensureDir() {
  if (_dirReady) return;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  _dirReady = true;
}

function filePath(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

// Run backup asynchronously so it never blocks the write hot-path.
function backupFileAsync(name: string) {
  setImmediate(() => {
    try {
      const fp = filePath(name);
      if (!fs.existsSync(fp)) return;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const backupPath = path.join(BACKUP_DIR, `${name}_${timestamp}.json`);
      fs.copyFileSync(fp, backupPath);
      const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(`${name}_`)).sort().reverse();
      backups.slice(5).forEach(f => { try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {} });
    } catch {}
  });
}

export function readDb<T>(name: string, fallback: T): T {
  // Serve from cache when still fresh
  const hit = _cache.get(name);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data as T;
  try {
    ensureDir();
    const fp = filePath(name);
    if (!fs.existsSync(fp)) return fallback;
    const raw = fs.readFileSync(fp, "utf-8").trim();
    if (!raw) return fallback;
    const data = JSON.parse(raw) as T;
    _cache.set(name, { data, ts: Date.now() });
    return data;
  } catch {
    return fallback;
  }
}

export function writeDb(name: string, data: unknown): void {
  // Warm the cache immediately so the next readDb is instant
  _cache.set(name, { data, ts: Date.now() });
  try {
    ensureDir();
    const fp = filePath(name);
    // Backup asynchronously — never blocks the write
    if (fs.existsSync(fp)) {
      const existing = fs.readFileSync(fp, "utf-8").trim();
      if (existing.length > 10) backupFileAsync(name);
    }
    // Write temp file in the SAME directory as the destination so that
    // fs.renameSync is always within one filesystem (avoids EXDEV cross-device error).
    const tmp = path.join(DATA_DIR, `_tmp_${name}_${Date.now()}.tmp`);
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, fp);
    console.log(`[serverDb] writeDb("${name}") saved ${Array.isArray(data) ? data.length : 1} items`);
  } catch (err) {
    console.error(`[serverDb] writeDb("${name}") failed:`, err);
    // Last-resort direct write so data is never silently lost
    try {
      fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), "utf-8");
      console.warn(`[serverDb] writeDb("${name}") used fallback direct write`);
    } catch (e2) {
      console.error(`[serverDb] writeDb("${name}") fallback also failed:`, e2);
    }
  }
}
