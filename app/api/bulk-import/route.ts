import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set([
  "customers", "microfinance_customers", "loans", "marketing_customers",
  "media_customers", "business_customers", "licence_customers",
  "entertainment_customers", "movies_customers",
  "sales", "expenses", "office_expenses", "commissions",
  "users", "payroll", "tasks", "assets",
]);

// Convert "Column Name" → "columnName"
function toCamelCase(str: string): string {
  return str.trim()
    .replace(/[^a-zA-Z0-9\s_]/g, "")
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w, i) => i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

// Per-entity column aliases (camelCase variant → standard field name)
const FIELD_MAPS: Record<string, Record<string, string>> = {
  customers: {
    customerName: "name", fullName: "name", contactName: "name",
    customerType: "type", contactType: "type",
    phoneNumber: "phone", mobile: "phone", telephone: "phone", cell: "phone",
    companyName: "company", organization: "company", businessName: "company",
    emailAddress: "email",
    serviceProduct: "serviceProduct", serviceProd: "serviceProduct", productService: "serviceProduct",
    totalRevenue: "totalRevenue", revenue: "totalRevenue",
    registrationDate: "date", joinDate: "date",
  },
  expenses: {
    expenseTitle: "title", subject: "title",
    expenseCategory: "category",
    expenseAmount: "amount",
    employeeId: "userId", staffId: "userId",
  },
  tasks: {
    taskTitle: "title", taskName: "title",
    taskDescription: "description",
    assignedToId: "assignedTo", assignedTo: "assignedTo",
    taskStatus: "status", taskPriority: "priority",
  },
  sales: {
    leadName: "name", contactName: "name",
    leadCompany: "company", leadValue: "value",
    leadStage: "stage", salesStage: "stage", pipeline: "stage",
  },
  assets: {
    assetName: "name", assetCategory: "category",
    serialNo: "serialNumber", serial: "serialNumber",
    purchasePrice: "purchaseCost", cost: "purchaseCost",
    currentPrice: "currentValue",
    assetStatus: "status",
  },
};

function normalizeRecord(raw: Record<string, unknown>, dbKey: string, defaultCompanyId?: string): Record<string, unknown> {
  const map = FIELD_MAPS[dbKey] ?? {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const camel = toCamelCase(k);
    const normalized = map[camel] ?? camel;
    out[normalized] = v;
  }
  // Ensure companyId is set
  if (!out.companyId && defaultCompanyId) out.companyId = defaultCompanyId;
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { dbKey: string; records: Record<string, unknown>[]; companyId?: string };
    const { dbKey, records, companyId } = body;

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
      const row = normalizeRecord(records[i], dbKey, companyId);
      if (!row.id) row.id = `imp-${dbKey.slice(0,4)}-${Date.now()}-${i}`;
      if (existingIds.has(row.id as string)) {
        errors.push(`Row ${i + 1}: ID "${row.id}" already exists — skipped.`);
        continue;
      }
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
