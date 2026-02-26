"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Lock, Mail, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO_ACCOUNTS = [
  { label: "System Admin", email: "admin@phidtech.co.tz", password: "admin123", company: "Phid Technologies Ltd", role: "Admin" },
  { label: "Engineering Manager", email: "grace.k@phidtech.co.tz", password: "admin123", company: "Phid Technologies Ltd", role: "Manager" },
  { label: "Sales Manager", email: "amina.h@phidtech.co.tz", password: "admin123", company: "Phid Technologies Ltd", role: "Manager" },
  { label: "Staff Member", email: "samuel.b@phidtech.co.tz", password: "admin123", company: "Phid Technologies Ltd", role: "Staff" },
];

const VALID_CREDS = [
  "admin@phidtech.co.tz",
  "grace.k@phidtech.co.tz",
  "amina.h@phidtech.co.tz",
  "samuel.b@phidtech.co.tz",
  "peter.n@phidtech.co.tz",
  "fatuma.s@phidtech.co.tz",
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("admin@phidtech.co.tz");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDemoList, setShowDemoList] = useState(false);

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
    if (!VALID_CREDS.includes(email) || password !== "admin123") {
      setError("Invalid credentials. Use one of the demo accounts below.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    router.push("/dashboard");
  };

  const fillDemo = (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
    setShowDemoList(false);
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
          <h1 className="text-3xl font-bold text-white tracking-tight">BOMS</h1>
          <p className="text-blue-300 text-sm mt-1.5">Business Operations Management System</p>
          <p className="text-blue-400/60 text-xs mt-0.5">by Phid Technologies</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          {/* Error Banner */}
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
                <a href="#" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Forgot password?</a>
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
              ) : "Sign In to BOMS"}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowDemoList(!showDemoList)}
              className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <p className="text-xs font-semibold text-blue-700">Demo Accounts — click to auto-fill</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-blue-500 transition-transform ${showDemoList ? "rotate-180" : ""}`} />
            </button>
            {showDemoList && (
              <div className="mt-2 space-y-1.5">
                {DEMO_ACCOUNTS.map(account => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-blue-200 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{account.label}</p>
                      <p className="text-xs text-gray-400">{account.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      account.role === "Admin" ? "bg-red-100 text-red-700" :
                      account.role === "Manager" ? "bg-purple-100 text-purple-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {account.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-blue-400/60 text-xs mt-6">
          © 2026 Phid Technologies Ltd · All rights reserved
        </p>
      </div>
    </div>
  );
}
