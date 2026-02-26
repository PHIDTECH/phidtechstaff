import type {
  Company, User, Department, Task, LeaveRequest, LeaveBalance,
  Payroll, SalaryAdvance, Account, Transaction, Invoice, Customer,
  SupportTicket, SalesLead, Quotation, Campaign, Asset, ExpenseClaim,
  PettyCash, Product, StockItem, Warehouse, PurchaseOrder, Vendor,
  AttendanceRecord, KPI, Document, Notification, Message, AuditLog
} from "./types";

export const companies: Company[] = [
  { id: "c1", name: "Phid Technologies Ltd", industry: "Technology", address: "Dar es Salaam, Tanzania", phone: "+255 744 000 001", email: "info@phidtech.co.tz", website: "phidtech.co.tz", createdAt: "2020-01-15", logo: "" },
  { id: "c2", name: "Phid Logistics Ltd", industry: "Logistics", address: "Arusha, Tanzania", phone: "+255 744 000 002", email: "info@phidlogistics.co.tz", website: "phidlogistics.co.tz", createdAt: "2021-03-10", logo: "" },
  { id: "c3", name: "Phid Properties Ltd", industry: "Real Estate", address: "Mwanza, Tanzania", phone: "+255 744 000 003", email: "info@phidprop.co.tz", createdAt: "2022-06-20", logo: "" },
];

export const departments: Department[] = [
  { id: "d1", companyId: "c1", name: "Engineering", managerId: "u2", headCount: 8 },
  { id: "d2", companyId: "c1", name: "Sales", managerId: "u4", headCount: 6 },
  { id: "d3", companyId: "c1", name: "HR & Admin", managerId: "u3", headCount: 4 },
  { id: "d4", companyId: "c1", name: "Finance", managerId: "u5", headCount: 3 },
  { id: "d5", companyId: "c1", name: "Marketing", managerId: "u6", headCount: 4 },
  { id: "d6", companyId: "c2", name: "Operations", managerId: "u7", headCount: 10 },
  { id: "d7", companyId: "c2", name: "Finance", managerId: "u8", headCount: 3 },
  { id: "d8", companyId: "c3", name: "Property Management", managerId: "u9", headCount: 5 },
];

export const users: User[] = [
  { id: "u1", companyId: "c1", name: "John Mwalimu", email: "admin@phidtech.co.tz", phone: "+255 744 111 001", role: "admin", department: "HR & Admin", position: "System Administrator", status: "active", salary: 3500000, joinDate: "2020-01-15", createdAt: "2020-01-15" },
  { id: "u2", companyId: "c1", name: "Grace Kimani", email: "grace.k@phidtech.co.tz", phone: "+255 744 111 002", role: "manager", department: "Engineering", position: "Head of Engineering", status: "active", salary: 4200000, joinDate: "2020-03-10", createdAt: "2020-03-10" },
  { id: "u3", companyId: "c1", name: "David Osei", email: "david.o@phidtech.co.tz", phone: "+255 744 111 003", role: "manager", department: "HR & Admin", position: "HR Manager", status: "active", salary: 3800000, joinDate: "2020-05-01", createdAt: "2020-05-01" },
  { id: "u4", companyId: "c1", name: "Amina Hassan", email: "amina.h@phidtech.co.tz", phone: "+255 744 111 004", role: "manager", department: "Sales", position: "Sales Manager", status: "active", salary: 4000000, joinDate: "2021-01-15", createdAt: "2021-01-15" },
  { id: "u5", companyId: "c1", name: "Peter Njoroge", email: "peter.n@phidtech.co.tz", phone: "+255 744 111 005", role: "manager", department: "Finance", position: "Finance Manager", status: "active", salary: 4100000, joinDate: "2020-07-20", createdAt: "2020-07-20" },
  { id: "u6", companyId: "c1", name: "Fatuma Said", email: "fatuma.s@phidtech.co.tz", phone: "+255 744 111 006", role: "manager", department: "Marketing", position: "Marketing Manager", status: "active", salary: 3700000, joinDate: "2021-04-01", createdAt: "2021-04-01" },
  { id: "u7", companyId: "c1", name: "Samuel Banda", email: "samuel.b@phidtech.co.tz", phone: "+255 744 111 007", role: "staff", department: "Engineering", position: "Software Engineer", status: "active", salary: 2800000, joinDate: "2021-06-15", createdAt: "2021-06-15" },
  { id: "u8", companyId: "c1", name: "Mary Achieng", email: "mary.a@phidtech.co.tz", phone: "+255 744 111 008", role: "staff", department: "Engineering", position: "Frontend Developer", status: "active", salary: 2600000, joinDate: "2021-09-01", createdAt: "2021-09-01" },
  { id: "u9", companyId: "c1", name: "James Okafor", email: "james.o@phidtech.co.tz", phone: "+255 744 111 009", role: "staff", department: "Sales", position: "Sales Executive", status: "active", salary: 2200000, joinDate: "2022-01-10", createdAt: "2022-01-10" },
  { id: "u10", companyId: "c1", name: "Zainab Musa", email: "zainab.m@phidtech.co.tz", phone: "+255 744 111 010", role: "staff", department: "Finance", position: "Accountant", status: "active", salary: 2500000, joinDate: "2022-03-15", createdAt: "2022-03-15" },
  { id: "u11", companyId: "c1", name: "Collins Otieno", email: "collins.o@phidtech.co.tz", phone: "+255 744 111 011", role: "staff", department: "Marketing", position: "Content Creator", status: "active", salary: 2100000, joinDate: "2022-05-20", createdAt: "2022-05-20" },
  { id: "u12", companyId: "c1", name: "Rehema Juma", email: "rehema.j@phidtech.co.tz", phone: "+255 744 111 012", role: "staff", department: "HR & Admin", position: "HR Officer", status: "inactive", salary: 2000000, joinDate: "2022-08-01", createdAt: "2022-08-01" },
  { id: "u13", companyId: "c2", name: "Ali Bakari", email: "ali.b@phidlogistics.co.tz", phone: "+255 744 222 001", role: "admin", department: "Operations", position: "Operations Director", status: "active", salary: 5000000, joinDate: "2021-03-10", createdAt: "2021-03-10" },
  { id: "u14", companyId: "c2", name: "Neema Baraka", email: "neema.b@phidlogistics.co.tz", phone: "+255 744 222 002", role: "manager", department: "Finance", position: "Finance Manager", status: "active", salary: 3900000, joinDate: "2021-05-01", createdAt: "2021-05-01" },
  { id: "u15", companyId: "c3", name: "Ibrahim Rashid", email: "ibrahim.r@phidprop.co.tz", phone: "+255 744 333 001", role: "admin", department: "Property Management", position: "Managing Director", status: "active", salary: 6000000, joinDate: "2022-06-20", createdAt: "2022-06-20" },
];

