"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (planId: string) => void;
  monthlyPlan: Plan | null;
  yearlyPlan: Plan | null;
  loading: boolean;
};

const GST_RATE = 0.18;

function formatPrice(paise: number) {
  if (paise === 0) return "Free";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatPriceWithGST(paise: number) {
  const base = paise / 100;
  const gst = base * GST_RATE;
  const total = base + gst;
  return { base, gst, total };
}

export function SubscribeConfirmDialog({
  open,
  onClose,
  onConfirm,
  monthlyPlan,
  yearlyPlan,
  loading,
}: Props) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const plan = billing === "monthly" ? monthlyPlan : yearlyPlan;

  if (!plan) return null;

  const { base, gst, total } = formatPriceWithGST(plan.price);
  const yearlySavings =
    yearlyPlan && monthlyPlan
      ? (monthlyPlan.price / 100) * 12 - (yearlyPlan.price / 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Confirm your plan
          </DialogTitle>
          <DialogDescription>
            Review your selection before subscribing.
          </DialogDescription>
        </DialogHeader>

        {/* Billing toggle */}
        {yearlyPlan && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                billing === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                billing === "yearly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                Save 2 mo
              </Badge>
            </button>
          </div>
        )}

        {/* Plan card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">{plan.name}</h3>
              <p className="text-xs text-muted-foreground">{plan.description}</p>
            </div>
            {yearlyPlan && (
              <Badge variant="default" className="text-[10px]">
                <Sparkles className="mr-1 size-3" />
                Best value
              </Badge>
            )}
          </div>

          {/* Price breakdown */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Base price</span>
              <span className="text-sm font-medium">
                {formatPrice(monthlyPlan?.price ?? 0)}
                {billing === "yearly" && monthlyPlan && (
                  <span className="ml-1 text-xs text-muted-foreground line-through">
                    ×12
                  </span>
                )}
              </span>
            </div>
            {billing === "yearly" && yearlyPlan && (
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Billed annually</span>
                <span className="text-sm font-semibold text-primary">
                  {formatPrice(yearlyPlan.price)}
                  <span className="ml-1 text-xs font-normal text-green-600">
                    Save {formatPrice(yearlySavings * 100)}
                  </span>
                </span>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">GST (18%)</span>
              <span className="text-sm">₹{gst.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="border-t pt-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold">
                ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span className="text-xs font-normal text-muted-foreground">
                  /{billing === "yearly" ? "year" : "month"}
                </span>
              </span>
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-1.5 pt-1">
            {plan.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="size-3 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(plan.id)}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            Confirm & Subscribe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
