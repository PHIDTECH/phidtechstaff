export interface Company {
  id: string;
  name: string;
  logo?: string;
  industry: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "manager" | "staff";
  department: string;
  position: string;
  avatar?: string;
  status: "active" | "inactive";
  salary: number;
  joinDate: string;
  createdAt: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  managerId: string;
  headCount: number;
}

export interface Task {
  id: string;
  companyId: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  department: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  dueDate: string;
  completedAt?: string;
  createdAt: string;
  tags: string[];
}

export interface LeaveRequest {
  id: string;
  userId: string;
  companyId: string;
  type: "annual" | "sick" | "maternity" | "paternity" | "unpaid" | "emergency";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  createdAt: string;
}

export interface LeaveBalance {
  userId: string;
  annual: number;
  sick: number;
  maternity: number;
  paternity: number;
  used: number;
  remaining: number;
}

export interface Payroll {
  id: string;
  userId: string;
  companyId: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  grossSalary: number;
  netSalary: number;
  status: "draft" | "approved" | "paid";
  paidAt?: string;
  createdAt: string;
}

export interface SalaryAdvance {
  id: string;
  userId: string;
  companyId: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "repaid";
  approvedBy?: string;
  requestDate: string;
  repaymentDate?: string;
}

export interface Account {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  balance: number;
  parentId?: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  accountId: string;
  type: "debit" | "credit";
  amount: number;
  description: string;
  reference: string;
  date: string;
  category: string;
  createdBy: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  customerId: string;
  invoiceNumber: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue";
  issueDate: string;
  dueDate: string;
  paidAt?: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  type: "individual" | "business";
  status: "active" | "inactive";
  totalRevenue: number;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  customerId: string;
  companyId: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "resolved" | "closed";
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface SalesLead {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: string;
  stage: "lead" | "prospect" | "qualified" | "proposal" | "won" | "lost";
  value: number;
  assignedTo: string;
  probability: number;
  expectedClose: string;
  createdAt: string;
}

export interface Quotation {
  id: string;
  companyId: string;
  leadId?: string;
  customerId?: string;
  quoteNumber: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  validUntil: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  companyId: string;
  name: string;
  type: "email" | "sms" | "social" | "event" | "paid";
  status: "draft" | "active" | "paused" | "completed";
  budget: number;
  spent: number;
  leads: number;
  conversions: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  companyId: string;
  name: string;
  category: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number;
  depreciationRate: number;
  assignedTo?: string;
  location: string;
  status: "active" | "maintenance" | "disposed";
  nextMaintenance?: string;
}

export interface ExpenseClaim {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  category: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  status: "pending" | "approved" | "rejected" | "paid";
  approvedBy?: string;
  submittedAt: string;
  approvedAt?: string;
}

export interface PettyCash {
  id: string;
  companyId: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  balance: number;
  createdBy: string;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  createdAt: string;
}

export interface StockItem {
  id: string;
  productId: string;
  warehouseId: string;
  companyId: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
}

export interface Warehouse {
  id: string;
  companyId: string;
  name: string;
  location: string;
  managerId: string;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  vendorId: string;
  poNumber: string;
  items: { productId: string; productName: string; quantity: number; unitCost: number; total: number }[];
  total: number;
  status: "draft" | "sent" | "received" | "cancelled";
  orderDate: string;
  expectedDate: string;
  receivedDate?: string;
}

export interface Vendor {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  status: "active" | "inactive";
  totalPurchases: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  companyId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  hoursWorked?: number;
  overtime?: number;
  lateMinutes?: number;
  status: "present" | "absent" | "late" | "half-day";
}

export interface KPI {
  id: string;
  userId?: string;
  companyId: string;
  name: string;
  category: string;
  target: number;
  actual: number;
  unit: string;
  period: string;
  status: "on-track" | "at-risk" | "off-track";
}

export interface Document {
  id: string;
  companyId: string;
  name: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  version: number;
  permissions: string[];
  url: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  companyId: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  companyId: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}
