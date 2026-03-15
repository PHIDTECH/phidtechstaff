import fs from "fs";
import path from "path";

// In Docker standalone build, DATA_PATH env can point to /app/data explicitly.
// Falls back to process.cwd()/data which is /app/data when cwd is /app.
const DATA_DIR = process.env.DATA_PATH
  ? path.resolve(process.env.DATA_PATH)
  : path.join(process.cwd(), "data");

function filePath(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

export function readDb<T>(name: string, fallback: T): T {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const fp = filePath(name);
    if (!fs.existsSync(fp)) return fallback;
    const raw = fs.readFileSync(fp, "utf-8").trim();
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeDb(name: string, data: unknown): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}