export const tasks: Task[] = [
  { id: "t1", companyId: "c1", title: "Develop User Authentication Module", description: "Build JWT-based authentication with role management", assignedTo: "u7", assignedBy: "u2", department: "Engineering", priority: "high", status: "in-progress", dueDate: "2026-03-05", createdAt: "2026-02-10", tags: ["backend", "security"] },
  { id: "t2", companyId: "c1", title: "Design New Landing Page", description: "Redesign the company landing page with new branding", assignedTo: "u8", assignedBy: "u2", department: "Engineering", priority: "medium", status: "completed", dueDate: "2026-02-20", completedAt: "2026-02-18", createdAt: "2026-02-01", tags: ["frontend", "design"] },
  { id: "t3", companyId: "c1", title: "Q1 Sales Report", description: "Compile and present Q1 2026 sales performance report", assignedTo: "u9", assignedBy: "u4", department: "Sales", priority: "high", status: "pending", dueDate: "2026-03-10", createdAt: "2026-02-15", tags: ["reporting", "sales"] },
  { id: "t4", companyId: "c1", title: "Employee Training Program", description: "Organize and conduct monthly skills training", assignedTo: "u3", assignedBy: "u1", department: "HR & Admin", priority: "medium", status: "in-progress", dueDate: "2026-03-15", createdAt: "2026-02-12", tags: ["hr", "training"] },
  { id: "t5", companyId: "c1", title: "Financial Audit Preparation", description: "Prepare documents for the annual financial audit", assignedTo: "u10", assignedBy: "u5", department: "Finance", priority: "critical", status: "pending", dueDate: "2026-02-28", createdAt: "2026-02-14", tags: ["finance", "audit"] },
  { id: "t6", companyId: "c1", title: "Social Media Campaign - March", description: "Plan and execute March social media campaigns", assignedTo: "u11", assignedBy: "u6", department: "Marketing", priority: "medium", status: "pending", dueDate: "2026-03-01", createdAt: "2026-02-18", tags: ["marketing", "social"] },
  { id: "t7", companyId: "c1", title: "API Documentation Update", description: "Update API docs for version 2.0 release", assignedTo: "u7", assignedBy: "u2", department: "Engineering", priority: "low", status: "pending", dueDate: "2026-03-20", createdAt: "2026-02-20", tags: ["docs", "api"] },
  { id: "t8", companyId: "c1", title: "Client Proposal for TanzaniaTech", description: "Prepare detailed proposal for TanzaniaTech partnership", assignedTo: "u4", assignedBy: "u1", department: "Sales", priority: "high", status: "in-progress", dueDate: "2026-03-03", createdAt: "2026-02-22", tags: ["proposal", "client"] },
  { id: "t9", companyId: "c1", title: "Database Optimization", description: "Optimize slow queries in the production database", assignedTo: "u8", assignedBy: "u2", department: "Engineering", priority: "high", status: "completed", dueDate: "2026-02-25", completedAt: "2026-02-24", createdAt: "2026-02-15", tags: ["database", "performance"] },
  { id: "t10", companyId: "c1", title: "Payroll Processing - February", description: "Process February 2026 payroll for all staff", assignedTo: "u5", assignedBy: "u1", department: "Finance", priority: "high", status: "completed", dueDate: "2026-02-26", completedAt: "2026-02-26", createdAt: "2026-02-20", tags: ["payroll", "finance"] },
];

export const leaveRequests: LeaveRequest[] = [
  { id: "l1", userId: "u7", companyId: "c1", type: "annual", startDate: "2026-03-10", endDate: "2026-03-14", days: 5, reason: "Family vacation", status: "approved", approvedBy: "u2", createdAt: "2026-02-20" },
  { id: "l2", userId: "u8", companyId: "c1", type: "sick", startDate: "2026-02-24", endDate: "2026-02-25", days: 2, reason: "Medical appointment", status: "approved", approvedBy: "u2", createdAt: "2026-02-23" },
  { id: "l3", userId: "u9", companyId: "c1", type: "annual", startDate: "2026-03-20", endDate: "2026-03-27", days: 8, reason: "Wedding ceremony", status: "pending", createdAt: "2026-02-25" },
  { id: "l4", userId: "u10", companyId: "c1", type: "emergency", startDate: "2026-02-26", endDate: "2026-02-26", days: 1, reason: "Family emergency", status: "approved", approvedBy: "u5", createdAt: "2026-02-26" },
  { id: "l5", userId: "u11", companyId: "c1", type: "annual", startDate: "2026-04-01", endDate: "2026-04-05", days: 5, reason: "Personal travel", status: "pending", createdAt: "2026-02-26" },
  { id: "l6", userId: "u12", companyId: "c1", type: "maternity", startDate: "2026-03-01", endDate: "2026-05-31", days: 92, reason: "Maternity leave", status: "approved", approvedBy: "u3", createdAt: "2026-02-15" },
];

