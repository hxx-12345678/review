"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Receipt, Loader2, AlertCircle, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { SubscribeConfirmDialog } from "@/components/billing/subscribe-confirm-dialog";

type Plan = {
  id: string;
  name: string;
  slug: string;
  price: number;
  interval: string;
  aiCallsLimit: number;
  businessLimit: number;
  features: string[];
  description: string;
  sortOrder: number;
};

type Subscription = {
  id: string;
  planId: string;
  status: string;
  aiCallsUsed: number;
  aiCallsLimit: number;
  businessLimit: number;
  currentPeriodEnd: string | null;
  plan: Plan;
  invoices: any[];
};

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: any) => void) => void;
}

interface RazorpayConstructor {
  new (options: {
    key: string;
    subscription_id: string;
    name: string;
    description: string;
    handler: (response: RazorpayResponse) => void;
    prefill: { name?: string; email?: string; contact?: string };
    theme: { color: string };
    modal?: { ondismiss?: () => void };
  }): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

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
      <PageHeader title="Plan" description="View your plan, usage, and payment details." />
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedMonthlyPlan, setSelectedMonthlyPlan] = useState<Plan | null>(null);

  const success = searchParams.get("success");
  const paymentId = searchParams.get("payment_id");
  const errorType = searchParams.get("error");

  useEffect(() => {
    if (!user || authLoading) return;
    loadData();
    if (paymentId) {
      const timer = setTimeout(() => loadData(), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, paymentId]);

  async function loadData() {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        api.payments.plans(),
        api.payments.subscription(),
      ]);
      setPlans(plansRes.plans);
      setSubscription(subRes.subscription);
    } catch (err: any) {
      setError(err.message || "Failed to load plan info");
    } finally {
      setLoading(false);
    }
  }

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

  const openRazorpayCheckout = useCallback((
    razorpaySubscriptionId: string,
    keyId: string,
    planName: string,
  ) => {
    return new Promise<void>((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error("Razorpay SDK not loaded"));
        return;
      }

      const options = {
        key: keyId,
        subscription_id: razorpaySubscriptionId,
        name: "BEYONDVYU",
        description: `${planName} Plan`,
        handler: function (response: RazorpayResponse) {
          window.location.href =
            `/api/payments/subscription-callback` +
            `?razorpay_payment_id=${response.razorpay_payment_id}` +
            `&razorpay_subscription_id=${response.razorpay_subscription_id}` +
            `&razorpay_signature=${response.razorpay_signature}`;
        },
        prefill: {
          email: user?.email || "",
          contact: "",
        },
        theme: { color: "#0f172a" },
        modal: {
          ondismiss: function () {
            resolve();
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        reject(new Error(response.error?.description || "Payment failed"));
      });
      rzp.open();
    });
  }, [user?.email]);

  const loadRazorpayScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.body.appendChild(script);
    });
  }, []);

  function handleSubscribeClick(planId: string) {
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
        return;
      }

      if (!res.razorpaySubscriptionId || !res.keyId) {
        throw new Error("Payment gateway not properly configured");
      }

      const planName = res.subscription?.plan?.name || "Selected";

      await loadRazorpayScript();
      await openRazorpayCheckout(res.razorpaySubscriptionId, res.keyId, planName);

      await loadData();
    } catch (err: any) {
      const message = err.status === 503
        ? "Subscription payments are temporarily unavailable. Please ensure Razorpay keys are configured in your server environment."
        : err.message || "Failed to start subscription";
      setError(message);
    } finally {
      setSubscribing(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your subscription? You will be downgraded to the Free plan.")) return;
    setCancelling(true);
    setError("");
    try {
      await api.payments.cancel();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  }

  function formatPrice(paise: number) {
    if (paise === 0) return "Free";
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  }

  function getUsagePercent() {
    if (!subscription || subscription.aiCallsLimit === 0) return 0;
    return Math.min(100, Math.round((subscription.aiCallsUsed / subscription.aiCallsLimit) * 100));
  }

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

  if (!user) {
    router.replace("/login");
    return null;
  }

  const pair = selectedMonthlyPlan
    ? yearlyPlanPairs[selectedMonthlyPlan.slug]
    : null;

  return (
    <>
      <PageHeader
        title="Plan"
        description="View your plan, usage, and payment details."
      />

      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        {success === "true" && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="flex items-center gap-2 font-medium">
              <Check className="size-4" />
              Payment successful! Your subscription is being activated.
            </p>
            <p className="mt-1 text-green-600">It may take a few minutes for the subscription to reflect. Refreshing...</p>
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

        {subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                  {subscription.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {subscription.plan.name} plan &middot; {formatPrice(subscription.plan.price)}/{subscription.plan.interval}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">AI Calls</span>
                    <span className="font-medium">{subscription.aiCallsUsed} / {subscription.aiCallsLimit}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        getUsagePercent() >= 80 ? "bg-red-500" : getUsagePercent() >= 50 ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${getUsagePercent()}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Business limit</span>
                  <span className="font-medium">{subscription.businessLimit}</span>
                </div>
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current period ends</span>
                    <span className="font-medium">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="gap-3">
              {subscription.plan.slug !== "free" && (
                <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? <Loader2 className="size-4 animate-spin" /> : null}
                  Cancel subscription
                </Button>
              )}
            </CardFooter>
          </Card>
        )}

        <div>
          <h2 className="mb-4 text-lg font-medium">Available Plans</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayPlans.map((plan) => {
              const isCurrentPlan = subscription?.planId === plan.id;
              const isDowngrade = subscription && plan.price < subscription.plan.price;
              const planPair = yearlyPlanPairs[plan.slug];
              const hasYearly = !!planPair?.yearly;

              return (
                <Card key={plan.id} className={cn(isCurrentPlan && "border-primary ring-1 ring-primary")}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{plan.name}</CardTitle>
                      {isCurrentPlan && (
                        <Badge>Current</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-semibold tracking-tight">{formatPrice(plan.price)}</span>
                      <span className="text-sm text-muted-foreground">/{plan.interval}</span>
                    </div>
                    {hasYearly && (
                      <p className="text-xs text-green-600 font-medium">
                        or {formatPrice(planPair.yearly!.price)}/yr — save 2 months
                      </p>
                    )}
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                      disabled={isCurrentPlan || subscribing}
                      onClick={() => handleSubscribeClick(plan.id)}
                    >
                      {subscribing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : isCurrentPlan ? (
                        "Current plan"
                      ) : (
                        isDowngrade ? "Downgrade" : "Subscribe"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {subscription && subscription.invoices.length > 0 && (
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
                    <Badge variant={inv.status === "captured" ? "default" : "secondary"}>
                      {inv.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* RBI E-Mandate Framework 2026 Disclosure */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <Receipt className="size-4" />
              Subscription & Recurring Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-amber-700">
            <p>
              <strong>E-Mandate Registration:</strong> By subscribing, you authorize BEYONDVYU to collect
              recurring payments via Razorpay. The first payment requires your authentication via OTP (AFA)
              as per RBI guidelines. Subsequent recurring charges under ₹15,000 are processed without
              additional AFA.
            </p>
            <p>
              <strong>Pre-debit Notification:</strong> Your card issuer will send a notification at least
              24 hours before each recurring debit with merchant name, amount, date, and e-mandate reference.
            </p>
            <p>
              <strong>Opt-out Facility:</strong> You may cancel or modify this mandate at any time via your
              billing dashboard. Cancellation prior to a debit date will stop that charge. Razorpay or your
              bank may require additional authentication (AFA) to process opt-out or mandate modifications.
            </p>
            <p>
              <strong>Mandate Validity:</strong> This e-mandate is valid for the duration of your
              subscription. The validity period is specified in your Razorpay mandate confirmation.
            </p>
            <p>
              <strong>No Additional Charges:</strong> No charges are levied by BEYONDVYU for the e-mandate
              facility. Standard bank/internet charges may apply per your card issuer&apos;s terms.
            </p>
            <p>
              <strong>Grievance Redressal:</strong> For disputes or questions, contact us at
              support@beyondvyu.app or visit our{" "}
              <a href="/contact" className="underline hover:text-amber-900">Contact page</a>.
              See our{" "}
              <a href="/refund" className="underline hover:text-amber-900">Refund Policy</a> for
              cancellation and chargeback terms.
            </p>
          </CardContent>
        </Card>
      </div>

      <SubscribeConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSubscribe}
        monthlyPlan={selectedMonthlyPlan}
        yearlyPlan={pair?.yearly ?? null}
        loading={subscribing}
      />
    </>
  );
}
