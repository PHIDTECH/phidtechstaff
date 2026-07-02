"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Users } from "lucide-react";

interface Staff        { id: string; name: string; phone: string; companyId: string; status: string; }
interface Customer     { id: string; name: string; phone: string; companyId: string; }
interface LoanCustomer { id: string; customerName: string; contactPhone?: string; companyId: string; }
interface MfCustomer   { id: string; name: string; phone: string; companyId: string; }
interface MktCustomer  { id: string; name: string; phone: string; companyId: string; }
interface GenCustomer  { id: string; name: string; phone: string; companyId: string; }
interface SmsLog       { id: string; to: string; recipientName: string; message: string; status: string; sentAt: string; trigger?: string; error?: string; }

interface PendingCustomer { id: string; name: string; phone: string; companyId: string; amountNegotiated?: number; promisedDate?: string; }
type SendMode = "single" | "staff" | "customer" | "loan_customer" | "microfinance" | "marketing_customer" | "media_customer" | "business_customer" | "licence_customer" | "entertainment_customer" | "movies_customer" | "pending_payment";

const VARS = ["{staff_name}", "{customer_name}", "{company_name}", "{date}", "{amount}"];
const SMS_LEN = 160;

function fmtDate(d: string) {
  try { return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
}

export default function MessagesPage() {
  const [staff,          setStaff]          = useState<Staff[]>([]);
  const [customers,      setCustomers]      = useState<Customer[]>([]);
  const [loanCustomers,         setLoanCustomers]         = useState<Customer[]>([]);
  const [microfinanceCusts,     setMicrofinanceCusts]     = useState<Customer[]>([]);
  const [marketingCusts,        setMarketingCusts]        = useState<Customer[]>([]);
  const [mediaCusts,            setMediaCusts]            = useState<Customer[]>([]);
  const [businessCusts,         setBusinessCusts]         = useState<Customer[]>([]);
  const [licenceCusts,          setLicenceCusts]          = useState<Customer[]>([]);
  const [entertainmentCusts,    setEntertainmentCusts]    = useState<Customer[]>([]);
  const [moviesCusts,           setMoviesCusts]           = useState<Customer[]>([]);
  const [pendingCusts,          setPendingCusts]          = useState<PendingCustomer[]>([]);
  const [logs,           setLogs]           = useState<SmsLog[]>([]);
  const [balance,      setBalance]      = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [senderId,     setSenderId]     = useState("INFO");

  const [mode,            setMode]            = useState<SendMode>("single");
  const [singlePhone,     setSinglePhone]     = useState("");
  const [selectedIds,     setSelectedIds]     = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [message,         setMessage]         = useState("");
  const [sending,         setSending]         = useState(false);
  const [sendProgress,    setSendProgress]    = useState<{ done: number; total: number } | null>(null);
  const [result,          setResult]          = useState<{ ok: boolean; msg: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadData = async () => {
    const _r = await Promise.allSettled([
      fetch("/api/users",                  { cache: "no-store" }),
      fetch("/api/customers",              { cache: "no-store" }),
      fetch("/api/loans",                  { cache: "no-store" }),
      fetch("/api/messages",               { cache: "no-store" }),
      fetch("/api/settings/beem/balance",  { cache: "no-store" }),
      fetch("/api/microfinance-customers",    { cache: "no-store" }),
      fetch("/api/marketing-customers",       { cache: "no-store" }),
      fetch("/api/media-customers",           { cache: "no-store" }),
      fetch("/api/business-customers",        { cache: "no-store" }),
      fetch("/api/licence-customers",         { cache: "no-store" }),
      fetch("/api/entertainment-customers",   { cache: "no-store" }),
      fetch("/api/movies-customers",          { cache: "no-store" }),
      fetch("/api/pending-payments",           { cache: "no-store" }),
    ]);
    const sr = _r[0]; const cr = _r[1]; const loanR = _r[2];
    const lr = _r[3]; const br = _r[4]; const mfR = _r[5]; const mktR = _r[6];
    const mdR = _r[7]; const bsR = _r[8]; const lcR = _r[9]; const enR = _r[10]; const mvR = _r[11]; const ppR = _r[12];
    if (sr.status === "fulfilled" && sr.value.ok)
      setStaff((await sr.value.json()).filter((u: Staff) => u.status !== "inactive"));

    // Read customers once; also used to enrich loan phone numbers
    let custList: Customer[] = [];
    if (cr.status === "fulfilled" && cr.value.ok) {
      custList = await cr.value.json();
      setCustomers(custList);
    }

    if (loanR.status === "fulfilled" && loanR.value.ok) {
      const raw: LoanCustomer[] = await loanR.value.json();
      // Cross-reference each loan with the Sales customers list for phone numbers
      const merged: Customer[] = raw.map(l => {
        const norm = (s: string) => s.toLowerCase().trim();
        const match = custList.find(c => norm(c.name) === norm(l.customerName));
        return {
          id:        l.id,
          name:      l.customerName,
          phone:     match?.phone || l.contactPhone || "",
          companyId: l.companyId,
        };
      });
      // Deduplicate by name (same customer may have multiple loans)
      const seen = new Set<string>();
      const unique = merged.filter(c => {
        const key = c.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
      setLoanCustomers(unique);
    }

    if (lr.status === "fulfilled" && lr.value.ok) setLogs(await lr.value.json());
    if (mfR.status === "fulfilled" && mfR.value.ok) {
      const raw: MfCustomer[] = await mfR.value.json();
      setMicrofinanceCusts(raw.map(m => ({ id: m.id, name: m.name, phone: m.phone, companyId: m.companyId })));
    }
    if (mktR.status === "fulfilled" && mktR.value.ok) {
      const raw: MktCustomer[] = await mktR.value.json();
      setMarketingCusts(raw.map(m => ({ id: m.id, name: m.name, phone: m.phone, companyId: m.companyId })));
    }
    const mapGen = async (r: PromiseSettledResult<Response>, setter: (v: Customer[]) => void) => {
      if (r.status === "fulfilled" && r.value.ok) {
        const raw: GenCustomer[] = await r.value.json();
        setter(raw.map(m => ({ id: m.id, name: m.name, phone: m.phone, companyId: m.companyId })));
      }
    };
    await Promise.all([
      mapGen(mdR, setMediaCusts),
      mapGen(bsR, setBusinessCusts),
      mapGen(lcR, setLicenceCusts),
      mapGen(enR, setEntertainmentCusts),
      mapGen(mvR, setMoviesCusts),
    ]);
    if (ppR && ppR.status === "fulfilled" && ppR.value.ok) {
      const raw: { id:string; customerName:string; phone?:string; companyId:string; amountNegotiated:number; promisedDate:string; status:string }[] = await ppR.value.json();
      setPendingCusts(raw.filter(p=>p.status!=="paid").map(p=>({ id:p.id, name:p.customerName, phone:p.phone??"", companyId:p.companyId, amountNegotiated:p.amountNegotiated, promisedDate:p.promisedDate })));
    }
    if (br.status === "fulfilled" && br.value.ok) {
      const d = await br.value.json();
      setBalance(d.balance ?? null);
      if (d.senderId) setSenderId(d.senderId);
      if (d.error) setBalanceError(d.error);
      else setBalanceError(null);
    }
  };

  useEffect(() => { loadData(); }, []);

  const recipientList: Customer[] =
    mode === "staff"                 ? (staff as unknown as Customer[]) :
    mode === "loan_customer"         ? loanCustomers :
    mode === "microfinance"          ? microfinanceCusts :
    mode === "marketing_customer"    ? marketingCusts :
    mode === "media_customer"        ? mediaCusts :
    mode === "business_customer"     ? businessCusts :
    mode === "licence_customer"      ? licenceCusts :
    mode === "entertainment_customer"? entertainmentCusts :
    mode === "movies_customer"       ? moviesCusts :
    mode === "pending_payment"       ? (pendingCusts as unknown as Customer[]) :
    customers;
  const filteredRecipients = recipientList.filter(r =>
    r.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
    (r.phone ?? "").includes(recipientSearch)
  );

  const insertVar = (v: string) => {
    const ta = textareaRef.current;
    if (!ta) { setMessage(m => m + v); return; }
    const start = ta.selectionStart ?? message.length;
    const end   = ta.selectionEnd   ?? message.length;
    const next  = message.slice(0, start) + v + message.slice(end);
    setMessage(next);
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + v.length; ta.focus(); });
  };

  const smsCount = Math.ceil((message.length || 1) / SMS_LEN);
  const canSend  = !!message.trim() && (mode === "single" ? !!singlePhone.trim() : selectedIds.length > 0);

  const sendMessages = async () => {
    if (!message.trim()) { setResult({ ok: false, msg: "Please type a message." }); return; }
    const toSend: { phone: string; name: string }[] = [];
    if (mode === "single") {
      if (!singlePhone.trim()) { setResult({ ok: false, msg: "Please enter a phone number." }); return; }
      toSend.push({ phone: singlePhone.trim(), name: singlePhone.trim() });
    } else {
      if (selectedIds.length === 0) { setResult({ ok: false, msg: "Please select at least one recipient." }); return; }
      for (const id of selectedIds) {
        const r = recipientList.find(x => x.id === id);
        if (r?.phone) toSend.push({ phone: r.phone, name: r.name });
      }
      if (toSend.length === 0) { setResult({ ok: false, msg: "None of the selected recipients have a phone number." }); return; }
    }

    setSending(true); setResult(null); setSendProgress({ done: 0, total: toSend.length });
    let sent = 0; let failed = 0;
    for (let i = 0; i < toSend.length; i++) {
      try {
        const res  = await fetch("/api/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: toSend[i].phone, recipientName: toSend[i].name, message }),
        });
        const data = await res.json();
        if (data.sent) sent++; else failed++;
      } catch { failed++; }
      setSendProgress({ done: i + 1, total: toSend.length });
    }
    setSending(false); setSendProgress(null);
    if (sent > 0) {
      setResult({ ok: true, msg: `${sent} SMS sent successfully!${failed > 0 ? ` (${failed} failed)` : ""}` });
      setMessage(""); setSinglePhone(""); setSelectedIds([]); setRecipientSearch("");
      loadData();
    } else {
      setResult({ ok: false, msg: `All ${failed} SMS failed. Check Beem API credentials in Admin → SMS Settings.` });
    }
  };

  const statusColor = (s: string) =>
    s === "sent" ? "text-green-600" : s === "failed" ? "text-red-500" : "text-gray-400";
  const StatusIcon = ({ s }: { s: string }) =>
    s === "sent"   ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> :
    s === "failed" ? <XCircle     className="w-3.5 h-3.5 text-red-500"   /> :
                     <AlertCircle className="w-3.5 h-3.5 text-gray-400"  />;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Compose Message</h1>
            <p className="text-sm text-gray-500 mt-0.5">Send SMS notifications to your staff and customers</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">SMS Balance</p>
            <p className={`text-2xl font-bold ${balance === null ? "text-gray-300" : "text-blue-600"}`}>
              {balance === null ? "—" : balance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Beem config error warning ── */}
        {balanceError && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm border bg-amber-50 border-amber-200 text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">SMS Gateway Warning</p>
              <p className="text-xs mt-0.5">{balanceError} — <a href="/admin" className="underline">Go to Admin → SMS Settings</a> to fix.</p>
            </div>
          </div>
        )}

        {/* ── Alert ── */}
        {result && (
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm border ${result.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {result.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {result.msg}
          </div>
        )}

        {/* ── Recipients Card ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800 text-sm">Recipients</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Mode radio row */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2.5 uppercase tracking-wide">Send To</p>
              <div className="flex flex-wrap gap-5">
{(["single", "staff", "customer", "loan_customer", "microfinance", "marketing_customer", "media_customer", "business_customer", "licence_customer", "entertainment_customer", "movies_customer", "pending_payment"] as const).map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio" name="sendMode" value={m}
                      checked={mode === m}
                      onChange={() => { setMode(m); setSelectedIds([]); setSinglePhone(""); setRecipientSearch(""); }}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 font-medium">
                      {m === "single" ? "Single Number" : m === "staff" ? "Staff Members" : m === "loan_customer" ? "Loan Customers" : m === "microfinance" ? "Microfinance Customers" : m === "marketing_customer" ? "Marketing Customers" : m === "media_customer" ? "Media Customers" : m === "business_customer" ? "Business Customers" : m === "licence_customer" ? "Licence Customers" : m === "entertainment_customer" ? "Entertainment Customers" : m === "movies_customer" ? "Movies Customers" : m === "pending_payment" ? "Pending Payments" : "Customers"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Single number input */}
            {mode === "single" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone Number</label>
                <Input
                  value={singlePhone}
                  onChange={e => setSinglePhone(e.target.value)}
                  placeholder="e.g. 0712345678 or 255712345678"
                  className="max-w-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Enter phone number with or without country code</p>
              </div>
            )}

            {/* Multi-select checklist */}
            {mode !== "single" && (
              <div>
                {/* Header: label + count badge + Select All / Clear */}
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    {mode === "staff" ? "Staff Members" : mode === "loan_customer" ? "Loan Customers" : mode === "microfinance" ? "Microfinance Customers" : mode === "marketing_customer" ? "Marketing Customers" : mode === "media_customer" ? "Media Customers" : mode === "business_customer" ? "Business Customers" : mode === "licence_customer" ? "Licence Customers" : mode === "entertainment_customer" ? "Entertainment Customers" : mode === "movies_customer" ? "Movies Customers" : "Customers"}
                    {selectedIds.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                        {selectedIds.length} selected
                      </span>
                    )}
                  </label>
                  <div className="flex gap-3 text-xs">
                    <button type="button"
                      onClick={() => setSelectedIds(filteredRecipients.map(r => r.id))}
                      className="text-blue-600 hover:underline font-medium"
                    >Select All</button>
                    <button type="button"
                      onClick={() => setSelectedIds([])}
                      className="text-gray-400 hover:underline"
                    >Clear</button>
                  </div>
                </div>

                {/* Search box */}
                <Input
                  placeholder={`Search ${mode === "staff" ? "staff" : mode === "loan_customer" ? "loan customers" : mode === "microfinance" ? "microfinance customers" : mode === "marketing_customer" ? "marketing customers" : mode === "media_customer" ? "media customers" : mode === "business_customer" ? "business customers" : mode === "licence_customer" ? "licence customers" : mode === "entertainment_customer" ? "entertainment customers" : mode === "movies_customer" ? "movies customers" : "customers"} by name or phone…`}
                  value={recipientSearch}
                  onChange={e => setRecipientSearch(e.target.value)}
                  className="mb-2"
                />

                {/* Checklist */}
                <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {filteredRecipients.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">No records found</div>
                  ) : (
                    filteredRecipients.map(r => {
                      const checked = selectedIds.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? "bg-blue-50" : "hover:bg-gray-50"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              if (e.target.checked) setSelectedIds(ids => [...ids, r.id]);
                              else setSelectedIds(ids => ids.filter(id => id !== r.id));
                            }}
                            className="w-4 h-4 accent-blue-600 rounded shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{r.name}</p>
                            {r.phone
                              ? <p className="text-xs text-gray-400">{r.phone}</p>
                              : <p className="text-xs text-red-400 italic">No phone number</p>
                            }
                          </div>
                          {checked && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
                        </label>
                      );
                    })
                  )}
                </div>

                {selectedIds.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1.5 font-medium">
                    {selectedIds.length} recipient{selectedIds.length !== 1 ? "s" : ""} selected
                    {" · "}{selectedIds.filter(id => !!recipientList.find(x => x.id === id)?.phone).length} with phone numbers
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Message Card ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800 text-sm">Message</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Sender ID</label>
              <div className="flex items-center gap-2 max-w-sm px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                <span className="flex-1">{senderId || "INFO"} <span className="text-gray-400">(Default)</span></span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Change Sender ID in Admin → SMS Settings</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Message</label>
              <Textarea
                ref={textareaRef}
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="resize-none"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-xs ${message.length > SMS_LEN * 3 ? "text-red-500" : "text-gray-400"}`}>
                  Characters: {message.length}/800
                </span>
                <span className="text-xs text-gray-400">SMS count: {smsCount}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Available Variables:</p>
              <div className="flex flex-wrap gap-2">
                {VARS.map(v => (
                  <button key={v} onClick={() => insertVar(v)}
                    className="px-2.5 py-1 text-xs rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-mono">
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Send Progress Bar ── */}
        {sending && sendProgress && sendProgress.total > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                Sending… {sendProgress.done} / {sendProgress.total}
              </p>
              <div className="mt-1.5 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${(sendProgress.done / sendProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Footer Buttons ── */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Button variant="outline" onClick={() => { setMessage(""); setSinglePhone(""); setSelectedIds([]); setRecipientSearch(""); setResult(null); }}>
            Cancel
          </Button>
          <Button onClick={sendMessages} disabled={sending || !canSend} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Sending…" : mode !== "single" && selectedIds.length > 1 ? `Send to ${selectedIds.length} Recipients` : "Send Message"}
          </Button>
        </div>

        {/* ── Message History ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Message History
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">
                <span className="text-green-600 font-medium">{logs.filter(l => l.status === "sent").length}</span> sent ·{" "}
                <span className="text-red-500 font-medium">{logs.filter(l => l.status === "failed").length}</span> failed
              </span>
              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No messages sent yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-blue-600">
                    {(log.recipientName || log.to).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{log.recipientName || log.to}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusIcon s={log.status} />
                        <span className={`text-xs font-medium capitalize ${statusColor(log.status)}`}>{log.status}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">{log.to}</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{log.message}</p>
                    {log.error && (
                      <p className="text-[11px] text-red-500 mt-0.5 font-mono">{log.error}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-gray-400">{fmtDate(log.sentAt)}</span>
                      {log.trigger && log.trigger !== "manual" && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full font-medium">{log.trigger}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </MainLayout>
  );
}
