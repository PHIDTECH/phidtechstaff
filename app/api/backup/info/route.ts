import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
export const dynamic = "force-dynamic";

function getDataDir(): string {
  if (process.env.DATA_PATH) return path.resolve(process.env.DATA_PATH);
  const cwd = process.cwd().replace(/\\/g, "/");
  const nextIdx = cwd.indexOf("/.next/");
  if (nextIdx >= 0) return path.join(cwd.slice(0, nextIdx), "data");
  return path.join(cwd, "data");
}

export async function GET() {
  try {
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) return NextResponse.json({ fileCount: 0, lastBackup: null, sizeKB: 0 });

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json") && !f.startsWith("_tmp_"));

    let totalBytes = 0;
    let latestMtime = 0;

    for (const file of files) {
      try {
        const stat = fs.statSync(path.join(dataDir, file));
        totalBytes += stat.size;
        if (stat.mtimeMs > latestMtime) latestMtime = stat.mtimeMs;
      } catch {}
    }

    return NextResponse.json({
      fileCount: files.length,
      lastBackup: latestMtime ? new Date(latestMtime).toISOString() : null,
      sizeKB: Math.round(totalBytes / 1024),
    });
  } catch (err) {
    return NextResponse.json({ fileCount: 0, lastBackup: null, sizeKB: 0, error: String(err) });
  }
}
