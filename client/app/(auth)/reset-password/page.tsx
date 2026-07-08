"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [missingToken, setMissingToken] = useState(false);

  useEffect(() => {
    if (!token) {
      setMissingToken(true);
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword(token!, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Invalid or expired reset link");
    } finally {
      setLoading(false);
    }
  }

  if (missingToken) {
    return (
      <div className="relative flex min-h-screen min-w-0 items-center justify-center overflow-hidden bg-gradient-to-br from-muted/30 via-background to-muted/20 p-4">
        <div className="relative w-full max-w-sm">
          <div className="glass-light rounded-2xl p-8 text-center">
            <AlertTriangle className="mx-auto size-12 text-amber-500" />
            <h1 className="mt-4 text-xl font-bold">Invalid reset link</h1>
            <p className="mt-2 text-sm text-muted-foreground">This link is missing a reset token. Please request a new password reset.</p>
            <Link href="/forgot-password" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80">
              Request new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen min-w-0 items-center justify-center overflow-hidden bg-gradient-to-br from-muted/30 via-background to-muted/20 p-4">
        <div className="relative w-full max-w-sm">
          <div className="glass-light rounded-2xl p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <h1 className="mt-4 text-xl font-bold">Password reset!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your password has been updated. Sign in with your new password.</p>
            <Button onClick={() => router.push("/login")} className="mt-6 h-11 w-full rounded-xl text-sm font-bold">
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen min-w-0 items-center justify-center overflow-hidden bg-gradient-to-br from-muted/30 via-background to-muted/20 p-4">
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-amber-500/5 blur-3xl" aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block"><Logo /></Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Set new password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter your new password below.</p>
        </div>

        <div className="glass-light rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive shadow-sm">{error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-foreground/70">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11 w-full rounded-xl border-border/70 bg-white/70 px-4 pr-11 text-sm shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11 w-full rounded-xl border-border/70 bg-white/70 px-4 text-sm shadow-sm"
              />
            </div>

            <Button type="submit" className="squishy h-11 w-full rounded-xl text-sm font-bold" disabled={loading}>
              {loading ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