export const leaveBalances: LeaveBalance[] = [
  { userId: "u7", annual: 21, sick: 14, maternity: 0, paternity: 7, used: 5, remaining: 16 },
  { userId: "u8", annual: 21, sick: 14, maternity: 0, paternity: 7, used: 2, remaining: 19 },
  { userId: "u9", annual: 21, sick: 14, maternity: 0, paternity: 7, used: 0, remaining: 21 },
  { userId: "u10", annual: 21, sick: 14, maternity: 0, paternity: 7, used: 1, remaining: 20 },
];

export const payrolls: Payroll[] = [
  { id: "p1", userId: "u7", companyId: "c1", month: "February", year: 2026, basicSalary: 2800000, allowances: [{ name: "Transport", amount: 150000 }, { name: "Housing", amount: 300000 }], deductions: [{ name: "PAYE", amount: 420000 }, { name: "NSSF", amount: 140000 }, { name: "Health", amount: 50000 }], grossSalary: 3250000, netSalary: 2640000, status: "paid", paidAt: "2026-02-26", createdAt: "2026-02-24" },
  { id: "p2", userId: "u8", companyId: "c1", month: "February", year: 2026, basicSalary: 2600000, allowances: [{ name: "Transport", amount: 150000 }, { name: "Housing", amount: 250000 }], deductions: [{ name: "PAYE", amount: 390000 }, { name: "NSSF", amount: 130000 }, { name: "Health", amount: 50000 }], grossSalary: 3000000, netSalary: 2430000, status: "paid", paidAt: "2026-02-26", createdAt: "2026-02-24" },
  { id: "p3", userId: "u9", companyId: "c1", month: "February", year: 2026, basicSalary: 2200000, allowances: [{ name: "Transport", amount: 120000 }, { name: "Commission", amount: 400000 }], deductions: [{ name: "PAYE", amount: 330000 }, { name: "NSSF", amount: 110000 }], grossSalary: 2720000, netSalary: 2280000, status: "paid", paidAt: "2026-02-26", createdAt: "2026-02-24" },
  { id: "p4", userId: "u10", companyId: "c1", month: "February", year: 2026, basicSalary: 2500000, allowances: [{ name: "Transport", amount: 130000 }, { name: "Housing", amount: 250000 }], deductions: [{ name: "PAYE", amount: 375000 }, { name: "NSSF", amount: 125000 }], grossSalary: 2880000, netSalary: 2380000, status: "paid", paidAt: "2026-02-26", createdAt: "2026-02-24" },
  { id: "p5", userId: "u2", companyId: "c1", month: "February", year: 2026, basicSalary: 4200000, allowances: [{ name: "Transport", amount: 200000 }, { name: "Housing", amount: 500000 }, { name: "Utilities", amount: 150000 }], deductions: [{ name: "PAYE", amount: 840000 }, { name: "NSSF", amount: 210000 }, { name: "Health", amount: 100000 }], grossSalary: 5050000, netSalary: 3900000, status: "paid", paidAt: "2026-02-26", createdAt: "2026-02-24" },
];

export const salaryAdvances: SalaryAdvance[] = [
  { id: "sa1", userId: "u9", companyId: "c1", amount: 500000, reason: "Medical emergency", status: "approved", approvedBy: "u5", requestDate: "2026-02-10", repaymentDate: "2026-03-26" },
  { id: "sa2", userId: "u11", companyId: "c1", amount: 300000, reason: "Rent payment", status: "pending", requestDate: "2026-02-25" },
  { id: "sa3", userId: "u8", companyId: "c1", amount: 600000, reason: "School fees", status: "repaid", approvedBy: "u5", requestDate: "2026-01-05", repaymentDate: "2026-02-26" },
];

export const accounts: Account[] = [
  { id: "ac1", companyId: "c1", code: "1000", name: "Cash & Bank", type: "asset", balance: 45000000 },
  { id: "ac2", companyId: "c1", code: "1100", name: "Accounts Receivable", type: "asset", balance: 18500000 },
  { id: "ac3", companyId: "c1", code: "1200", name: "Inventory", type: "asset", balance: 8200000 },
  { id: "ac4", companyId: "c1", code: "1500", name: "Fixed Assets", type: "asset", balance: 32000000 },
  { id: "ac5", companyId: "c1", code: "2000", name: "Accounts Payable", type: "liability", balance: 9800000 },
  { id: "ac6", companyId: "c1", code: "2100", name: "Salaries Payable", type: "liability", balance: 18200000 },
  { id: "ac7", companyId: "c1", code: "3000", name: "Owner Equity", type: "equity", balance: 75700000 },
  { id: "ac8", companyId: "c1", code: "4000", name: "Revenue - Software", type: "income", balance: 52000000 },
  { id: "ac9", companyId: "c1", code: "4100", name: "Revenue - Services", type: "income", balance: 28000000 },
  { id: "ac10", companyId: "c1", code: "5000", name: "Salaries & Wages", type: "expense", balance: 38000000 },
  { id: "ac11", companyId: "c1", code: "5100", name: "Rent & Utilities", type: "expense", balance: 7200000 },
  { id: "ac12", companyId: "c1", code: "5200", name: "Marketing Expenses", type: "expense", balance: 4500000 },
  { id: "ac13", companyId: "c1", code: "5300", name: "Travel & Subsistence", type: "expense", balance: 2100000 },
];

export const transactions: Transaction[] = [
  { id: "tx1", companyId: "c1", accountId: "ac8", type: "credit", amount: 15000000, description: "Software license - TanzaniaTech", reference: "INV-2026-001", date: "2026-02-15", category: "Revenue", createdBy: "u10" },
  { id: "tx2", companyId: "c1", accountId: "ac10", type: "debit", amount: 18200000, description: "February payroll disbursement", reference: "PAY-FEB-2026", date: "2026-02-26", category: "Payroll", createdBy: "u5" },
  { id: "tx3", companyId: "c1", accountId: "ac11", type: "debit", amount: 1200000, description: "Office rent - February 2026", reference: "RENT-FEB-2026", date: "2026-02-01", category: "Rent", createdBy: "u10" },
  { id: "tx4", companyId: "c1", accountId: "ac9", type: "credit", amount: 8500000, description: "Consulting services - MwangaBank", reference: "INV-2026-002", date: "2026-02-18", category: "Revenue", createdBy: "u10" },
  { id: "tx5", companyId: "c1", accountId: "ac12", type: "debit", amount: 800000, description: "Facebook & Google Ads - February", reference: "MKT-FEB-2026", date: "2026-02-10", category: "Marketing", createdBy: "u6" },
  { id: "tx6", companyId: "c1", accountId: "ac8", type: "credit", amount: 12000000, description: "Software project - AfroPay Ltd", reference: "INV-2026-003", date: "2026-02-22", category: "Revenue", createdBy: "u10" },
];

