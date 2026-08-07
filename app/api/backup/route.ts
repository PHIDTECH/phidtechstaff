import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import zlib from "zlib";
export const dynamic = "force-dynamic";

function getDataDir(): string {
  if (process.env.DATA_PATH) return path.resolve(process.env.DATA_PATH);
  const cwd = process.cwd().replace(/\\/g, "/");
  const nextIdx = cwd.indexOf("/.next/");
  if (nextIdx >= 0) return path.join(cwd.slice(0, nextIdx), "data");
  return path.join(cwd, "data");
}

// GET — download a gzipped JSON bundle of all data files
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== "Kaijage@@2023") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    return NextResponse.json({ error: "Data directory not found." }, { status: 404 });
  }

  // Read all .json files (skip backups/ subfolder and temp files)
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json") && !f.startsWith("_tmp_"));

  const bundle: Record<string, unknown> = {
    _meta: {
      createdAt: new Date().toISOString(),
      fileCount: files.length,
      files: files,
    },
  };

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dataDir, file), "utf-8");
      bundle[file.replace(".json", "")] = JSON.parse(raw);
    } catch {
      bundle[file.replace(".json", "")] = null;
    }
  }

  const jsonStr = JSON.stringify(bundle, null, 2);
  const compressed = await new Promise<Buffer>((resolve, reject) => {
    zlib.gzip(Buffer.from(jsonStr, "utf-8"), (err, result) => {
      if (err) reject(err); else resolve(result);
    });
  });

  const date = new Date().toISOString().slice(0, 10);
  const filename = `phidtech-backup-${date}.json.gz`;

  return new NextResponse(new Uint8Array(compressed), {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(compressed.length),
    },
  });
}
