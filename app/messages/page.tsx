"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Users, UserCheck, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Staff   { id: string; name: string; phone: string; companyId: string; status: string; }
interface Customer{ id: string; name: string; phone: string; companyId: string; }
interface SmsLog  { id: string; to: string; recipientName: string; message: string; status: string; sentAt: string; trigger?: string; }

function fmtDate(d: string) {
  try { return new Date(d).toLocaleString("en-GB", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }); }
  catch { return d; }
}

const CHARS_MAX = 160;

export default function MessagesPage() {
  const [staff,     setStaff]     = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs,      setLogs]      = useState<SmsLog[]>([]);

  const [recipientType, setRecipientType] = useState<"staff"|"customer"|"custom">("staff");
  const [recipientId,   setRecipientId]   = useState("");
  const [customPhone,   setCustomPhone]   = useState("");
  const [customName,    setCustomName]    = useState("");
  const [message,       setMessage]       = useState("");
  const [sending,       setSending]       = useState(false);
  const [result,        setResult]        = useState<{ok: boolean; msg: string} | null>(null);

  const loadData = async () => {
    try {
      const [sr, cr, lr] = await Promise.all([
        fetch("/api/users",     { cache: "no-store" }),
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/messages",  { cache: "no-store" }),
      ]);
      if (sr.ok) setStaff((await sr.json()).filter((u: Staff) => u.status !== "inactive"));
      if (cr.ok) setCustomers(await cr.json());
      if (lr.ok) setLogs(await lr.json());
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const selectedPhone = (() => {
    if (recipientType === "custom") return customPhone;
    if (recipientType === "staff")    return staff.find(u => u.id === recipientId)?.phone ?? "";
    return customers.find(c => c.id === recipientId)?.phone ?? "";
  })();

  const selectedName = (() => {
    if (recipientType === "custom") return customName || customPhone;
    if (recipientType === "staff")    return staff.find(u => u.id === recipientId)?.name ?? "";
    return customers.find(c => c.id === recipientId)?.name ?? "";
  })();

  const send = async () => {
    if (!message.trim()) { setResult({ ok: false, msg: "Message is required." }); return; }
    if (!selectedPhone)  { setResult({ ok: false, msg: "Select a recipient or enter a phone number." }); return; }
    setSending(true); setResult(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedPhone, recipientName: selectedName, message }),
      });
      const data = await res.json();
      if (data.sent) {
        setResult({ ok: true, msg: "SMS sent successfully!" });
        setMessage("");
        setRecipientId("");
        setCustomPhone("");
        setCustomName("");
        loadData();
      } else {
        setResult({ ok: false, msg: "SMS failed. Check Beem API credentials in Admin → SMS Settings." });
      }
    } catch { setResult({ ok: false, msg: "Network error." }); }
    finally { setSending(false); }
  };

  const statusIcon = (s: string) => {
    if (s === "sent")      return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
    if (s === "failed")    return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
  };

  const recipientList = recipientType === "staff" ? staff : customers;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">SMS Messages</h1>
            <p className="text-sm text-gray-500">Send SMS to staff and customers via Beem Africa</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Compose */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" /> Compose
            </h2>

            {result && (
              <div className={`text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${result.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {result.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                {result.msg}
              </div>
            )}

            {/* Recipient type */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Send To</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["staff", "customer", "custom"] as const).map(t => (
                  <button key={t} onClick={() => { setRecipientType(t); setRecipientId(""); }}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize ${
                      recipientType === t
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}>
                    {t === "custom" ? "Custom" : t === "staff" ? "Staff" : "Customer"}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient select */}
            {recipientType !== "custom" ? (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  {recipientType === "staff" ? "Select Staff" : "Select Customer"}
                </label>
                <Select value={recipientId || undefined} onValueChange={setRecipientId}>
                  <SelectTrigger><SelectValue placeholder="Choose recipient…" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {recipientList.map((r: Staff | Customer) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="font-medium">{r.name}</span>
                        {r.phone && <span className="text-gray-400 text-xs ml-1">· {r.phone}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPhone && (
                  <p className="text-xs text-gray-500 mt-1">📱 {selectedPhone}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Name (optional)</label>
                  <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Recipient name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone Number *</label>
                  <Input value={customPhone} onChange={e => setCustomPhone(e.target.value)} placeholder="e.g. 0755123456" />
                </div>
              </div>
            )}

            {/* Message */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Message *</span>
                <span className={`text-xs ${message.length > CHARS_MAX ? "text-red-500" : "text-gray-400"}`}>
                  {message.length}/{CHARS_MAX}
                </span>
              </label>
              <Textarea
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message here…"
                className="resize-none"
              />
            </div>

            <Button onClick={send} disabled={sending || !message.trim() || !selectedPhone} className="w-full">
              <Send className="w-4 h-4 mr-2" />{sending ? "Sending…" : "Send SMS"}
            </Button>
          </div>

          {/* Log */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" /> Message History
              </h2>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />Sent: {logs.filter(l=>l.status==="sent").length}</span>
                <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" />Failed: {logs.filter(l=>l.status==="failed").length}</span>
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No messages sent yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                      {recipientType === "staff"
                        ? <Users className="w-3.5 h-3.5 text-blue-600" />
                        : <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{log.recipientName || log.to}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {statusIcon(log.status)}
                          <span className={`text-xs font-medium ${log.status === "sent" ? "text-green-600" : log.status === "failed" ? "text-red-500" : "text-gray-400"}`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{log.to}</p>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-2">{log.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">{fmtDate(log.sentAt)}</span>
                        {log.trigger && log.trigger !== "manual" && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full">{log.trigger}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