export const invoices: Invoice[] = [
  { id: "inv1", companyId: "c1", customerId: "cust1", invoiceNumber: "INV-2026-001", items: [{ description: "Annual Software License", quantity: 1, unitPrice: 15000000, total: 15000000 }], subtotal: 15000000, tax: 2700000, total: 17700000, status: "paid", issueDate: "2026-02-01", dueDate: "2026-02-15", paidAt: "2026-02-15" },
  { id: "inv2", companyId: "c1", customerId: "cust2", invoiceNumber: "INV-2026-002", items: [{ description: "IT Consulting - 20 hours", quantity: 20, unitPrice: 425000, total: 8500000 }], subtotal: 8500000, tax: 1530000, total: 10030000, status: "paid", issueDate: "2026-02-10", dueDate: "2026-02-25", paidAt: "2026-02-22" },
  { id: "inv3", companyId: "c1", customerId: "cust3", invoiceNumber: "INV-2026-003", items: [{ description: "Custom Software Development", quantity: 1, unitPrice: 35000000, total: 35000000 }], subtotal: 35000000, tax: 6300000, total: 41300000, status: "sent", issueDate: "2026-02-15", dueDate: "2026-03-15" },
  { id: "inv4", companyId: "c1", customerId: "cust4", invoiceNumber: "INV-2026-004", items: [{ description: "Mobile App Development - Phase 1", quantity: 1, unitPrice: 22000000, total: 22000000 }], subtotal: 22000000, tax: 3960000, total: 25960000, status: "overdue", issueDate: "2026-01-20", dueDate: "2026-02-20" },
  { id: "inv5", companyId: "c1", customerId: "cust1", invoiceNumber: "INV-2026-005", items: [{ description: "Annual Support Contract", quantity: 12, unitPrice: 500000, total: 6000000 }], subtotal: 6000000, tax: 1080000, total: 7080000, status: "sent", issueDate: "2026-02-25", dueDate: "2026-03-10" },
];

export const customers: Customer[] = [
  { id: "cust1", companyId: "c1", name: "TanzaniaTech Solutions", email: "info@tanzaniatech.co.tz", phone: "+255 744 500 001", company: "TanzaniaTech Solutions Ltd", address: "Dar es Salaam", type: "business", status: "active", totalRevenue: 45000000, createdAt: "2023-05-10" },
  { id: "cust2", companyId: "c1", name: "MwangaBank Ltd", email: "ict@mwangabank.co.tz", phone: "+255 744 500 002", company: "MwangaBank Limited", address: "Arusha", type: "business", status: "active", totalRevenue: 28000000, createdAt: "2023-08-15" },
  { id: "cust3", companyId: "c1", name: "AfroPay Ltd", email: "dev@afropay.co.tz", phone: "+255 744 500 003", company: "AfroPay Limited", address: "Dar es Salaam", type: "business", status: "active", totalRevenue: 35000000, createdAt: "2024-01-20" },
  { id: "cust4", companyId: "c1", name: "Karibu Stores", email: "it@karibustores.co.tz", phone: "+255 744 500 004", company: "Karibu Retail Stores Ltd", address: "Mwanza", type: "business", status: "active", totalRevenue: 22000000, createdAt: "2024-03-05" },
  { id: "cust5", companyId: "c1", name: "Dr. Amina Kikoti", email: "amina.k@gmail.com", phone: "+255 744 500 005", address: "Dodoma", type: "individual", status: "active", totalRevenue: 3500000, createdAt: "2024-06-10" },
  { id: "cust6", companyId: "c1", name: "Serengeti Safaris", email: "info@serengeti.co.tz", phone: "+255 744 500 006", company: "Serengeti Safaris Ltd", address: "Arusha", type: "business", status: "inactive", totalRevenue: 8000000, createdAt: "2024-09-01" },
];

export const supportTickets: SupportTicket[] = [
  { id: "st1", customerId: "cust1", companyId: "c1", subject: "Login issues after system update", description: "Users unable to login after the latest system update", priority: "high", status: "in-progress", assignedTo: "u7", createdAt: "2026-02-24" },
  { id: "st2", customerId: "cust2", companyId: "c1", subject: "Report generation error", description: "Monthly reports not generating correctly", priority: "medium", status: "open", createdAt: "2026-02-25" },
  { id: "st3", customerId: "cust3", companyId: "c1", subject: "Feature request: Export to Excel", description: "Need ability to export dashboard data to Excel", priority: "low", status: "open", createdAt: "2026-02-22" },
  { id: "st4", customerId: "cust4", companyId: "c1", subject: "Payment gateway not working", description: "Mobile payment integration failing intermittently", priority: "critical", status: "in-progress", assignedTo: "u7", createdAt: "2026-02-23", },
  { id: "st5", customerId: "cust5", companyId: "c1", subject: "Account password reset", description: "Unable to reset password via email", priority: "medium", status: "resolved", assignedTo: "u8", createdAt: "2026-02-20", resolvedAt: "2026-02-21" },
];

