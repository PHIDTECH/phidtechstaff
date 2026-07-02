import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface CustomerAttachment {
  name: string;
  size: number;
  dataUrl: string;
}

interface Customer {
  id: string;
  companyId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  type: string;
  address: string;
  serviceProduct: string;
  date: string;
  branch: string;
  status: string;
  totalRevenue: number;
  createdAt: string;
  attachments?: CustomerAttachment[];
  [key: string]: unknown;
}

export async function GET() {
  const customers = readDb<Customer[]>("customers", []);
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim())    return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
    if (!body.companyId)       return NextResponse.json({ error: "companyId is required." }, { status: 400 });

    const customers = readDb<Customer[]>("customers", []);

    if (Array.isArray(body)) {
      return NextResponse.json({ error: "Use bulk endpoint." }, { status: 400 });
    }

    const newCustomer: Customer = {
      ...body,
      id: body.id ?? `cust-${Date.now()}`,
      totalRevenue: body.totalRevenue ?? 0,
      createdAt: body.createdAt ?? new Date().toISOString().slice(0, 10),
    };
    customers.push(newCustomer);
    console.log(`[POST /api/customers] Adding customer ${newCustomer.id}, list size before write: ${customers.length}`);
    writeDb("customers", customers);
    return NextResponse.json(newCustomer, { status: 201 });
  } catch (err) {
    console.error("POST /api/customers:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Bulk upsert for migration
    if (Array.isArray(body)) {
      const existing = readDb<Customer[]>("customers", []);
      for (const item of body) {
        if (!item.id) continue;
        const idx = existing.findIndex(c => c.id === item.id);
        if (idx >= 0) existing[idx] = { ...existing[idx], ...item };
        else existing.push(item);
      }
      writeDb("customers", existing);
      return NextResponse.json({ success: true, count: body.length });
    }

    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const customers = readDb<Customer[]>("customers", []);
    const idx = customers.findIndex(c => c.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

    customers[idx] = { ...customers[idx], ...body };
    writeDb("customers", customers);
    return NextResponse.json(customers[idx]);
  } catch (err) {
    console.error("PUT /api/customers:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id    = searchParams.get("id");
    const clear = searchParams.get("clear");
    if (clear === "all") {
      const count = readDb<Customer[]>("customers", []).length;
      writeDb("customers", []);
      return NextResponse.json({ success: true, deleted: count });
    }
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const customers = readDb<Customer[]>("customers", []);
    writeDb("customers", customers.filter(c => c.id !== id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/customers:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
