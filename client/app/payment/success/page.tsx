"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, Download, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const paymentId = searchParams.get("payment_id");
  const planName = searchParams.get("plan");
  const amountPaise = searchParams.get("amount");
  const interval = searchParams.get("interval");

  useEffect(() => {
    if (!paymentId) return;
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/payments/invoice/${paymentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.invoice) {
            setInvoice(data.invoice);
            setLoading(false);
            return;
          }
        }
      } catch {}
      if (pollCount < 6) {
        setTimeout(() => setPollCount((c) => c + 1), 2000);
      } else {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [paymentId, pollCount]);

  const amount = amountPaise
    ? `₹${(parseInt(amountPaise) / 100).toLocaleString("en-IN")}`
    : invoice
      ? `₹${(invoice.amount / 100).toLocaleString("en-IN")}`
      : null;

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

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading receipt details...
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-3 pt-6 text-left text-sm">
              {planName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{planName}</span>
                </div>
              )}
              {amount && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{amount}{interval ? `/${interval}` : ""}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="max-w-[200px] truncate font-mono text-xs">{paymentId}</span>
              </div>
              {invoice && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{new Date(invoice.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/payments/receipt/${paymentId}`, "_blank")}
          >
            <Download className="mr-2 size-4" />
            Download Receipt
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
