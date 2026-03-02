"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Lock, Mail, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ADMIN_EMAIL = "phidtechnology@gmail.com";
const ADMIN_PASSWORD = "Kaijage@@2023";
const USERS_KEY = "phidtech_users";
const SESSION_KEY = "phidtech_session";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotResult, setForgotResult] = useState<{ name: string; password: string; hint?: string } | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotResult(null);
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      setForgotError("Please enter a valid email address.");
      return;
    }
    // Check superadmin
    if (forgotEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setForgotResult({ name: "System Administrator", password: ADMIN_PASSWORD });
      return;
    }
    // Check staff users
    try {
      const stored = localStorage.getItem(USERS_KEY);
      if (stored) {
        const users = JSON.parse(stored);
        const match = users.find(
          (u: { email: string; name: string; password: string }) =>
            u.email.toLowerCase() === forgotEmail.toLowerCase()
        );
        if (match) {
          setForgotResult({ name: match.name, password: match.password });
          return;
        }
      }
    } catch {}
    setForgotError("No account found with that email address.");
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

    // Check superadmin first
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 700));
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        id: "superadmin", name: "System Administrator",
        email: ADMIN_EMAIL, role: "admin", position: "admin",
        companyId: null, isSuperAdmin: true,
      }));
      router.push("/dashboard");
      return;
    }

    // Check staff users in localStorage
    try {
      const stored = localStorage.getItem(USERS_KEY);
      if (stored) {
        const users = JSON.parse(stored);
        const match = users.find(
          (u: { email: string; password: string }) =>
            u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        if (match) {
          setLoading(true);
          await new Promise((r) => setTimeout(r, 700));
          // Set active company to this staff's company
          localStorage.setItem("phidtech_active_company", match.companyId);
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            id: match.id, name: match.name, email: match.email,
            role: match.role, position: match.position,
            permissions: match.permissions ?? [],
            companyId: match.companyId, isSuperAdmin: false,
          }));
          router.push("/dashboard");
          return;
        }
      }
    } catch {}

    setError("Invalid email or password. Please try again.");
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
                  onClick={() => { setForgotMode(false); setForgotEmail(""); setForgotError(""); setForgotResult(null); setShowForgotPassword(false); }}
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
                    <p className="text-gray-500 text-sm">Enter your email to retrieve your password</p>
                  </div>
                </div>
              </div>

              {/* Result panel */}
              {forgotResult ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      <p className="text-sm font-semibold text-green-800">Account found — {forgotResult.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700 mb-1.5 font-medium">Your password:</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2 font-mono text-sm text-gray-800 tracking-widest">
                          {showForgotPassword ? forgotResult.password : "•".repeat(forgotResult.password.length)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(v => !v)}
                          className="p-2 rounded-lg bg-white border border-green-200 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full h-11 text-sm font-semibold"
                    onClick={() => {
                      setEmail(forgotEmail);
                      setPassword(forgotResult.password);
                      setForgotMode(false);
                      setForgotResult(null);
                      setShowForgotPassword(false);
                    }}
                  >
                    Sign In with This Password
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        value={forgotEmail}
                        onChange={e => { setForgotEmail(e.target.value); setForgotError(""); }}
                        className="pl-10"
                        placeholder="you@company.co.tz"
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 text-sm font-semibold">
                    Retrieve Password
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
                    onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotError(""); setForgotResult(null); }}
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
