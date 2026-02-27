"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, Mail, MessageSquare, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { notifications, messages, users } from "@/lib/data";
import { formatDateTime, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function NotificationsPage() {
  const [notifList, setNotifList] = useState(notifications.filter(n => n.userId === "u1"));
  const [msgList] = useState(messages.filter(m => m.toId === "u1"));

  const unread = notifList.filter(n => !n.read).length;
  const unreadMsgs = msgList.filter(m => !m.read).length;

  const markAllRead = () => setNotifList(prev => prev.map(n => ({ ...n, read: true })));

  const notifIcon = (type: string) => {
    if (type === "success") return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (type === "error") return <XCircle className="w-4 h-4 text-red-500" />;
    if (type === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  const notifBg = (type: string) => ({
    success: "bg-green-50",
    error: "bg-red-50",
    warning: "bg-yellow-50",
    info: "bg-blue-50",
  }[type] || "bg-gray-50");

  return (
    <MainLayout>
      <PageHeader
        title="Notifications & Messages"
        subtitle="System alerts, in-app notifications and internal messages"
        icon={Bell}
        actions={
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" /> Mark All Read
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Unread Notifications" value={unread} icon={Bell} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Total Notifications" value={notifList.length} icon={Bell} iconBg="bg-gray-50" iconColor="text-gray-600" />
        <StatCard title="Unread Messages" value={unreadMsgs} icon={Mail} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Total Messages" value={msgList.length} icon={MessageSquare} iconBg="bg-green-50" iconColor="text-green-600" />
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

        <TabsContent value="notifications">
          <div className="space-y-2">
            {notifList.map(notif => (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                  !notif.read ? "border-blue-100 bg-blue-50/30" : "border-gray-100 bg-white"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${notifBg(notif.type)}`}>
                  {notifIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium ${!notif.read ? "text-gray-900" : "text-gray-700"}`}>
                        {notif.title}
                        {!notif.read && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-500" />}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(notif.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!notif.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-blue-600 h-7"
                          onClick={() => setNotifList(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                        >
                          Mark Read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setNotifList(prev => prev.filter(n => n.id !== notif.id))}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {notifList.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No notifications</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="messages">
          <div className="space-y-2">
            {msgList.map(msg => {
              const sender = users.find(u => u.id === msg.fromId);
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer hover:bg-gray-50 transition-colors ${
                    !msg.read ? "border-purple-100 bg-purple-50/20" : "border-gray-100 bg-white"
                  }`}
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="text-sm">{sender ? getInitials(sender.name) : "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${!msg.read ? "text-gray-900" : "text-gray-700"}`}>
                            {sender?.name}
                            {!msg.read && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-purple-500" />}
                          </p>
                          <p className="text-xs text-gray-400">{sender?.position}</p>
                        </div>
                        <p className={`text-sm mt-0.5 ${!msg.read ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                          {msg.subject}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{msg.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(msg.createdAt)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compose Message */}
          <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Compose Message</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">To</label>
                <select className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <option value="">Select recipient</option>
                  {users.filter(u => u.companyId === "c1" && u.id !== "u1").map(u => (
                    <option key={u.id} value={u.id}>{u.name} – {u.position}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject</label>
                <input
                  type="text"
                  placeholder="Message subject"
                  className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Message</label>
                <textarea
                  rows={4}
                  placeholder="Type your message here..."
                  className="flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
              <div className="flex justify-end">
                <Button size="sm">
                  <Mail className="w-4 h-4 mr-2" /> Send Message
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
