"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { cn } from "@/lib/utils";
import { CompanyProvider } from "@/lib/CompanyContext";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT   = 10 * 60 * 1000; // 10 minutes
const WARN_BEFORE    = 60 * 1000;       // warn 1 minute before logout

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen]             = useState(false);
  const [showWarning, setShowWarning]           = useState(false);
  const [countdown, setCountdown]               = useState(60);
  const idleTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const router      = useRouter();

  const doLogout = useCallback(() => {
    localStorage.removeItem("phidtech_session");
    router.replace("/login");
  }, [router]);

  const resetTimers = useCallback(() => {
    if (showWarning) return; // don't reset if warning is already showing
    if (idleTimer.current)  clearTimeout(idleTimer.current);
    if (warnTimer.current)  clearTimeout(warnTimer.current);
    if (countRef.current)   clearInterval(countRef.current);
    setShowWarning(false);

    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);
      countRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(countRef.current!); doLogout(); return 0; }
          return c - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT - WARN_BEFORE);

    idleTimer.current = setTimeout(doLogout, IDLE_TIMEOUT);
  }, [doLogout, showWarning]);

  const stayLoggedIn = () => {
    if (idleTimer.current)  clearTimeout(idleTimer.current);
    if (warnTimer.current)  clearTimeout(warnTimer.current);
    if (countRef.current)   clearInterval(countRef.current);
    setShowWarning(false);
    setCountdown(60);
    // restart fresh
    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);
      countRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(countRef.current!); doLogout(); return 0; }
          return c - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT - WARN_BEFORE);
    idleTimer.current = setTimeout(doLogout, IDLE_TIMEOUT);
  };

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    const handler = () => resetTimers();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimers();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (idleTimer.current)  clearTimeout(idleTimer.current);
      if (warnTimer.current)  clearTimeout(warnTimer.current);
      if (countRef.current)   clearInterval(countRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CompanyProvider>
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 flex">
            <Sidebar
              collapsed={false}
              onToggle={() => {}}
              mobile
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Inactivity warning dialog */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Session Expiring Soon</h2>
            <p className="text-sm text-gray-500 mb-1">You have been inactive for a while.</p>
            <p className="text-sm text-gray-500 mb-6">
              You will be logged out in <span className="font-bold text-red-500 text-base">{countdown}s</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={doLogout}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
              >
                Logout Now
              </button>
              <button
                onClick={stayLoggedIn}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </CompanyProvider>
  );
}
