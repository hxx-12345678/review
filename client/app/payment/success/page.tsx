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
  const { user, token, loading: authLoading } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const paymentId = searchParams.get("payment_id");
  const subscriptionId = searchParams.get("subscription_id");
  const signature = searchParams.get("signature");

  useEffect(() => {
    if (!paymentId || !subscriptionId || !signature) {
      setLoading(false);
      return;
    }
    verifyPayment();
  }, [paymentId, subscriptionId, signature]);

  async function verifyPayment() {
    setLoading(true);
    setError("");

    const maxRetries = 8;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
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

        const data = await res.json();

        if (res.ok && data.verified) {
          if (data.invoice) {
            setInvoice(data.invoice);
            setLoading(false);
            return;
          }
          if (data.message) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
        }

        if (res.status === 400) {
          setError(data.error || "Payment verification failed");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Verify payment attempt failed:", err);
      }

      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    setLoading(false);
    if (!invoice) {
      setError("Could not load payment details. Please check your billing page.");
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
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
          <Check className="size-8 text-green-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Successful!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your subscription has been activated successfully.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="flex items-center gap-2 font-medium">
              <AlertCircle className="size-4" />
              {error}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Verifying payment and loading receipt details...
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
                <span className="font-medium">{invoice.id.slice(-8).toUpperCase()}</span>
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
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/payments/receipt/${paymentId}`, "_blank")}
            disabled={loading && !error}
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
