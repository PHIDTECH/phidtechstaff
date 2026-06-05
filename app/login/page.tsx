"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Lock, Phone, Mail, ArrowLeft, KeyRound, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const SESSION_KEY = "phidtech_session";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // OTP reset state — step: 0=login, 1=enter phone, 2=enter OTP+newpw, 3=done
  const [otpStep, setOtpStep]         = useState(0);
  const [otpPhone, setOtpPhone]       = useState("");
  const [otpCode, setOtpCode]         = useState("");
  const [otpNewPw, setOtpNewPw]       = useState("");
  const [otpError, setOtpError]       = useState("");
  const [otpLoading, setOtpLoading]   = useState(false);
  const [otpName, setOtpName]         = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (!otpPhone.trim()) { setOtpError("Enter your registered phone number."); return; }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp-reset?action=request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Failed to send OTP."); return; }
      setOtpName(data.name ?? "");
      setOtpStep(2);
    } catch { setOtpError("Connection error. Try again."); }
    finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (!otpCode.trim()) { setOtpError("Enter the OTP sent to your phone."); return; }
    if (otpNewPw.length < 6) { setOtpError("Password must be at least 6 characters."); return; }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp-reset?action=verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone.trim(), otp: otpCode.trim(), newPassword: otpNewPw }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Verification failed."); return; }
      setOtpStep(3);
    } catch { setOtpError("Connection error. Try again."); }
    finally { setOtpLoading(false); }
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

      // SuperAdmin and Group HQ staff → clear (Group HQ mode); regular staff → set their company
      const isGroupMember = session.isSuperAdmin || session.companyId === "group";
      if (!isGroupMember && session.companyId) {
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

          {/* ── OTP RESET STEP 1: enter phone ── */}
          {otpStep === 1 ? (
            <>
              <button onClick={() => { setOtpStep(0); setOtpError(""); }} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-5">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </button>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
                  <p className="text-gray-500 text-sm">Enter your registered phone — we&apos;ll SMS you a code</p>
                </div>
              </div>
              {otpError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{otpError}</div>}
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="tel" value={otpPhone} onChange={e => { setOtpPhone(e.target.value); setOtpError(""); }} className="pl-10" placeholder="e.g. 0712 345 678" autoFocus />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={otpLoading}>
                  {otpLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Sending OTP...</> : "Send OTP via SMS"}
                </Button>
              </form>
            </>

          ) : otpStep === 2 ? (
            <>
              <button onClick={() => { setOtpStep(1); setOtpError(""); }} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-5">
                <ArrowLeft className="w-4 h-4" /> Change phone
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Enter OTP</h2>
                  <p className="text-gray-500 text-sm">OTP sent to <strong>{otpPhone}</strong>{otpName ? ` (${otpName})` : ""}</p>
                </div>
              </div>
              {otpError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{otpError}</div>}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">6-Digit OTP</label>
                  <Input value={otpCode} onChange={e => { setOtpCode(e.target.value.replace(/\D/g,"")); setOtpError(""); }} maxLength={6} placeholder="e.g. 123456" className="text-center text-xl tracking-widest font-mono" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="password" value={otpNewPw} onChange={e => { setOtpNewPw(e.target.value); setOtpError(""); }} className="pl-10" placeholder="Min. 6 characters" autoComplete="new-password" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={otpLoading}>
                  {otpLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Verifying...</> : "Confirm & Change Password"}
                </Button>
              </form>
            </>

          ) : otpStep === 3 ? (
            <div className="space-y-4">
              <div className="p-5 bg-green-50 border border-green-200 rounded-xl flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <div>
                  <p className="font-semibold text-green-800 text-lg">Password Changed!</p>
                  <p className="text-sm text-green-700 mt-1">You can now sign in with your new password.</p>
                </div>
              </div>
              <Button className="w-full h-11" onClick={() => { setOtpStep(0); setOtpPhone(""); setOtpCode(""); setOtpNewPw(""); setOtpError(""); }}>
                Back to Sign In
              </Button>
            </div>

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
                    onClick={() => { setOtpStep(1); setOtpPhone(""); setOtpError(""); }}
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
