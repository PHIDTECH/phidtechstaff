"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageSquare, CheckCheck, Trash2, Info, CheckCircle, Send } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NOTIF_KEY   = "phidtech_notifications";
const MSGS_KEY    = "phidtech_messages";
const SESSION_KEY = "phidtech_session";
const USERS_KEY   = "phidtech_users";
const ACTIVE_KEY  = "phidtech_active_company";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Notif  { id: string; userId: string; message: string; read: boolean; createdAt: string; taskId?: string; }
interface Msg    { id: string; fromId: string; fromName: string; toId: string; subject: string; body: string; read: boolean; createdAt: string; }
interface Staff  { id: string; name: string; position: string; companyId: string; }

export default function NotificationsPage() {
  usePermissionGuard("notifications");
  const [notifList, setNotifList] = useState<Notif[]>([]);
  const [msgList,   setMsgList]   = useState<Msg[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [session,   setSession]   = useState<{id:string;name:string}|null>(null);
  const [compose, setCompose]     = useState({ toId: "", subject: "", body: "" });
  const [sent, setSent]           = useState(false);

  const reload = () => {
    const sess = lsGet<{id:string;name:string}>(SESSION_KEY, null as never);
    setSession(sess);
    const uid  = sess?.id ?? "superadmin";
    const cid  = lsStr(ACTIVE_KEY);
    const allNotifs = lsGet<Notif[]>(NOTIF_KEY, []);
    setNotifList(allNotifs.filter(n => n.userId === uid).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    const allMsgs = lsGet<Msg[]>(MSGS_KEY, []);
    setMsgList(allMsgs.filter(m => m.toId === uid).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    const allStaff = lsGet<Staff[]>(USERS_KEY, []);
    setStaffList(allStaff.filter(u => u.companyId === cid && u.id !== uid));
  };

  useEffect(() => {
    reload();
    window.addEventListener("phidtech_companies_updated", reload);
    return () => window.removeEventListener("phidtech_companies_updated", reload);
  }, []);

  const persist = (list: Notif[]) => { lsSet(NOTIF_KEY, [...lsGet<Notif[]>(NOTIF_KEY, []).filter(n => !list.find(x => x.id === n.id)), ...list]); };

  const markRead = (id: string) => {
    const updated = notifList.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifList(updated);
    persist(updated);
  };

  const markAllRead = () => {
    const updated = notifList.map(n => ({ ...n, read: true }));
    setNotifList(updated);
    persist(updated);
  };

  const deleteNotif = (id: string) => {
    const updated = notifList.filter(n => n.id !== id);
    setNotifList(updated);
    const all = lsGet<Notif[]>(NOTIF_KEY, []).filter(n => n.id !== id);
    lsSet(NOTIF_KEY, all);
  };

  const markMsgRead = (id: string) => {
    const updated = msgList.map(m => m.id === id ? { ...m, read: true } : m);
    setMsgList(updated);
    const all = lsGet<Msg[]>(MSGS_KEY, []).map(m => m.id === id ? { ...m, read: true } : m);
    lsSet(MSGS_KEY, all);
  };

  const deleteMsg = (id: string) => {
    setMsgList(prev => prev.filter(m => m.id !== id));
    lsSet(MSGS_KEY, lsGet<Msg[]>(MSGS_KEY, []).filter(m => m.id !== id));
  };

  const sendMessage = () => {
    if (!compose.toId || !compose.subject.trim() || !compose.body.trim()) return;
    const msg: Msg = {
      id: `msg-${Date.now()}`,
      fromId: session?.id ?? "superadmin",
      fromName: session?.name ?? "System Administrator",
      toId: compose.toId,
      subject: compose.subject.trim(),
      body: compose.body.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    const all = [...lsGet<Msg[]>(MSGS_KEY, []), msg];
    lsSet(MSGS_KEY, all);
    setCompose({ toId: "", subject: "", body: "" });
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const unread     = notifList.filter(n => !n.read).length;
  const unreadMsgs = msgList.filter(m => !m.read).length;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <MainLayout>
      <PageHeader
        title="Notifications & Messages"
        subtitle="System alerts, task updates and internal messages"
        icon={Bell}
        actions={
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="w-4 h-4 mr-2" /> Mark All Read
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Unread"        value={unread}          icon={Bell}          iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard title="Total Alerts"  value={notifList.length} icon={Info}          iconBg="bg-gray-50"   iconColor="text-gray-600" />
        <StatCard title="Unread Msgs"   value={unreadMsgs}      icon={Mail}          iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Total Msgs"    value={msgList.length}   icon={MessageSquare} iconBg="bg-green-50"  iconColor="text-green-600" />
      </div>

      <Tabs defaultValue="notifications">
        <TabsList className="mb-4">
          <TabsTrigger value="notifications">
            Notifications {unread > 0 && <span className="ml-1.5 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{unread}</span>}
          </TabsTrigger>
          <TabsTrigger value="messages">
            Messages {unreadMsgs > 0 && <span className="ml-1.5 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{unreadMsgs}</span>}
          </TabsTrigger>
        </TabsList>

        {/* ── Notifications ── */}
        <TabsContent value="notifications">
          <div className="space-y-2">
            {notifList.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <Bell className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">You have no notifications</p>
                <p className="text-xs text-gray-400 mt-1">Task assignments and comments will appear here</p>
              </div>
            ) : notifList.map(notif => (
              <div key={notif.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                  !notif.read ? "border-blue-100 bg-blue-50/40" : "border-gray-100 bg-white"
                }`}
                onClick={() => markRead(notif.id)}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!notif.read ? "bg-blue-100" : "bg-gray-100"}`}>
                  {notif.taskId
                    ? <CheckCircle className={`w-4 h-4 ${!notif.read ? "text-blue-600" : "text-gray-500"}`} />
                    : <Bell className={`w-4 h-4 ${!notif.read ? "text-blue-600" : "text-gray-500"}`} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm ${!notif.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {notif.message}
                        {!notif.read && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-500 align-middle" />}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {!notif.read && (
                        <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-7 px-2" onClick={() => markRead(notif.id)}>
                          Mark Read
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteNotif(notif.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Messages ── */}
        <TabsContent value="messages">
          <div className="space-y-2 mb-4">
            {msgList.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-12 text-center">
                <Mail className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No messages yet</p>
              </div>
            ) : msgList.map(msg => (
              <div key={msg.id}
                onClick={() => markMsgRead(msg.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer hover:bg-gray-50 transition-colors ${
                  !msg.read ? "border-purple-100 bg-purple-50/20" : "border-gray-100 bg-white"
                }`}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="text-sm">{getInitials(msg.fromName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${!msg.read ? "text-gray-900" : "text-gray-700"}`}>
                        {msg.fromName}
                        {!msg.read && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-purple-500 align-middle" />}
                      </p>
                      <p className={`text-sm mt-0.5 ${!msg.read ? "font-semibold text-gray-800" : "text-gray-600"}`}>{msg.subject}</p>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{msg.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(msg.createdAt)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={e => { e.stopPropagation(); deleteMsg(msg.id); }}>
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compose */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Compose Message</h3>
            {sent && (
              <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4 shrink-0" /> Message sent successfully.
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">To</label>
                <Select value={compose.toId} onValueChange={v => setCompose(c => ({...c, toId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                  <SelectContent>
                    {staffList.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} — {u.position}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject</label>
                <Input placeholder="Message subject" value={compose.subject} onChange={e => setCompose(c => ({...c, subject: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Message</label>
                <Textarea rows={4} placeholder="Type your message here..." value={compose.body} onChange={e => setCompose(c => ({...c, body: e.target.value}))} />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={sendMessage} disabled={!compose.toId || !compose.subject.trim() || !compose.body.trim()}>
                  <Send className="w-4 h-4 mr-2" /> Send Message
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
