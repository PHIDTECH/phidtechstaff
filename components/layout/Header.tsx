"use client";
import { Bell, Search, Menu, ChevronDown, Building2, LogOut, User, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getInitials, formatDateTime } from "@/lib/utils";

const COMPANIES_KEY = "phidtech_companies";
const ACTIVE_KEY    = "phidtech_active_company";
const SESSION_KEY   = "phidtech_session";
const NOTIF_KEY     = "phidtech_notifications";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = ""): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

interface HeaderProps {
  onMobileMenuOpen: () => void;
}

export default function Header({ onMobileMenuOpen }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);
  const [companiesList, setCompaniesList] = useState<{id:string;name:string;industry?:string}[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState("Admin");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [myCompanyId, setMyCompanyId] = useState(""); // staff's own company
  const [notifList, setNotifList] = useState<{id:string;userId:string;message:string;read:boolean;createdAt:string}[]>([]);

  const reloadCompanies = () => {
    setCompaniesList(lsGet(COMPANIES_KEY, []));
    // Read raw (not JSON-parsed) to avoid side-effects from lsSet
    try {
      const raw = localStorage.getItem(ACTIVE_KEY) ?? "";
      setActiveCompanyIdState(raw && raw !== '""' ? raw.replace(/^"|"$/g, "") : "");
    } catch { setActiveCompanyIdState(""); }
  };

  const reloadSession = () => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (s) {
        const sess = JSON.parse(s);
        setProfileName(sess.name ?? "");
        setProfileRole(sess.position ?? sess.role ?? "Admin");
        setIsSuperAdmin(sess.isSuperAdmin === true);
        setMyCompanyId(sess.companyId ?? "");
        // Load this user's notifications
        const uid = sess.id ?? "";
        const allNotifs = lsGet<{id:string;userId:string;message:string;read:boolean;createdAt:string}[]>(NOTIF_KEY, []);
        setNotifList(allNotifs.filter(n => n.userId === uid).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
      }
      const stored = localStorage.getItem("phidtech_profile");
      if (stored) {
        const p = JSON.parse(stored);
        if (p.name) setProfileName(p.name);
      }
      const photo = localStorage.getItem("phidtech_profile_photo");
      if (photo) setProfilePhoto(photo);
    } catch {}
  };

  useEffect(() => {
    reloadCompanies();
    reloadSession();

    const onCustom = () => reloadCompanies();
    const onStorage = (e: StorageEvent) => {
      if (e.key === COMPANIES_KEY || e.key === ACTIVE_KEY) reloadCompanies();
      if (e.key === "phidtech_session") reloadSession();
    };
    const onSession = () => reloadSession();
    window.addEventListener("phidtech_companies_updated", onCustom);
    window.addEventListener("phidtech_session_updated", onSession);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("phidtech_companies_updated", onCustom);
      window.removeEventListener("phidtech_session_updated", onSession);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Superadmin sees the currently switched company; staff always see their own company
  const activeCompany = isSuperAdmin
    ? companiesList.find(c => c.id === activeCompanyId)
    : (companiesList.find(c => c.id === myCompanyId) ?? companiesList[0]);

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
    window.dispatchEvent(new Event("phidtech_companies_updated"));
  };

  const switchToGroupHQ = () => {
    setActiveCompanyIdState("");
    try { localStorage.removeItem(ACTIVE_KEY); } catch {}
    window.dispatchEvent(new Event("phidtech_companies_updated"));
  };

  const unread = notifList.filter(n => !n.read).length;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shrink-0 z-40 relative">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuOpen}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {/* Company Switcher — superadmin only */}
        <div className="relative">
          {isSuperAdmin ? (
            <>
              <button
                onClick={() => { setShowCompanySwitcher(!showCompanySwitcher); setShowNotifications(false); setShowProfile(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 border text-sm ${!activeCompanyId ? "border-indigo-200 bg-indigo-50" : "border-gray-100"}`}
              >
                {!activeCompanyId
                  ? <span className="text-sm leading-none">👑</span>
                  : <Building2 className="w-4 h-4 text-blue-600" />
                }
                <span className={`font-medium hidden sm:block ${!activeCompanyId ? "text-indigo-700" : "text-gray-700"}`}>
                  {activeCompany?.name ?? (!activeCompanyId ? "Group HQ" : "Select Company")}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showCompanySwitcher && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Switch Company</p>
                  {/* Group HQ option */}
                  <button
                    onClick={() => { switchToGroupHQ(); setShowCompanySwitcher(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2 hover:bg-indigo-50 text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center text-xs">
                      👑
                    </div>
                    <div>
                      <p className="text-sm font-medium text-indigo-800">PHIDTECH GROUP HQ</p>
                      <p className="text-xs text-indigo-400">All subsidiaries overview</p>
                    </div>
                    {!activeCompanyId && (
                      <span className="ml-auto text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">Active</span>
                    )}
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  {companiesList.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setActiveCompanyId(c.id); setShowCompanySwitcher(false); }}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.industry}</p>
                      </div>
                      {c.id === activeCompanyId && (
                        <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 text-sm bg-gray-50">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-700 hidden sm:block">{activeCompany?.name ?? ""}</span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 w-64 border border-gray-100">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            placeholder="Search anything..."
            className="bg-transparent text-sm outline-none w-full text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowCompanySwitcher(false); }}
            className="relative p-2 hover:bg-gray-100 rounded-lg"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unread > 0 && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">{unread} new</span>}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifList.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-gray-400">No notifications yet</div>
                ) : notifList.slice(0, 6).map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!notif.read ? "bg-blue-50/30" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.read ? "bg-blue-500" : "bg-gray-300"}`} />
                      <div>
                        <p className="text-sm text-gray-700 line-clamp-2">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(notif.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 px-4 py-2">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-sm text-blue-600 font-medium hover:text-blue-700"
                >
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowCompanySwitcher(false); }}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {profilePhoto
                ? <img src={profilePhoto} alt="profile" className="w-full h-full object-cover" />
                : getInitials(profileName)
              }
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-800 leading-none">{profileName}</p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{profileRole}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
          </button>

          {showProfile && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
              <Link href="/profile" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">
                <User className="w-4 h-4" /> My Profile
              </Link>
              <Link href="/admin" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <Link href="/login" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-red-600">
                  <LogOut className="w-4 h-4" /> Sign Out
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
