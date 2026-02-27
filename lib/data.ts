import type {
  Company, User, Department, Task, LeaveRequest, LeaveBalance,
  Payroll, SalaryAdvance, Account, Transaction, Invoice, Customer,
  SupportTicket, SalesLead, Quotation, Campaign, Asset, ExpenseClaim,
  PettyCash, Product, StockItem, Warehouse, PurchaseOrder, Vendor,
  AttendanceRecord, KPI, Document, Notification, Message, AuditLog
} from "./types";

export const companies: Company[] = [
  { id: "c1", name: "Your Company Name", industry: "Technology", address: "Dar es Salaam, Tanzania", phone: "+255 700 000 000", email: "info@yourcompany.co.tz", website: "yourcompany.co.tz", createdAt: "2026-01-01", logo: "" },
];

export const departments: Department[] = [
  { id: "d1", companyId: "c1", name: "Administration", managerId: "u1", headCount: 1 },
];

export const users: User[] = [
  { id: "u1", companyId: "c1", name: "System Administrator", email: "phidtechnology@gmail.com", phone: "+255 700 000 000", role: "admin", department: "Administration", position: "System Administrator", status: "active", salary: 0, joinDate: "2026-01-01", createdAt: "2026-01-01" },
];

export const tasks: Task[] = [
  { id: "t1", companyId: "c1", title: "Sample Task", description: "This is a sample task. Edit or delete it and add your own.", assignedTo: "u1", assignedBy: "u1", department: "Administration", priority: "medium", status: "pending", dueDate: "2026-12-31", createdAt: "2026-01-01", tags: ["sample"] },
];

export const leaveRequests: LeaveRequest[] = [
  { id: "l1", userId: "u1", companyId: "c1", type: "annual", startDate: "2026-12-24", endDate: "2026-12-31", days: 5, reason: "Sample leave request. Edit or delete.", status: "pending", createdAt: "2026-01-01" },
];

export const leaveBalances: LeaveBalance[] = [
  { userId: "u1", annual: 21, sick: 14, maternity: 0, paternity: 7, used: 0, remaining: 21 },
];

export const payrolls: Payroll[] = [
  { id: "p1", userId: "u1", companyId: "c1", month: "January", year: 2026, basicSalary: 0, allowances: [{ name: "Transport", amount: 0 }], deductions: [{ name: "PAYE", amount: 0 }], grossSalary: 0, netSalary: 0, status: "draft", createdAt: "2026-01-01" },
];

export const salaryAdvances: SalaryAdvance[] = [
  { id: "sa1", userId: "u1", companyId: "c1", amount: 0, reason: "Sample advance. Edit or delete.", status: "pending", requestDate: "2026-01-01" },
];

export const accounts: Account[] = [
  { id: "ac1", companyId: "c1", code: "1000", name: "Cash & Bank", type: "asset", balance: 0 },
  { id: "ac2", companyId: "c1", code: "4000", name: "Revenue", type: "income", balance: 0 },
  { id: "ac3", companyId: "c1", code: "5000", name: "Expenses", type: "expense", balance: 0 },
];

export const transactions: Transaction[] = [
  { id: "tx1", companyId: "c1", accountId: "ac1", type: "credit", amount: 0, description: "Sample transaction. Edit or delete.", reference: "REF-001", date: "2026-01-01", category: "Revenue", createdBy: "u1" },
];

export const invoices: Invoice[] = [
  { id: "inv1", companyId: "c1", customerId: "cust1", invoiceNumber: "INV-2026-001", items: [{ description: "Sample Service", quantity: 1, unitPrice: 0, total: 0 }], subtotal: 0, tax: 0, total: 0, status: "draft", issueDate: "2026-01-01", dueDate: "2026-01-31" },
];

export const customers: Customer[] = [
  { id: "cust1", companyId: "c1", name: "Sample Customer", email: "customer@example.com", phone: "+255 700 000 001", company: "Sample Company Ltd", address: "Dar es Salaam", type: "business", status: "active", totalRevenue: 0, createdAt: "2026-01-01" },
];

export const supportTickets: SupportTicket[] = [
  { id: "st1", customerId: "cust1", companyId: "c1", subject: "Sample Ticket", description: "This is a sample support ticket. Edit or delete.", priority: "low", status: "open", createdAt: "2026-01-01" },
];

export const salesLeads: SalesLead[] = [
  { id: "sl1", companyId: "c1", name: "Sample Lead", email: "lead@example.com", phone: "+255 700 000 002", company: "Sample Company", source: "Referral", stage: "lead", value: 0, assignedTo: "u1", probability: 10, expectedClose: "2026-12-31", createdAt: "2026-01-01" },
];

export const quotations: Quotation[] = [
  { id: "q1", companyId: "c1", customerId: "cust1", quoteNumber: "QUO-2026-001", items: [{ description: "Sample Service", quantity: 1, unitPrice: 0, total: 0 }], subtotal: 0, discount: 0, tax: 0, total: 0, status: "draft", validUntil: "2026-12-31", createdAt: "2026-01-01" },
];