export const salesLeads: SalesLead[] = [
  { id: "sl1", companyId: "c1", name: "Tanzanet ISP", email: "ceo@tanzanet.co.tz", phone: "+255 744 600 001", company: "Tanzanet ISP Ltd", source: "Referral", stage: "proposal", value: 45000000, assignedTo: "u9", probability: 70, expectedClose: "2026-03-20", createdAt: "2026-01-15" },
  { id: "sl2", companyId: "c1", name: "Vodacom Tanzania", email: "procurement@vodacom.co.tz", phone: "+255 744 600 002", company: "Vodacom Tanzania", source: "Cold Call", stage: "qualified", value: 120000000, assignedTo: "u4", probability: 40, expectedClose: "2026-04-15", createdAt: "2026-01-20" },
  { id: "sl3", companyId: "c1", name: "CRDB Bank", email: "ict@crdb.co.tz", phone: "+255 744 600 003", company: "CRDB Bank PLC", source: "Website", stage: "prospect", value: 85000000, assignedTo: "u9", probability: 25, expectedClose: "2026-05-01", createdAt: "2026-02-01" },
  { id: "sl4", companyId: "c1", name: "AfriMart Ltd", email: "md@afrimart.co.tz", phone: "+255 744 600 004", company: "AfriMart Ltd", source: "Exhibition", stage: "lead", value: 18000000, assignedTo: "u9", probability: 15, expectedClose: "2026-04-30", createdAt: "2026-02-10" },
  { id: "sl5", companyId: "c1", name: "Tanzanian Revenue Authority", email: "ict@tra.go.tz", phone: "+255 744 600 005", company: "TRA", source: "Government Portal", stage: "won", value: 200000000, assignedTo: "u4", probability: 100, expectedClose: "2026-02-20", createdAt: "2025-11-01" },
  { id: "sl6", companyId: "c1", name: "Zanzibar Tourism Board", email: "info@ztb.go.tz", phone: "+255 744 600 006", company: "ZTB", source: "Referral", stage: "lost", value: 30000000, assignedTo: "u9", probability: 0, expectedClose: "2026-02-15", createdAt: "2025-12-01" },
];

export const quotations: Quotation[] = [
  { id: "q1", companyId: "c1", leadId: "sl1", quoteNumber: "QUO-2026-001", items: [{ description: "Network Management System", quantity: 1, unitPrice: 35000000, total: 35000000 }, { description: "Implementation & Training", quantity: 1, unitPrice: 10000000, total: 10000000 }], subtotal: 45000000, discount: 2000000, tax: 7740000, total: 50740000, status: "sent", validUntil: "2026-03-20", createdAt: "2026-02-20" },
  { id: "q2", companyId: "c1", customerId: "cust3", quoteNumber: "QUO-2026-002", items: [{ description: "ERP System License - 3 years", quantity: 1, unitPrice: 30000000, total: 30000000 }, { description: "API Integration", quantity: 1, unitPrice: 5000000, total: 5000000 }], subtotal: 35000000, discount: 0, tax: 6300000, total: 41300000, status: "accepted", validUntil: "2026-03-15", createdAt: "2026-02-10" },
];

export const campaigns: Campaign[] = [
  { id: "camp1", companyId: "c1", name: "Q1 Software Launch", type: "email", status: "active", budget: 5000000, spent: 1800000, leads: 145, conversions: 12, startDate: "2026-01-15", endDate: "2026-03-31", createdAt: "2026-01-10" },
  { id: "camp2", companyId: "c1", name: "LinkedIn B2B Campaign", type: "social", status: "active", budget: 3000000, spent: 1200000, leads: 89, conversions: 7, startDate: "2026-02-01", endDate: "2026-03-31", createdAt: "2026-01-28" },
  { id: "camp3", companyId: "c1", name: "Dar Tech Summit Sponsorship", type: "event", status: "completed", budget: 8000000, spent: 8000000, leads: 320, conversions: 28, startDate: "2026-01-25", endDate: "2026-01-27", createdAt: "2025-12-01" },
  { id: "camp4", companyId: "c1", name: "Google Ads - ERP Solutions", type: "paid", status: "active", budget: 2000000, spent: 650000, leads: 67, conversions: 5, startDate: "2026-02-10", endDate: "2026-04-10", createdAt: "2026-02-08" },
];

export const assets: Asset[] = [
  { id: "ast1", companyId: "c1", name: "Dell Server PowerEdge R740", category: "IT Equipment", serialNumber: "SRV-2023-001", purchaseDate: "2023-03-15", purchaseCost: 25000000, currentValue: 18750000, depreciationRate: 25, assignedTo: "u2", location: "Server Room", status: "active", nextMaintenance: "2026-06-15" },
  { id: "ast2", companyId: "c1", name: "MacBook Pro 16\" M3", category: "Laptop", serialNumber: "MBP-2024-007", purchaseDate: "2024-01-10", purchaseCost: 8500000, currentValue: 7225000, depreciationRate: 15, assignedTo: "u7", location: "Office", status: "active" },
  { id: "ast3", companyId: "c1", name: "MacBook Pro 16\" M3", category: "Laptop", serialNumber: "MBP-2024-008", purchaseDate: "2024-01-10", purchaseCost: 8500000, currentValue: 7225000, depreciationRate: 15, assignedTo: "u8", location: "Office", status: "active" },
  { id: "ast4", companyId: "c1", name: "Toyota Hilux 4WD", category: "Vehicle", serialNumber: "TZ-T1234-DSM", purchaseDate: "2022-08-20", purchaseCost: 85000000, currentValue: 59500000, depreciationRate: 20, assignedTo: "u4", location: "Company Parking", status: "active", nextMaintenance: "2026-04-01" },
  { id: "ast5", companyId: "c1", name: "Cisco Catalyst 2960X Switch", category: "Network Equipment", serialNumber: "CSC-2023-012", purchaseDate: "2023-06-05", purchaseCost: 3500000, currentValue: 2625000, depreciationRate: 25, location: "Server Room", status: "maintenance", nextMaintenance: "2026-03-01" },
  { id: "ast6", companyId: "c1", name: "HP LaserJet Enterprise M507", category: "Printer", serialNumber: "HP-2023-045", purchaseDate: "2023-09-12", purchaseCost: 2200000, currentValue: 1760000, depreciationRate: 20, location: "Main Office", status: "active" },
];

