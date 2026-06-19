import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
export const dynamic = "force-dynamic";

// Allowed db keys for bulk import (whitelist for security)
const ALLOWED_KEYS = new Set([
  "customers", "microfinance_customers", "loans", "marketing_customers",
  "media_customers", "business_customers", "licence_customers",
  "entertainment_customers", "movies_customers",
  "sales", "expenses", "office_expenses", "commissions",
  "users", "payroll", "tasks",
]);

export async function POST(req: NextRequest) {
  try {
    const { dbKey, records } = await req.json() as { dbKey: string; records: Record<string, unknown>[] };

    if (!dbKey || !ALLOWED_KEYS.has(dbKey)) {
      return NextResponse.json({ error: "Invalid or disallowed dbKey." }, { status: 400 });
    }
    if (!Array.isArray(records) || !records.length) {
      return NextResponse.json({ error: "records must be a non-empty array." }, { status: 400 });
    }

    const existing = readDb<Record<string, unknown>[]>(dbKey, []);
    const existingIds = new Set(existing.map(r => r.id as string).filter(Boolean));

    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      // Generate ID if missing
      if (!row.id) row.id = `imp-${dbKey.slice(0,4)}-${Date.now()}-${i}`;
      // Skip duplicates by ID
      if (existingIds.has(row.id as string)) {
        errors.push(`Row ${i + 1}: ID "${row.id}" already exists — skipped.`);
        continue;
      }
      // Skip empty rows
      const values = Object.values(row).filter(v => v != null && v !== "");
      if (!values.length) { errors.push(`Row ${i + 1}: empty row — skipped.`); continue; }

      existing.push(row);
      existingIds.add(row.id as string);
      imported++;
    }

    writeDb(dbKey, existing);
    return NextResponse.json({ imported, errors, total: existing.length });
  } catch (e) {
    console.error("[bulk-import]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
