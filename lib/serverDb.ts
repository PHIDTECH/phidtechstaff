import fs from "fs";
import path from "path";
import os from "os";

// DATA_PATH env var explicitly pins the storage location.
// Falls back to process.cwd()/data.  Set DATA_PATH in ecosystem.config.js to
// /var/www/boms/data so it is NEVER inside .next/standalone/ (wiped on build).
const DATA_DIR = process.env.DATA_PATH
  ? path.resolve(process.env.DATA_PATH)
  : path.join(process.cwd(), "data");

const BACKUP_DIR = path.join(DATA_DIR, "backups");

// Log data directory on first load
console.log(`[serverDb] Using DATA_DIR: ${DATA_DIR}`);

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function filePath(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

function backupFile(name: string) {
  try {
    const fp = filePath(name);
    if (!fs.existsSync(fp)) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupPath = path.join(BACKUP_DIR, `${name}_${timestamp}.json`);
    fs.copyFileSync(fp, backupPath);
    // Keep only last 5 backups per file
    const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(`${name}_`)).sort().reverse();
    backups.slice(5).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  } catch (err) {
    console.error(`[serverDb] backup("${name}") failed:`, err);
  }
}

export function readDb<T>(name: string, fallback: T): T {
  try {
    ensureDir();
    const fp = filePath(name);
    if (!fs.existsSync(fp)) return fallback;
    const raw = fs.readFileSync(fp, "utf-8").trim();
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeDb(name: string, data: unknown): void {
  try {
    ensureDir();
    const fp  = filePath(name);
    // Create backup before overwriting (only if file exists and has data)
    if (fs.existsSync(fp)) {
      const existing = fs.readFileSync(fp, "utf-8").trim();
      if (existing.length > 10) backupFile(name);
    }
    const tmp = path.join(os.tmpdir(), `phid_${name}_${Date.now()}.tmp`);
    const content = JSON.stringify(data, null, 2);
    // Write to a temp file first, then atomically rename → prevents partial writes
    // from corrupting the live JSON file if the server crashes mid-write.
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, fp);
    console.log(`[serverDb] writeDb("${name}") saved ${Array.isArray(data) ? data.length : 1} items to ${fp}`);
  } catch (err) {
    console.error(`[serverDb] writeDb("${name}") failed:`, err);
  }
}
