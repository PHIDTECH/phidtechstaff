"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

interface Staff    { id: string; name: string; phone: string; companyId: string; status: string; }
interface Customer { id: string; name: string; phone: string; companyId: string; }
interface SmsLog   { id: string; to: string; recipientName: string; message: string; status: string; sentAt: string; trigger?: string; }

type SendMode = "single" | "staff" | "customer";

const VARS = ["{staff_name}", "{customer_name}", "{company_name}", "{date}", "{amount}"];
const SMS_LEN = 160;

function fmtDate(d: string) {
  try { return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
}

export default function MessagesPage() {
  const [staff,     setStaff]     = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs,      setLogs]      = useState<SmsLog[]>([]);
  const [balance,   setBalance]   = useState<number | null>(null);
  const [senderId,  setSenderId]  = useState("INFO");

  const [mode,        setMode]        = useState<SendMode>("single");
  const [singlePhone, setSinglePhone] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [message,     setMessage]     = useState("");
  const [sending,     setSending]     = useState(false);
  const [result,      setResult]      = useState<{ ok: boolean; msg: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadData = async () => {
    const [sr, cr, lr, br] = await Promise.allSettled([
      fetch("/api/users",                  { cache: "no-store" }),
      fetch("/api/customers",              { cache: "no-store" }),
      fetch("/api/messages",               { cache: "no-store" }),
      fetch("/api/settings/beem/balance",  { cache: "no-store" }),
    ]);
    if (sr.status === "fulfilled" && sr.value.ok) setStaff((await sr.value.json()).filter((u: Staff) => u.status !== "inactive"));
    if (cr.status === "fulfilled" && cr.value.ok) setCustomers(await cr.value.json());
    if (lr.status === "fulfilled" && lr.value.ok) setLogs(await lr.value.json());
    if (br.status === "fulfilled" && br.value.ok) {
      const d = await br.value.json();
      setBalance(d.balance ?? null);
      if (d.senderId) setSenderId(d.senderId);
    }
  };

  useEffect(() => { loadData(); }, []);

  const recipientList: (Staff | Customer)[] = mode === "staff" ? staff : customers;

  const resolvedPhone = (() => {
    if (mode === "single") return singlePhone.trim();
    return (recipientList.find(r => r.id === recipientId) as Staff | Customer | undefined)?.phone ?? "";
  })();

  const resolvedName = (() => {
    if (mode === "single") return singlePhone.trim();
    return (recipientList.find(r => r.id === recipientId) as Staff | Customer | undefined)?.name ?? "";
  })();

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

  const send = async () => {
    if (!message.trim())   { setResult({ ok: false, msg: "Please type a message." }); return; }
    if (!resolvedPhone)    { setResult({ ok: false, msg: "Please select a recipient or enter a phone number." }); return; }
    setSending(true); setResult(null);
    try {
      const res  = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: resolvedPhone, recipientName: resolvedName, message }),
      });
      const data = await res.json();
      if (data.sent) {
        setResult({ ok: true, msg: "SMS sent successfully!" });
        setMessage(""); setSinglePhone(""); setRecipientId("");
        loadData();
      } else {
        setResult({ ok: false, msg: "SMS failed. Check Beem API credentials in Admin → SMS Settings." });
      }
    } catch { setResult({ ok: false, msg: "Network error." }); }
    setSending(false);
  };

  const statusColor = (s: string) =>
    s === "sent" ? "text-green-600" : s === "failed" ? "text-red-500" : "text-gray-400";
  const StatusIcon = ({ s }: { s: string }) =>
    s === "sent" ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> :
    s === "failed" ? <XCircle className="w-3.5 h-3.5 text-red-500" /> :
    <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;

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
            {/* Radio row */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2.5 uppercase tracking-wide">Send To</p>
              <div className="flex flex-wrap gap-5">
                {(["single", "staff", "customer"] as const).map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio" name="sendMode" value={m}
                      checked={mode === m}
                      onChange={() => { setMode(m); setRecipientId(""); setSinglePhone(""); }}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 font-medium">
                      {m === "single" ? "Single Number" : m === "staff" ? "Select Staff" : "Select Customer"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Input based on mode */}
            {mode === "single" ? (
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
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  {mode === "staff" ? "Select Staff Member" : "Select Customer"}
                </label>
                <Select value={recipientId || undefined} onValueChange={setRecipientId}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder={mode === "staff" ? "Choose staff member…" : "Choose customer…"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {recipientList.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="font-medium">{r.name}</span>
                        {r.phone && <span className="text-gray-400 text-xs ml-2">{r.phone}</span>}
                      </SelectItem>
                    ))}
                    {recipientList.length === 0 && (
                      <SelectItem value="__none" disabled>No records found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {resolvedPhone && (
                  <p className="text-xs text-gray-500 mt-1">📱 {resolvedPhone}</p>
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
            {/* Sender ID */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Sender ID</label>
              <div className="flex items-center gap-2 max-w-sm px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                <span className="flex-1">{senderId || "INFO"} <span className="text-gray-400">(Default)</span></span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Change Sender ID in Admin → SMS Settings</p>
            </div>

            {/* Message textarea */}
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

            {/* Variable chips */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Available Variables:</p>
              <div className="flex flex-wrap gap-2">
                {VARS.map(v => (
                  <button
                    key={v}
                    onClick={() => insertVar(v)}
                    className="px-2.5 py-1 text-xs rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Buttons ── */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Button variant="outline" onClick={() => { setMessage(""); setSinglePhone(""); setRecipientId(""); setResult(null); }}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending || !message.trim() || !resolvedPhone} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Sending…" : "Send Message"}
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
