"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Receipt, Loader2, AlertCircle, IndianRupee, Download, ArrowUpDown, XCircle, Calendar, Building2, ExternalLink, Sparkles, Zap, Plus, Settings2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";
import { cn } from "@/lib/utils";
import { SubscribeConfirmDialog } from "@/components/billing/subscribe-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Plan = {
  id: string;
  name: string;
  slug: string;
  price: number;
  interval: string;
  creditsLimit: number;
  businessLimit: number;
  features: string[];
  description: string;
  sortOrder: number;
};

type Balance = {
  creditsUsed: number;
  creditsLimit: number;
  creditsTopUpBalance: number;
  monthlyRemaining: number;
  totalRemaining: number;
  autoRechargeEnabled: boolean;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
};

type CreditPack = {
  credits: number;
  amount: number;
  label: string;
};

export default function BillingPageWrapper() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingPage />
    </Suspense>
  );
}

function BillingSkeleton() {
  return (
    <>
      <PageHeader title="Billing" description="Manage your plan, credits, and payment details." />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </>
  );
}

function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const { businesses, refreshBusinesses } = useBusiness();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [buyingCredits, setBuyingCredits] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [changePlanResult, setChangePlanResult] = useState<{ message: string; upgrade: boolean; immediate: boolean; scheduledDate?: string } | null>(null);
  const [selectedMonthlyPlan, setSelectedMonthlyPlan] = useState<Plan | null>(null);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [topUpCredits, setTopUpCredits] = useState(100);
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [autoRechargeThreshold, setAutoRechargeThreshold] = useState(20);
  const [autoRechargeAmount, setAutoRechargeAmount] = useState(100);
  const [savingAutoRecharge, setSavingAutoRecharge] = useState(false);

  const success = searchParams.get("success");
  const paymentId = searchParams.get("payment_id");
  const errorType = searchParams.get("error");
  const topup = searchParams.get("topup");
  const topupCreditsStr = searchParams.get("credits");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, subRes, balanceRes, packsRes] = await Promise.all([
        api.payments.plans(),
        api.payments.subscription(),
        api.payments.creditBalance(),
        api.payments.creditPacks(),
      ]);
      setPlans(plansRes.plans);
      setSubscription(subRes.subscription);
      if (balanceRes.balance) {
        setBalance(balanceRes.balance);
        setAutoRechargeEnabled(balanceRes.balance.autoRechargeEnabled);
        setAutoRechargeThreshold(balanceRes.balance.autoRechargeThreshold);
        setAutoRechargeAmount(balanceRes.balance.autoRechargeAmount);
      }
      setCreditPacks(packsRes.packs);
    } catch (err: any) {
      setError(err.message || "Failed to load plan info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user && !authLoading) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || authLoading) return;
    loadData();
    if (paymentId) {
      const timer = setTimeout(() => loadData(), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, paymentId, loadData]);

  useEffect(() => {
    if (topup === "success" && topupCreditsStr) {
      setSuccessMsg(`${topupCreditsStr} credits added to your account!`);
      loadData();
    }
    if (topup === "error") {
      setError("Top-up payment could not be completed. Please try again.");
    }
  }, [topup, topupCreditsStr, loadData]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 8000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const yearlyPlanPairs = useMemo(() => {
    const pairs: Record<string, { monthly: Plan; yearly: Plan | null }> = {};
    for (const plan of plans) {
      if (plan.interval === "year") {
        const baseSlug = plan.slug.replace("-yearly", "");
        if (!pairs[baseSlug]) pairs[baseSlug] = { monthly: null as any, yearly: null };
        pairs[baseSlug].yearly = plan;
      }
    }
    for (const plan of plans) {
      if (plan.interval === "month") {
        const baseSlug = plan.slug;
        if (!pairs[baseSlug]) pairs[baseSlug] = { monthly: plan, yearly: null };
        else pairs[baseSlug].monthly = plan;
      }
    }
    return pairs;
  }, [plans]);

  const displayPlans = useMemo(() => {
    return plans.filter((p) => p.price > 0 && p.interval === "month");
  }, [plans]);

  const computeUsage = useCallback(() => {
    if (!balance) return { monthlyPct: 0, monthlyUsed: 0, monthlyLimit: 0, topUpBalance: 0, totalRemaining: 0 };
    const monthlyUsed = balance.creditsUsed ?? 0;
    const monthlyLimit = balance.creditsLimit ?? 0;
    const topUpBalance = balance.creditsTopUpBalance ?? 0;
    const monthlyPct = monthlyLimit > 0 ? Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100)) : 0;
    const totalRemaining = balance.totalRemaining ?? 0;
    return { monthlyPct, monthlyUsed, monthlyLimit, topUpBalance, totalRemaining };
  }, [balance]);

  function formatPrice(paise: number) {
    if (paise === 0) return "Free";
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  }

  async function handleBuyCredits(credits: number) {
    setBuyingCredits(true);
    setError("");
    try {
      const res = await api.payments.createTopUp(credits);
      if (res.shortUrl) {
        window.open(res.shortUrl, "_blank");
        setTopUpDialogOpen(false);
        setSuccessMsg(`Payment link opened for ${credits} credits. Complete payment in the new tab.`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create top-up");
    } finally {
      setBuyingCredits(false);
    }
  }

  async function handleSaveAutoRecharge() {
    setSavingAutoRecharge(true);
    try {
      const res = await api.payments.autoRecharge({
        enabled: autoRechargeEnabled,
        threshold: autoRechargeThreshold,
        amount: autoRechargeAmount,
      });
      setAutoRechargeEnabled(res.autoRechargeEnabled);
      setAutoRechargeThreshold(res.autoRechargeThreshold);
      setAutoRechargeAmount(res.autoRechargeAmount);
      setSuccessMsg(autoRechargeEnabled ? "Auto-recharge enabled" : "Auto-recharge disabled");
    } catch (err: any) {
      setError(err.message || "Failed to save auto-recharge settings");
    } finally {
      setSavingAutoRecharge(false);
    }
  }

  async function handleSubscribeClick(planId: string) {
    const monthly = plans.find((p) => p.id === planId && p.interval === "month");
    if (monthly) {
      setSelectedMonthlyPlan(monthly);
      setConfirmOpen(true);
    }
  }

  async function handleConfirmSubscribe(planId: string) {
    setSubscribing(true);
    setError("");
    try {
      const res = await api.payments.createSubscription(planId);
      setConfirmOpen(false);

      if (res.subscription.status === "active") {
        await loadData();
        await refreshBusinesses();
        setSuccessMsg("Plan activated!");
        return;
      }

      if (!res.razorpaySubscriptionId || !res.keyId) {
        throw new Error("Payment gateway not properly configured");
      }

      const planName = res.subscription?.plan?.name || "Selected";

      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: res.keyId,
        subscription_id: res.razorpaySubscriptionId,
        name: "BEYONDVYU",
        description: `${planName} Plan`,
        handler: function (response: any) {
          window.location.href =
            `/payment/success` +
            `?payment_id=${response.razorpay_payment_id}` +
            `&subscription_id=${response.razorpay_subscription_id}` +
            `&signature=${response.razorpay_signature}`;
        },
        prefill: { email: user?.email || "", contact: "" },
        theme: { color: "#0f172a" },
        modal: {
          ondismiss: function () {
            api.payments.cancelPending().catch(() => {});
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        throw new Error(response.error?.description || "Payment failed");
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Failed to start subscription");
    } finally {
      setSubscribing(false);
    }
  }

  async function handleCancel() {
    const label = subscription?.cancelledAt
      ? "Cancel scheduled cancellation?"
      : "Cancel subscription? You'll keep access until the end of your billing period.";
    if (!confirm(label)) return;
    setCancelling(true);
    setError("");
    try {
      const res = await api.payments.cancel();
      setSuccessMsg(res.message || "Subscription cancelled");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  }

  async function handleChangePlan(planId: string) {
    setChangingPlan(true);
    setError("");
    try {
      const res = await api.payments.updateSubscription(planId);
      setChangePlanResult({
        message: res.message,
        upgrade: res.upgrade,
        immediate: res.immediate,
        scheduledDate: res.scheduledDate,
      });
      await loadData();
      await refreshBusinesses();
    } catch (err: any) {
      setError(err.message || "Failed to change plan");
    } finally {
      setChangingPlan(false);
    }
  }

  if (!user && !authLoading) return null;

  if (authLoading || loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const { monthlyPct, monthlyUsed, monthlyLimit, topUpBalance, totalRemaining } = computeUsage();
  const isFreePlan = subscription?.plan?.slug === "free";
  const exhausted = monthlyLimit > 0 && monthlyUsed >= monthlyLimit && topUpBalance <= 0;
  const warning = monthlyPct >= 80 && !exhausted && topUpBalance <= 0;

  const pair = selectedMonthlyPlan
    ? yearlyPlanPairs[selectedMonthlyPlan.slug]
    : null;

  return (
    <>
      <PageHeader title="Billing" description="Manage your plan, credits, and payment details." />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {success === "true" && paymentId && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="flex items-center gap-2 font-medium">
              <Check className="size-4" />
              Payment successful! Your subscription is being activated.
            </p>
            <p className="mt-1 text-green-600">It may take a few minutes to reflect.</p>
            <a
              href={`/api/payments/receipt/${paymentId}`}
              target="_blank"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-green-700 underline hover:text-green-800"
            >
              <Download className="size-3.5" />
              Download Receipt
            </a>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="flex items-center gap-2 font-medium">
              <Check className="size-4" />
              {successMsg}
            </p>
          </div>
        )}

        {changePlanResult && (
          <div className={`rounded-xl border p-4 text-sm ${changePlanResult.upgrade ? "border-green-200 bg-green-50 text-green-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
            <p className="flex items-center gap-2 font-medium">
              {changePlanResult.upgrade ? <ArrowUpDown className="size-4" /> : <Calendar className="size-4" />}
              {changePlanResult.message}
            </p>
            {!changePlanResult.immediate && changePlanResult.scheduledDate && (
              <p className="mt-1 opacity-80">
                Scheduled for {new Date(changePlanResult.scheduledDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
            <button onClick={() => setChangePlanResult(null)} className="mt-1 text-xs underline opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {success === "false" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="flex items-center gap-2 font-medium">
              <AlertCircle className="size-4" />
              {errorType === "invalid_signature" ? "Payment verification failed. Please contact support." :
               errorType === "gateway_not_configured" ? "Payment gateway is not configured properly." :
               errorType === "missing_params" ? "Invalid payment response from gateway." :
               "Payment could not be completed. Please try again."}
            </p>
          </div>
        )}

        {error && !success && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="flex items-center gap-2 font-medium">
              <AlertCircle className="size-4" />
              {error}
            </p>
          </div>
        )}

        {/* ── CREDIT USAGE CARD ── */}
        {balance && (
          <Card className={cn(exhausted && "border-red-500/40", warning && "border-amber-500/40")}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Credit Usage
                </span>
                <Badge variant={exhausted ? "destructive" : warning ? "secondary" : "default"}>
                  {exhausted ? "Exhausted" : `${totalRemaining} left`}
                </Badge>
              </CardTitle>
              <CardDescription>
                {subscription?.plan?.name || "Free"} plan &middot; {monthlyLimit} monthly credits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Monthly credits bar */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly credits</span>
                  <span className="font-medium tabular-nums">{monthlyUsed} / {monthlyLimit}</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      exhausted ? "bg-red-500" : warning ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${monthlyPct}%` }}
                  />
                </div>
              </div>

              {/* Top-up balance */}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="size-3.5 text-green-600" />
                  Top-up balance
                </span>
                <span className={cn("font-medium tabular-nums", topUpBalance > 0 ? "text-green-600" : "text-muted-foreground")}>
                  {topUpBalance > 0 ? `${topUpBalance} credits` : "None"}
                </span>
              </div>

              {/* Total remaining */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                <span className="font-medium">Total available</span>
                <span className={cn("font-bold text-lg tabular-nums", totalRemaining <= 0 ? "text-red-500" : "text-foreground")}>
                  {totalRemaining}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button className="w-full gap-2" onClick={() => setTopUpDialogOpen(true)}>
                <Plus className="size-4" />
                Buy Credits
              </Button>
              {!isFreePlan && subscription?.plan?.slug !== "free" && (
                <div className="flex w-full gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setChangePlanOpen(true)}>
                    <ArrowUpDown className="size-3.5" />
                    Change Plan
                  </Button>
                  {subscription.invoices?.length > 0 && subscription.invoices[0]?.razorpayPaymentId && (
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5"
                      onClick={() => window.open(`/api/payments/receipt/${subscription.invoices[0].razorpayPaymentId}`, "_blank")}>
                      <Receipt className="size-3.5" />
                      Receipt
                    </Button>
                  )}
                </div>
              )}
            </CardFooter>
          </Card>
        )}

        {/* ── AUTO-RECHARGE ── */}
        {balance && !isFreePlan && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="size-4 text-primary" />
                Auto-Recharge
              </CardTitle>
              <CardDescription>Automatically buy credits when your balance runs low</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Enable auto-recharge</p>
                  <p className="text-xs text-muted-foreground">Buy credits automatically when you run low</p>
                </div>
                <Switch
                  checked={autoRechargeEnabled}
                  onCheckedChange={setAutoRechargeEnabled}
                />
              </div>

              {autoRechargeEnabled && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Trigger when credits remaining ≤</span>
                      <span className="font-medium">{autoRechargeThreshold}</span>
                    </div>
                    <div className="flex gap-2">
                      {[10, 20, 30, 50, 100].map((val) => (
                        <button
                          key={val}
                          onClick={() => setAutoRechargeThreshold(val)}
                          className={cn(
                            "flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            autoRechargeThreshold === val
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Buy amount</span>
                      <span className="font-medium">{autoRechargeAmount} credits (₹{formatPrice(autoRechargeAmount * 99)})</span>
                    </div>
                    <div className="flex gap-2">
                      {[50, 100, 250, 500].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setAutoRechargeAmount(amt)}
                          className={cn(
                            "flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            autoRechargeAmount === amt
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSaveAutoRecharge}
                    disabled={savingAutoRecharge}
                    className="w-full"
                  >
                    {savingAutoRecharge ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save Auto-Recharge
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── SUBSCRIPTION DETAILS ── */}
        {subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Subscription
                <Badge variant={
                  subscription.cancelledAt && subscription.status === "active" ? "secondary" :
                  subscription.status === "active" ? "default" : "secondary"
                }>
                  {subscription.cancelledAt && subscription.status === "active" ? "Cancelling" : subscription.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {subscription.plan.name} &middot; {formatPrice(subscription.plan.price)}/{subscription.plan.interval}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="size-3.5" />
                    Businesses
                  </span>
                  <span className="font-medium">{businesses.length} / {subscription.businessLimit}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      businesses.length >= subscription.businessLimit ? "bg-red-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, Math.round((businesses.length / subscription.businessLimit) * 100))}%` }}
                  />
                </div>
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{subscription.cancelledAt ? "Access until" : "Current period ends"}</span>
                    <span className="font-medium">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                )}
                {subscription.pendingPlanId && subscription.pendingPlan && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Calendar className="size-4" />
                      Scheduled plan change
                    </p>
                    <p className="mt-0.5 text-blue-600">
                      Changing to <strong>{subscription.pendingPlan.name}</strong> on {subscription.scheduledChangeAt
                        ? new Date(subscription.scheduledChangeAt).toLocaleDateString()
                        : "next billing date"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              {subscription.currentPeriodEnd && !subscription.cancelledAt && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-1 border-b w-full">
                  <span>Next billing date</span>
                  <span className="font-medium text-foreground">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
              )}
              <div className="flex gap-3 w-full">
                {subscription.plan.slug !== "free" && !subscription.cancelledAt && (
                  <Button variant="destructive" onClick={handleCancel} disabled={cancelling} className={cn(subscription.cancelledAt ? "" : "flex-1")}>
                    {cancelling ? <Loader2 className="size-4 animate-spin" /> : null}
                    {subscription.cancelledAt ? "Undo Cancel" : "Cancel Subscription"}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        )}

        {/* ── AVAILABLE PLANS ── */}
        <div>
          <h2 className="mb-4 text-lg font-medium">Available Plans</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayPlans.map((plan) => {
              const isCurrentPlan = subscription?.planId === plan.id && subscription?.status !== "created";
              const hasSubscription = !!subscription && subscription.plan.slug !== "free";
              const isDowngrade = hasSubscription && plan.price < subscription!.plan.price;
              return (
                <Card key={plan.id} className={cn(isCurrentPlan && "border-primary ring-1 ring-primary")}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{plan.name.replace(/ \(Monthly\)$/, "")}</CardTitle>
                      {isCurrentPlan && <Badge>Current</Badge>}
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-semibold tracking-tight">{formatPrice(plan.price)}</span>
                      <span className="text-sm text-muted-foreground">/{plan.interval}</span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 rounded-lg bg-primary/5 px-3 py-2 text-sm">
                      <span className="font-semibold">{plan.creditsLimit >= 999999 ? "Unlimited" : plan.creditsLimit.toLocaleString()}</span>
                      <span className="text-muted-foreground"> credits/mo</span>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan || subscribing || changingPlan}
                      onClick={() => hasSubscription ? handleChangePlan(plan.id) : handleSubscribeClick(plan.id)}
                    >
                      {subscribing || changingPlan ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : isCurrentPlan ? (
                        "Current plan"
                      ) : hasSubscription ? (
                        isDowngrade ? "Downgrade" : "Upgrade"
                      ) : (
                        "Subscribe"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Enterprise / Contact Sales card */}
          <Card className="mt-4 border-dashed border-primary/30 bg-gradient-to-br from-primary/[0.02] to-primary/[0.06]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Enterprise</CardTitle>
                <Badge variant="secondary" className="text-xs">Custom</Badge>
              </div>
              <CardDescription>For large teams with custom requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 rounded-lg bg-primary/5 px-3 py-2 text-sm">
                <span className="font-semibold">Unlimited</span>
                <span className="text-muted-foreground"> credits &amp; businesses</span>
              </div>
              <ul className="space-y-2">
                {["Unlimited credits & businesses", "Dedicated account manager", "Custom AI training on your data", "Custom integrations & API access", "SLA guarantee", "Priority 24/7 phone & email support", "Custom contract & invoicing"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => window.open("mailto:sales@beyondvyu.com?subject=Enterprise%20Plan%20Inquiry", "_blank")}
              >
                <ExternalLink className="size-4" />
                Contact Sales
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* ── INVOICE HISTORY ── */}
        {subscription && subscription.invoices?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="size-4" />
                Invoice History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subscription.invoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">₹{(inv.amount / 100).toLocaleString("en-IN")}</p>
                      <p className="text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={inv.status === "captured" ? "default" : "secondary"}>
                        {inv.status}
                      </Badge>
                      {inv.razorpayPaymentId && (
                        <button
                          onClick={() => window.open(`/api/payments/receipt/${inv.razorpayPaymentId}`, "_blank")}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                          title="Download Receipt"
                        >
                          <Download className="size-3" /> PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── RBI COMPLIANCE ── */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <Receipt className="size-4" />
              Subscription & Recurring Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-amber-700">
            <p><strong>E-Mandate Registration:</strong> By subscribing, you authorize BEYONDVYU to collect recurring payments via Razorpay. The first payment requires your authentication via OTP (AFA) as per RBI guidelines. Subsequent recurring charges under ₹15,000 are processed without additional AFA.</p>
            <p><strong>Pre-debit Notification:</strong> Your card issuer will send a notification at least 24 hours before each recurring debit with merchant name, amount, date, and e-mandate reference.</p>
            <p><strong>Opt-out Facility:</strong> You may cancel or modify this mandate at any time via your billing dashboard. Cancellation prior to a debit date will stop that charge. Razorpay or your bank may require additional authentication (AFA) to process opt-out or mandate modifications.</p>
            <p><strong>Mandate Validity:</strong> This e-mandate is valid for the duration of your subscription. The validity period is specified in your Razorpay mandate confirmation.</p>
            <p><strong>No Additional Charges:</strong> No charges are levied by BEYONDVYU for the e-mandate facility. Standard bank/internet charges may apply per your card issuer's terms.</p>
            <p><strong>Grievance Redressal:</strong> For disputes or questions, contact us at support@beyondvyu.com or visit our <a href="/contact" className="underline hover:text-amber-900">Contact page</a>. See our <a href="/refund" className="underline hover:text-amber-900">Refund Policy</a> for cancellation and chargeback terms.</p>
          </CardContent>
        </Card>
      </div>

      {/* ── SUBSCRIBE CONFIRM DIALOG ── */}
      <SubscribeConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSubscribe}
        monthlyPlan={selectedMonthlyPlan}
        yearlyPlan={pair?.yearly ?? null}
        loading={subscribing}
      />

      {/* ── CHANGE PLAN DIALOG ── */}
      <Dialog open={changePlanOpen} onOpenChange={(v) => { if (!v && !changingPlan) setChangePlanOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Pick a new plan. Upgrades take effect immediately with prorated charge. Downgrades apply at end of billing cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {displayPlans.filter((p) => p.id !== subscription?.planId).map((plan) => {
              const isUpgrade = subscription && plan.price >= subscription.plan.price;
              return (
                <button
                  key={plan.id}
                  onClick={() => handleChangePlan(plan.id)}
                  disabled={changingPlan}
                  className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{plan.name.replace(/ \(Monthly\)$/, "")}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{formatPrice(plan.price)}/{plan.interval}</span>
                    </div>
                    <Badge variant={isUpgrade ? "default" : "secondary"}>{isUpgrade ? "Upgrade" : "Downgrade"}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {plan.creditsLimit >= 999999 ? "Unlimited" : `${plan.creditsLimit}`} credits/mo &middot; {plan.businessLimit} business{plan.businessLimit > 1 ? "es" : ""}
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanOpen(false)} disabled={changingPlan}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TOP-UP DIALOG ── */}
      <Dialog open={topUpDialogOpen} onOpenChange={(v) => { if (!v && !buyingCredits) setTopUpDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buy Credits</DialogTitle>
            <DialogDescription>
              Credits never expire and are used after your monthly credits. ₹99 per 100 credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {creditPacks.map((pack) => (
              <button
                key={pack.credits}
                onClick={() => { setTopUpCredits(pack.credits); handleBuyCredits(pack.credits); }}
                disabled={buyingCredits}
                className="w-full rounded-xl border-2 border-border p-4 text-left transition-all hover:border-primary/50 hover:bg-accent disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Zap className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{pack.label}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(pack.amount)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatPrice(pack.amount)}</p>
                    <p className="text-xs text-muted-foreground">{pack.credits} credits</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpDialogOpen(false)} disabled={buyingCredits}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}