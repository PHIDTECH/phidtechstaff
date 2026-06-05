import { NextResponse } from "next/server";
import { readDb } from "@/lib/serverDb";

export async function GET() {
  try {
    const [
      companies, users, branches, tasks, leave, sales,
      expenses, officeExpenses, payroll, loanInterest, loans,
    ] = await Promise.all([
      Promise.resolve(readDb("companies",      [])),
      Promise.resolve(readDb("users",          [])),
      Promise.resolve(readDb("branches",       [])),
      Promise.resolve(readDb("tasks",          [])),
      Promise.resolve(readDb("leave",          [])),
      Promise.resolve(readDb("accounting_sales", [])),
      Promise.resolve(readDb("expenses",       [])),
      Promise.resolve(readDb("office_expenses",[])),
      Promise.resolve(readDb("payroll",        [])),
      Promise.resolve(readDb("loan_interest",  [])),
      Promise.resolve(readDb("loans",          [])),
    ]);

    // Strip passwords from users
    const safeUsers = (users as Record<string, unknown>[]).map(({ password: _p, ...rest }) => rest);

    return NextResponse.json({
      companies, users: safeUsers, branches, tasks, leave, sales,
      expenses, officeExpenses, payroll, loanInterest, loans,
    });
  } catch (err) {
    console.error("GET /api/dashboard-summary error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
