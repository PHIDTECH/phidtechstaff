"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Eye, EyeOff, Lock, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ADMIN_EMAIL    = "phidtechnology@gmail.com";
const RESET_TOKENS_KEY = "phidtech_reset_tokens";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

interface ResetToken { token: string; email: string; expiresAt: number; used: boolean; }

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get("token") ?? "";

  const [status, setStatus]               = useState<"validating" | "valid" | "invalid" | "expired" | "done">("validating");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [error, setError]                 = useState("");
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const tokens = lsGet<ResetToken[]>(RESET_TOKENS_KEY, []);
    const found  = tokens.find(t => t.token === token);
    if (!found)                           { setStatus("invalid"); return; }
    if (found.used)                       { setStatus("invalid"); return; }
    if (Date.now() > found.expiresAt)     { setStatus("expired"); return; }
    setStatus("valid");
  }, [token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match."); return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));

    // Update the superadmin password constant is not possible at runtime, so we store it in localStorage as an override
    const tokens = lsGet<ResetToken[]>(RESET_TOKENS_KEY, []);
    const found  = tokens.find(t => t.token === token);
    if (!found || found.email !== ADMIN_EMAIL) { setError("Invalid token."); setSaving(false); return; }

    // Mark token used
    lsSet(RESET_TOKENS_KEY, tokens.map(t => t.token === token ? { ...t, used: true } : t));
    // Store overridden admin password
    lsSet("phidtech_admin_password_override", newPassword);

    setStatus("done");
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-2xl mb-4 ring-4 ring-blue-600/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">PHIDTECH MS</h1>
          <p className="text-blue-300 text-sm mt-1.5">Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {status === "validating" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Validating reset link...</p>
            </div>
          )}

          {status === "invalid" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Invalid Reset Link</h2>
                <p className="text-sm text-gray-500 mt-1">This link is invalid or has already been used.</p>
              </div>
              <Button className="w-full" onClick={() => router.push("/login")}>Back to Sign In</Button>
            </div>
          )}

          {status === "expired" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Link Expired</h2>
                <p className="text-sm text-gray-500 mt-1">This reset link has expired. Please request a new one.</p>
              </div>
              <Button className="w-full" onClick={() => router.push("/login")}>Back to Sign In</Button>
            </div>
          )}

          {status === "done" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Password Reset!</h2>
                <p className="text-sm text-gray-500 mt-1">Your password has been updated successfully. You can now sign in.</p>
              </div>
              <Button className="w-full" onClick={() => router.push("/login")}>Go to Sign In</Button>
            </div>
          )}

          {status === "valid" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
                  <p className="text-gray-500 text-sm">Enter your new administrator password</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-[10px] font-bold">!</span>
                  </div>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(""); }}
                      className="pl-10 pr-10"
                      placeholder="Min. 6 characters"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
                      className="pl-10 pr-10"
                      placeholder="Repeat new password"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={saving}>
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : "Set New Password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}
