"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="relative flex min-h-screen min-w-0 items-center justify-center overflow-hidden bg-gradient-to-br from-muted/30 via-background to-muted/20 p-4">
        <div className="relative w-full max-w-sm">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-block"><Logo /></Link>
          </div>
          <div className="glass-light rounded-2xl p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <h1 className="mt-4 text-xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account with that email exists, we&apos;ve sent a password reset link. It expires in 15 minutes.
            </p>
            <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80">
              <ArrowLeft className="size-4" /> Back to sign in
            </Link>
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
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Forgot password?</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        <div className="glass-light rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive shadow-sm">{error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-border/70 bg-white/70 px-4 text-sm shadow-sm"
              />
            </div>

            <Button type="submit" className="squishy h-11 w-full rounded-xl text-sm font-bold" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
