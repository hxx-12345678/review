"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, Download, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const paymentId = searchParams.get("payment_id");
  const subscriptionId = searchParams.get("subscription_id");
  const signature = searchParams.get("signature");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  useEffect(() => {
    if (!paymentId) {
      setLoading(false);
      return;
    }
    // Wait for the auth context to hydrate before calling the (now
    // authenticated) verification endpoints.
    if (!token) {
      const t = setTimeout(() => setLoading(false), 4000);
      return () => clearTimeout(t);
    }
    tryVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, subscriptionId, signature, token]);

  async function tryVerify() {
    setLoading(true);
    setError("");

    if (subscriptionId && signature) {
      const ok = await tryVerifyPayment();
      if (ok) return;
    }

    await pollInvoice();
  }

  async function tryVerifyPayment() {
    for (let i = 0; i < 4; i++) {
      try {
        const res = await fetch(`${API_URL}/payments/verify-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            payment_id: paymentId,
            subscription_id: subscriptionId,
            signature: signature,
          }),
        });

        if (res.status === 404 || res.status === 401) return false;

        const data = await res.json();
        if (res.ok && data.verified) {
          if (data.invoice) {
            setInvoice(data.invoice);
            setVerified(true);
            setLoading(false);
            return true;
          }
          if (data.message) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
        }
        if (res.status === 400) {
          setError(data.error || "Payment verification failed");
          setLoading(false);
          return true;
        }
      } catch {}

      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  }

  async function pollInvoice() {
    for (let i = 0; i < 12; i++) {
      try {
        const res = await fetch(`${API_URL}/payments/invoice/${paymentId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.invoice) {
            setInvoice(data.invoice);
            setVerified(true);
            setLoading(false);
            return;
          }
        }
        if (res.status === 401) {
          setError("Please log in to view your payment details.");
          setLoading(false);
          return;
        }
      } catch {}

      await new Promise((r) => setTimeout(r, 3000));
    }

    setLoading(false);
    if (!subscriptionId) {
      setError("Payment was successful but we're still processing your subscription. Check your billing page in a few minutes.");
    }
  }

  if (!paymentId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="size-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Nothing to see here</h1>
        <Button onClick={() => router.push("/dashboard/billing")}>Go to Billing</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${verified ? "bg-green-100" : "bg-amber-100"}`}>
          {verified ? (
            <Check className="size-8 text-green-600" />
          ) : (
            <Loader2 className={`size-8 text-amber-600 ${loading ? "animate-spin" : ""}`} />
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {verified ? "Payment Successful!" : loading ? "Confirming your payment…" : "Payment received"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {verified
              ? "Your subscription has been activated successfully."
              : "We're verifying the payment with Razorpay. This usually takes a few seconds."}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="flex items-center gap-2 font-medium">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Finalizing your payment details...
          </div>
        ) : invoice ? (
          <Card>
            <CardContent className="space-y-3 pt-6 text-left text-sm">
              {invoice.subscription?.plan?.name && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{invoice.subscription.plan.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">
                  ₹{(invoice.amount / 100).toLocaleString("en-IN")}
                  {invoice.subscription?.plan?.interval ? `/${invoice.subscription.plan.interval}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="max-w-[200px] truncate font-mono text-xs">{paymentId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Invoice Number</span>
                <span className="font-medium">{invoice.invoiceNumber || invoice.id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              {invoice.subscription?.user?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{invoice.subscription.user.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-3 pt-6 text-left text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="max-w-[200px] truncate font-mono text-xs">{paymentId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-green-600">Confirmed</span>
              </div>
              <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                Your subscription is being activated. Invoice details will appear shortly.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/payments/receipt/${paymentId}`, "_blank")}
            disabled={loading}
          >
            <Download className="mr-2 size-4" />
            Download Receipt / PDF
          </Button>
          <Button onClick={() => router.push("/dashboard/billing")}>
            Go to Dashboard
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
