import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const cwd = process.cwd();
  const dataDir = path.join(cwd, "data");

  const result: Record<string, unknown> = {
    cwd,
    dataDir,
    dataDirExists: fs.existsSync(dataDir),
    files: [] as string[],
    users: [],
    companies: [],
  };

  try {
    if (fs.existsSync(dataDir)) {
      result.files = fs.readdirSync(dataDir);
      const uf = path.join(dataDir, "users.json");
      const cf = path.join(dataDir, "companies.json");
      if (fs.existsSync(uf)) result.users = JSON.parse(fs.readFileSync(uf, "utf-8"));
      if (fs.existsSync(cf)) result.companies = JSON.parse(fs.readFileSync(cf, "utf-8"));
    }
  } catch (e) {
    result.error = String(e);
  }

  return NextResponse.json(result);
}