export const campaigns: Campaign[] = [
  { id: "camp1", companyId: "c1", name: "Sample Campaign", type: "email", status: "draft", budget: 0, spent: 0, leads: 0, conversions: 0, startDate: "2026-01-01", endDate: "2026-12-31", createdAt: "2026-01-01" },
];

export const assets: Asset[] = [
  { id: "ast1", companyId: "c1", name: "Sample Asset", category: "IT Equipment", serialNumber: "SN-001", purchaseDate: "2026-01-01", purchaseCost: 0, currentValue: 0, depreciationRate: 0, location: "Office", status: "active" },
];

export const expenseClaims: ExpenseClaim[] = [
  { id: "ec1", userId: "u1", companyId: "c1", title: "Sample Expense", category: "General", amount: 0, description: "Sample expense claim. Edit or delete.", status: "pending", submittedAt: "2026-01-01" },
];

export const pettyCash: PettyCash[] = [
  { id: "pc1", companyId: "c1", description: "Opening balance", amount: 0, type: "income", category: "Float Top-up", date: "2026-01-01", balance: 0, createdBy: "u1" },
];

export const products: Product[] = [
  { id: "prod1", companyId: "c1", name: "Sample Product", sku: "SKU-001", category: "General", unit: "Unit", costPrice: 0, sellingPrice: 0, reorderLevel: 0, createdAt: "2026-01-01" },
];

export const warehouses: Warehouse[] = [
  { id: "wh1", companyId: "c1", name: "Main Warehouse", location: "Dar es Salaam", managerId: "u1" },
];

export const stockItems: StockItem[] = [
  { id: "si1", productId: "prod1", warehouseId: "wh1", companyId: "c1", quantity: 0, reservedQty: 0, availableQty: 0 },
];

export const vendors: Vendor[] = [
  { id: "v1", companyId: "c1", name: "Sample Vendor", email: "vendor@example.com", phone: "+255 700 000 003", address: "Dar es Salaam", category: "General", status: "active", totalPurchases: 0, createdAt: "2026-01-01" },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: "po1", companyId: "c1", vendorId: "v1", poNumber: "PO-2026-001", items: [{ productId: "prod1", productName: "Sample Product", quantity: 1, unitCost: 0, total: 0 }], total: 0, status: "draft", orderDate: "2026-01-01", expectedDate: "2026-01-31" },
];

export const attendanceRecords: AttendanceRecord[] = [
  { id: "att1", userId: "u1", companyId: "c1", date: "2026-01-01", clockIn: "08:00", clockOut: "17:00", hoursWorked: 9, overtime: 0, lateMinutes: 0, status: "present" },
];

export const kpis: KPI[] = [
  { id: "kpi1", companyId: "c1", name: "Sample KPI", category: "General", target: 100, actual: 0, unit: "%", period: "January 2026", status: "at-risk" },
];

export const documents: Document[] = [
  { id: "doc1", companyId: "c1", name: "Sample Document.pdf", category: "General", uploadedBy: "u1", uploadedAt: "2026-01-01", size: "0 MB", version: 1, permissions: ["all"], url: "#" },
];

export const notifications: Notification[] = [
  { id: "n1", userId: "u1", title: "Welcome to PHIDTECH MS", message: "System is ready. Start by updating your company information and adding staff.", type: "info", read: false, createdAt: "2026-01-01T08:00:00", link: "/admin" },
];

export const messages: Message[] = [
  { id: "msg1", fromId: "u1", toId: "u1", companyId: "c1", subject: "Welcome", body: "Welcome to PHIDTECH MS. This is a sample message.", read: false, createdAt: "2026-01-01T08:00:00" },
];

export const auditLogs: AuditLog[] = [
  { id: "al1", userId: "u1", companyId: "c1", action: "LOGIN", module: "Authentication", details: "Admin logged in", ipAddress: "0.0.0.0", timestamp: "2026-01-01T08:00:00" },
];

export const monthlyRevenueData = [
  { month: "Jan", revenue: 0, expenses: 0, profit: 0 },
  { month: "Feb", revenue: 0, expenses: 0, profit: 0 },
  { month: "Mar", revenue: 0, expenses: 0, profit: 0 },
  { month: "Apr", revenue: 0, expenses: 0, profit: 0 },
  { month: "May", revenue: 0, expenses: 0, profit: 0 },
  { month: "Jun", revenue: 0, expenses: 0, profit: 0 },
];

export const salesPipelineData = [
  { stage: "Leads", count: 0, value: 0 },
  { stage: "Prospects", count: 0, value: 0 },
  { stage: "Qualified", count: 0, value: 0 },
  { stage: "Proposal", count: 0, value: 0 },
  { stage: "Won", count: 0, value: 0 },
];

export const attendanceSummary = [
  { day: "Mon", present: 0, absent: 0, late: 0 },
  { day: "Tue", present: 0, absent: 0, late: 0 },
  { day: "Wed", present: 0, absent: 0, late: 0 },
  { day: "Thu", present: 0, absent: 0, late: 0 },
  { day: "Fri", present: 0, absent: 0, late: 0 },
];

export const currentUser = users[0];
export const currentCompany = companies[0];
