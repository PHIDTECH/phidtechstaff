"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Lock, Mail, ArrowLeft, KeyRound, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const ADMIN_EMAIL      = "phidtechnology@gmail.com";
const SESSION_KEY      = "phidtech_session";
const RESET_TOKENS_KEY = "phidtech_reset_tokens";

const APP_URL = typeof window !== "undefined"
  ? window.location.origin
  : "https://www.phidtechstaff.co.tz";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

interface ResetToken { token: string; email: string; expiresAt: number; used: boolean; }

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Forgot password state
  const [forgotMode, setForgotMode]     = useState(false);
  const [forgotEmail, setForgotEmail]   = useState("");
  const [forgotError, setForgotError]   = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent]     = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      setForgotError("Please enter a valid email address.");
      return;
    }
    // Only superadmin can use forgot password
    if (forgotEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setForgotError("Only the system administrator can reset their password here. Staff passwords are reset by the administrator in the Users section.");
      return;
    }

    setForgotSending(true);
    try {
      // Generate a secure token valid for 1 hour
      const token = `rst_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
      const tokens = lsGet<ResetToken[]>(RESET_TOKENS_KEY, []);
      // Invalidate old unused tokens for this email
      const cleaned = tokens.filter(t => t.email !== ADMIN_EMAIL || t.used);
      lsSet(RESET_TOKENS_KEY, [...cleaned, { token, email: ADMIN_EMAIL, expiresAt, used: false }]);

      const resetLink = `${APP_URL}/reset-password?token=${token}`;

      const res = await fetch("/api/send-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email:   ADMIN_EMAIL,
          to_name:    "System Administrator",
          reset_link: resetLink,
          expires_in: "1 hour",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send email");
      }

      setForgotSent(true);
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : "Failed to send reset email. Please try again.");
    } finally {
      setForgotSending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Invalid email or password. Please try again.");
        return;
      }

      const session = data.session;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      // For staff: set their active company; for superadmin: clear (Group HQ mode)
      if (!session.isSuperAdmin && session.companyId) {
        localStorage.setItem("phidtech_active_company", session.companyId);
      } else {
        localStorage.removeItem("phidtech_active_company");
      }

      router.push("/dashboard");
    } catch {
      setError("Connection error. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-2xl mb-4 ring-4 ring-blue-600/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">PHIDTECH MS</h1>
          <p className="text-blue-300 text-sm mt-1.5">Management System</p>
          <p className="text-blue-400/60 text-xs mt-0.5">by Phid Technologies</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* ── FORGOT PASSWORD MODE ── */}
          {forgotMode ? (
            <>
              <div className="mb-6">
                <button
                  onClick={() => { setForgotMode(false); setForgotEmail(""); setForgotError(""); setForgotSent(false); }}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Forgot Password?</h2>
                    <p className="text-gray-500 text-sm">Superadmin only — a reset link will be sent to your Gmail</p>
                  </div>
                </div>
              </div>

              {/* Sent confirmation */}
              {forgotSent ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col items-center gap-3 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-800">Reset link sent!</p>
                      <p className="text-sm text-green-700 mt-1">Check your Gmail inbox at <strong>{ADMIN_EMAIL}</strong>.<br />The link expires in <strong>1 hour</strong>.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => { setForgotMode(false); setForgotEmail(""); setForgotSent(false); }}>
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  {forgotError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-white text-[10px] font-bold">!</span>
                      </div>
                      <p className="text-sm text-red-700">{forgotError}</p>
                    </div>
                  )}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">Password reset is only available for the <strong>System Administrator</strong> account. Staff passwords are managed by the administrator in the Users section.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Administrator Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        value={forgotEmail}
                        onChange={e => { setForgotEmail(e.target.value); setForgotError(""); }}
                        className="pl-10"
                        placeholder={ADMIN_EMAIL}
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={forgotSending}>
                    {forgotSending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending reset link...
                      </div>
                    ) : "Send Reset Link to Gmail"}
                  </Button>
                </form>
              )}
            </>
          ) : (

          /* ── LOGIN MODE ── */
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-bold">!</span>
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="pl-10"
                    placeholder="you@company.co.tz"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotError(""); setForgotSent(false); }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="pl-10 pr-10"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input type="checkbox" className="rounded" defaultChecked />
                Keep me signed in
              </label>

              <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : "Sign In"}
              </Button>
            </form>
          </>
          )}
        </div>

        <p className="text-center text-blue-400/60 text-xs mt-6">
          © 2026 Phid Technologies Ltd · All rights reserved
        </p>
      </div>
    </div>
  );
}
