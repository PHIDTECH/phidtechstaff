import fs from "fs";
import path from "path";
import os from "os";

// DATA_PATH env var explicitly pins the storage location.
// Falls back to process.cwd()/data.  Set DATA_PATH in ecosystem.config.js to
// /var/www/boms/data so it is NEVER inside .next/standalone/ (wiped on build).
const DATA_DIR = process.env.DATA_PATH
  ? path.resolve(process.env.DATA_PATH)
  : path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
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
    const tmp = path.join(os.tmpdir(), `phid_${name}_${Date.now()}.tmp`);
    const content = JSON.stringify(data, null, 2);
    // Write to a temp file first, then atomically rename → prevents partial writes
    // from corrupting the live JSON file if the server crashes mid-write.
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, fp);
  } catch (err) {
    console.error(`[serverDb] writeDb("${name}") failed:`, err);
  }
}