export const expenseClaims: ExpenseClaim[] = [
  { id: "ec1", userId: "u9", companyId: "c1", title: "Client visit - Arusha trip", category: "Travel", amount: 450000, description: "Bus fare and accommodation for client meeting in Arusha", status: "approved", approvedBy: "u4", submittedAt: "2026-02-20", approvedAt: "2026-02-22" },
  { id: "ec2", userId: "u7", companyId: "c1", title: "AWS Cloud credits", category: "Technology", amount: 320000, description: "Monthly AWS credits for development environment", status: "pending", submittedAt: "2026-02-25" },
  { id: "ec3", userId: "u11", companyId: "c1", title: "Photography equipment rental", category: "Marketing", amount: 180000, description: "Camera rental for product photoshoot", status: "approved", approvedBy: "u6", submittedAt: "2026-02-18", approvedAt: "2026-02-19" },
  { id: "ec4", userId: "u10", companyId: "c1", title: "Accounting software subscription", category: "Software", amount: 250000, description: "QuickBooks monthly subscription", status: "paid", approvedBy: "u5", submittedAt: "2026-02-15", approvedAt: "2026-02-16" },
];

export const pettyCash: PettyCash[] = [
  { id: "pc1", companyId: "c1", description: "Office stationery", amount: 45000, type: "expense", category: "Stationery", date: "2026-02-20", balance: 455000, createdBy: "u3" },
  { id: "pc2", companyId: "c1", description: "Monthly petty cash replenishment", amount: 500000, type: "income", category: "Float Top-up", date: "2026-02-01", balance: 500000, createdBy: "u5" },
  { id: "pc3", companyId: "c1", description: "Tea & coffee supplies", amount: 25000, type: "expense", category: "Refreshments", date: "2026-02-22", balance: 430000, createdBy: "u3" },
  { id: "pc4", companyId: "c1", description: "Courier services", amount: 35000, type: "expense", category: "Postage", date: "2026-02-23", balance: 395000, createdBy: "u10" },
  { id: "pc5", companyId: "c1", description: "Cleaning supplies", amount: 60000, type: "expense", category: "Maintenance", date: "2026-02-24", balance: 335000, createdBy: "u3" },
];

export const products: Product[] = [
  { id: "prod1", companyId: "c1", name: "BizSuite ERP - Standard License", sku: "ERP-STD-001", category: "Software", unit: "License", costPrice: 5000000, sellingPrice: 12000000, reorderLevel: 0, createdAt: "2020-01-15" },
  { id: "prod2", companyId: "c1", name: "BizSuite ERP - Enterprise License", sku: "ERP-ENT-001", category: "Software", unit: "License", costPrice: 10000000, sellingPrice: 35000000, reorderLevel: 0, createdAt: "2020-01-15" },
  { id: "prod3", companyId: "c1", name: "IT Support Hours", sku: "SVC-SUP-001", category: "Services", unit: "Hour", costPrice: 50000, sellingPrice: 150000, reorderLevel: 0, createdAt: "2020-01-15" },
  { id: "prod4", companyId: "c1", name: "Network Switch 24-port", sku: "HW-SW-024", category: "Hardware", unit: "Unit", costPrice: 1200000, sellingPrice: 2200000, reorderLevel: 3, createdAt: "2021-03-10" },
  { id: "prod5", companyId: "c1", name: "UPS 1500VA", sku: "HW-UPS-001", category: "Hardware", unit: "Unit", costPrice: 450000, sellingPrice: 850000, reorderLevel: 5, createdAt: "2021-03-10" },
  { id: "prod6", companyId: "c1", name: "Structured Cabling (per meter)", sku: "HW-CAB-001", category: "Hardware", unit: "Meter", costPrice: 2500, sellingPrice: 6000, reorderLevel: 100, createdAt: "2021-03-10" },
];

export const warehouses: Warehouse[] = [
  { id: "wh1", companyId: "c1", name: "Main Warehouse - DSM", location: "Dar es Salaam", managerId: "u3" },
  { id: "wh2", companyId: "c1", name: "Branch Store - Arusha", location: "Arusha", managerId: "u9" },
];

export const stockItems: StockItem[] = [
  { id: "si1", productId: "prod4", warehouseId: "wh1", companyId: "c1", quantity: 12, reservedQty: 3, availableQty: 9 },
  { id: "si2", productId: "prod5", warehouseId: "wh1", companyId: "c1", quantity: 8, reservedQty: 2, availableQty: 6 },
  { id: "si3", productId: "prod6", warehouseId: "wh1", companyId: "c1", quantity: 500, reservedQty: 50, availableQty: 450 },
  { id: "si4", productId: "prod4", warehouseId: "wh2", companyId: "c1", quantity: 4, reservedQty: 0, availableQty: 4 },
  { id: "si5", productId: "prod5", warehouseId: "wh2", companyId: "c1", quantity: 3, reservedQty: 1, availableQty: 2 },
];

