"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Receipt, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

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
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  const success = searchParams.get("success");

  useEffect(() => {
    if (!user || authLoading) return;
    loadData();
  }, [user, authLoading]);

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

  async function handleSubscribe(planId: string) {
    setSubscribing(planId);
    setError("");
    try {
      const res = await api.payments.createSubscription(planId);
      if (res.shortUrl) {
        window.location.href = res.shortUrl;
      } else {
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create subscription");
    } finally {
      setSubscribing(null);
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

  return (
    <>
      <PageHeader
        title="Plan"
        description="View your plan, usage, and payment details."
      />

      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="flex items-center gap-2 font-medium">
              <Check className="size-4" />
              Payment successful! Your subscription is being activated.
            </p>
            <p className="mt-1 text-green-600">It may take a few minutes for the subscription to reflect.</p>
          </div>
        )}

        {error && (
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
            {plans.filter((p) => p.price > 0).map((plan) => {
              const isCurrentPlan = subscription?.planId === plan.id;
              const isDowngrade = subscription && plan.price < subscription.plan.price;
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
                      disabled={isCurrentPlan || subscribing === plan.id}
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      {subscribing === plan.id ? (
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
      </div>
    </>
  );
}