export const vendors: Vendor[] = [
  { id: "v1", companyId: "c1", name: "Tech Distributors Ltd", email: "sales@techdist.co.tz", phone: "+255 744 700 001", address: "Dar es Salaam", category: "Hardware", status: "active", totalPurchases: 45000000, createdAt: "2021-01-10" },
  { id: "v2", companyId: "c1", name: "Microsoft East Africa", email: "partners@microsoft.co.tz", phone: "+255 744 700 002", address: "Nairobi, Kenya", category: "Software", status: "active", totalPurchases: 28000000, createdAt: "2020-03-15" },
  { id: "v3", companyId: "c1", name: "Office Supplies Co.", email: "info@officesupplies.co.tz", phone: "+255 744 700 003", address: "Dar es Salaam", category: "Stationery", status: "active", totalPurchases: 2500000, createdAt: "2020-06-20" },
  { id: "v4", companyId: "c1", name: "AWS Africa", email: "africa@aws.amazon.com", phone: "+1 800 000 0000", address: "Cape Town, SA", category: "Cloud Services", status: "active", totalPurchases: 8400000, createdAt: "2020-01-15" },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: "po1", companyId: "c1", vendorId: "v1", poNumber: "PO-2026-001", items: [{ productId: "prod4", productName: "Network Switch 24-port", quantity: 10, unitCost: 1200000, total: 12000000 }], total: 12000000, status: "received", orderDate: "2026-02-05", expectedDate: "2026-02-20", receivedDate: "2026-02-18" },
  { id: "po2", companyId: "c1", vendorId: "v1", poNumber: "PO-2026-002", items: [{ productId: "prod5", productName: "UPS 1500VA", quantity: 5, unitCost: 450000, total: 2250000 }], total: 2250000, status: "sent", orderDate: "2026-02-22", expectedDate: "2026-03-05" },
  { id: "po3", companyId: "c1", vendorId: "v3", poNumber: "PO-2026-003", items: [{ productId: "prod6", productName: "Structured Cabling", quantity: 500, unitCost: 2500, total: 1250000 }], total: 1250000, status: "draft", orderDate: "2026-02-26", expectedDate: "2026-03-10" },
];

export const attendanceRecords: AttendanceRecord[] = [
  { id: "att1", userId: "u7", companyId: "c1", date: "2026-02-24", clockIn: "08:05", clockOut: "17:10", hoursWorked: 9.08, overtime: 1.08, lateMinutes: 5, status: "present" },
  { id: "att2", userId: "u8", companyId: "c1", date: "2026-02-24", clockIn: "07:55", clockOut: "17:00", hoursWorked: 9.08, overtime: 1.08, lateMinutes: 0, status: "present" },
  { id: "att3", userId: "u9", companyId: "c1", date: "2026-02-24", clockIn: "09:30", clockOut: "17:00", hoursWorked: 7.5, overtime: 0, lateMinutes: 90, status: "late" },
  { id: "att4", userId: "u10", companyId: "c1", date: "2026-02-24", clockIn: "08:00", clockOut: "17:00", hoursWorked: 9, overtime: 1, lateMinutes: 0, status: "present" },
  { id: "att5", userId: "u11", companyId: "c1", date: "2026-02-24", clockIn: "08:00", clockOut: "13:00", hoursWorked: 5, overtime: 0, lateMinutes: 0, status: "half-day" },
  { id: "att6", userId: "u12", companyId: "c1", date: "2026-02-24", clockIn: "", clockOut: "", hoursWorked: 0, overtime: 0, lateMinutes: 0, status: "absent" },
  { id: "att7", userId: "u7", companyId: "c1", date: "2026-02-25", clockIn: "08:00", clockOut: "18:30", hoursWorked: 10.5, overtime: 2.5, lateMinutes: 0, status: "present" },
  { id: "att8", userId: "u8", companyId: "c1", date: "2026-02-25", clockIn: "08:10", clockOut: "17:05", hoursWorked: 8.92, overtime: 0.92, lateMinutes: 10, status: "present" },
];

export const kpis: KPI[] = [
  { id: "kpi1", userId: "u9", companyId: "c1", name: "Monthly Sales Target", category: "Sales", target: 50000000, actual: 38000000, unit: "TZS", period: "February 2026", status: "at-risk" },
  { id: "kpi2", userId: "u7", companyId: "c1", name: "Bug Resolution Rate", category: "Engineering", target: 95, actual: 88, unit: "%", period: "February 2026", status: "at-risk" },
  { id: "kpi3", userId: "u8", companyId: "c1", name: "Feature Delivery On-Time", category: "Engineering", target: 90, actual: 92, unit: "%", period: "February 2026", status: "on-track" },
  { id: "kpi4", userId: "u11", companyId: "c1", name: "Lead Generation", category: "Marketing", target: 200, actual: 145, unit: "Leads", period: "February 2026", status: "at-risk" },
  { id: "kpi5", companyId: "c1", name: "Total Revenue", category: "Financial", target: 100000000, actual: 80000000, unit: "TZS", period: "February 2026", status: "at-risk" },
  { id: "kpi6", companyId: "c1", name: "Customer Satisfaction Score", category: "Customer", target: 90, actual: 94, unit: "%", period: "February 2026", status: "on-track" },
  { id: "kpi7", companyId: "c1", name: "Employee Attendance Rate", category: "HR", target: 95, actual: 91, unit: "%", period: "February 2026", status: "at-risk" },
  { id: "kpi8", userId: "u4", companyId: "c1", name: "New Clients Acquired", category: "Sales", target: 5, actual: 6, unit: "Clients", period: "February 2026", status: "on-track" },
];

export const documents: Document[] = [
  { id: "doc1", companyId: "c1", name: "Employee Handbook 2026.pdf", category: "HR Policy", uploadedBy: "u3", uploadedAt: "2026-01-10", size: "2.4 MB", version: 3, permissions: ["all"], url: "#" },
  { id: "doc2", companyId: "c1", name: "Company Financial Report Q4 2025.xlsx", category: "Financial", uploadedBy: "u5", uploadedAt: "2026-01-15", size: "1.8 MB", version: 1, permissions: ["admin", "manager"], url: "#" },
  { id: "doc3", companyId: "c1", name: "Software Architecture v2.0.pdf", category: "Technical", uploadedBy: "u2", uploadedAt: "2026-02-01", size: "5.2 MB", version: 2, permissions: ["Engineering"], url: "#" },
  { id: "doc4", companyId: "c1", name: "Sales Strategy 2026.pptx", category: "Sales", uploadedBy: "u4", uploadedAt: "2026-02-05", size: "3.1 MB", version: 1, permissions: ["admin", "Sales"], url: "#" },
  { id: "doc5", companyId: "c1", name: "NDA Template - Standard.docx", category: "Legal", uploadedBy: "u1", uploadedAt: "2026-02-10", size: "0.5 MB", version: 4, permissions: ["admin", "manager"], url: "#" },
  { id: "doc6", companyId: "c1", name: "Brand Guidelines 2026.pdf", category: "Marketing", uploadedBy: "u6", uploadedAt: "2026-02-12", size: "8.7 MB", version: 1, permissions: ["all"], url: "#" },
];

export const notifications: Notification[] = [
  { id: "n1", userId: "u1", title: "Payroll Processed", message: "February 2026 payroll has been processed successfully for 12 employees.", type: "success", read: false, createdAt: "2026-02-26T10:00:00", link: "/payroll" },
  { id: "n2", userId: "u1", title: "New Support Ticket", message: "Critical ticket #ST-004 raised by Karibu Stores - Payment gateway issue.", type: "error", read: false, createdAt: "2026-02-26T09:30:00", link: "/crm/tickets" },
  { id: "n3", userId: "u1", title: "Leave Request Pending", message: "James Okafor has submitted a leave request for March 20-27.", type: "info", read: false, createdAt: "2026-02-25T14:00:00", link: "/leave" },
  { id: "n4", userId: "u1", title: "Invoice Overdue", message: "Invoice INV-2026-004 for Karibu Stores is overdue by 6 days.", type: "warning", read: true, createdAt: "2026-02-24T08:00:00", link: "/accounting/invoices" },
  { id: "n5", userId: "u1", title: "Task Completed", message: "Database Optimization task has been marked as completed by Mary Achieng.", type: "success", read: true, createdAt: "2026-02-24T16:30:00", link: "/tasks" },
  { id: "n6", userId: "u1", title: "Stock Alert", message: "UPS 1500VA stock is below reorder level at Arusha branch.", type: "warning", read: false, createdAt: "2026-02-26T08:00:00", link: "/inventory" },
];

export const messages: Message[] = [
  { id: "msg1", fromId: "u2", toId: "u1", companyId: "c1", subject: "Engineering Sprint Review", body: "Hi John, the Q1 sprint review is scheduled for March 5th at 2PM. Please confirm your attendance.", read: false, createdAt: "2026-02-26T09:00:00" },
  { id: "msg2", fromId: "u4", toId: "u1", companyId: "c1", subject: "TanzaNet Proposal Status", body: "The proposal has been sent to TanzaNet. They requested a demo session next week.", read: false, createdAt: "2026-02-25T16:00:00" },
  { id: "msg3", fromId: "u5", toId: "u1", companyId: "c1", subject: "Audit Documents Ready", body: "All documents for the annual audit are prepared and ready for review.", read: true, createdAt: "2026-02-25T11:00:00" },
  { id: "msg4", fromId: "u3", toId: "u1", companyId: "c1", subject: "New Employee Onboarding", body: "We have 2 new engineering hires starting March 1st. Onboarding schedule attached.", read: true, createdAt: "2026-02-24T10:00:00" },
];

export const auditLogs: AuditLog[] = [
  { id: "al1", userId: "u1", companyId: "c1", action: "LOGIN", module: "Authentication", details: "Admin logged in successfully", ipAddress: "196.216.1.100", timestamp: "2026-02-26T08:00:00" },
  { id: "al2", userId: "u5", companyId: "c1", action: "PAYROLL_APPROVED", module: "Payroll", details: "Approved February 2026 payroll for 12 employees - TZS 32,450,000", ipAddress: "196.216.1.101", timestamp: "2026-02-26T09:00:00" },
  { id: "al3", userId: "u4", companyId: "c1", action: "LEAVE_APPROVED", module: "Leave", details: "Approved leave request for James Okafor (8 days annual leave)", ipAddress: "196.216.1.102", timestamp: "2026-02-25T14:30:00" },
  { id: "al4", userId: "u2", companyId: "c1", action: "TASK_CREATED", module: "Tasks", details: "Created task 'Develop User Authentication Module' assigned to Samuel Banda", ipAddress: "196.216.1.103", timestamp: "2026-02-25T10:00:00" },
  { id: "al5", userId: "u10", companyId: "c1", action: "INVOICE_CREATED", module: "Accounting", details: "Created invoice INV-2026-005 for TanzaniaTech - TZS 7,080,000", ipAddress: "196.216.1.104", timestamp: "2026-02-25T15:00:00" },
  { id: "al6", userId: "u1", companyId: "c1", action: "USER_DEACTIVATED", module: "Users", details: "Deactivated user account: Rehema Juma (u12)", ipAddress: "196.216.1.100", timestamp: "2026-02-24T11:00:00" },
];

export const monthlyRevenueData = [
  { month: "Sep", revenue: 55000000, expenses: 38000000, profit: 17000000 },
  { month: "Oct", revenue: 62000000, expenses: 41000000, profit: 21000000 },
  { month: "Nov", revenue: 58000000, expenses: 39000000, profit: 19000000 },
  { month: "Dec", revenue: 75000000, expenses: 45000000, profit: 30000000 },
  { month: "Jan", revenue: 70000000, expenses: 42000000, profit: 28000000 },
  { month: "Feb", revenue: 80000000, expenses: 48000000, profit: 32000000 },
];

export const salesPipelineData = [
  { stage: "Leads", count: 24, value: 185000000 },
  { stage: "Prospects", count: 12, value: 125000000 },
  { stage: "Qualified", count: 8, value: 95000000 },
  { stage: "Proposal", count: 5, value: 65000000 },
  { stage: "Won", count: 3, value: 35000000 },
];

export const attendanceSummary = [
  { day: "Mon", present: 10, absent: 1, late: 1 },
  { day: "Tue", present: 11, absent: 0, late: 1 },
  { day: "Wed", present: 9, absent: 2, late: 1 },
  { day: "Thu", present: 10, absent: 1, late: 2 },
  { day: "Fri", present: 8, absent: 2, late: 2 },
];

export const currentUser = users[0];
export const currentCompany = companies[0];
