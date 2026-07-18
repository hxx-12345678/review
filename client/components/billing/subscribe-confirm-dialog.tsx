"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, Zap, ShieldCheck, IndianRupee, Calendar } from "lucide-react";
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
const DAYS_IN_YEAR = 365;

function formatPrice(paise: number) {
  if (paise === 0) return "Free";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatPriceShort(paise: number) {
  if (paise === 0) return "₹0";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function gstTotal(paise: number) {
  const base = paise / 100;
  const gst = Math.round(base * GST_RATE);
  return { base, gst, total: base + gst };
}

export function SubscribeConfirmDialog({
  open,
  onClose,
  onConfirm,
  monthlyPlan,
  yearlyPlan,
  loading,
}: Props) {
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");

  if (!monthlyPlan) return null;

  const activePlan = billing === "yearly" && yearlyPlan ? yearlyPlan : monthlyPlan;
  const activePaise = activePlan.price;
  const activeGst = gstTotal(activePaise);

  const monthlyPaise = monthlyPlan.price;
  const monthlyGst = gstTotal(monthlyPaise);

  const yearlyTotalPaise = yearlyPlan ? yearlyPlan.price : monthlyPaise * 12;
  const yearlyMonthlyPrice = yearlyPlan ? yearlyPlan.price / 12 : monthlyPaise;

  const savePaise = monthlyPaise * 12 - (yearlyPlan?.price ?? monthlyPaise * 12);
  const saveMonths = yearlyPlan && yearlyPlan.price < monthlyPaise * 12
    ? Math.round((monthlyPaise * 12 - yearlyPlan.price) / monthlyPaise)
    : 0;

  const perDay = Math.round(yearlyTotalPaise / 100 / DAYS_IN_YEAR);
  const perMonthAnnual = Math.round(yearlyTotalPaise / 100 / 12);

  const hasYearly = !!yearlyPlan;
  const isPlanNameStarter = monthlyPlan.slug === "starter" || monthlyPlan.slug === "starter-yearly";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !loading) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header with brand gradient */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-5 pb-4">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <IndianRupee className="size-5 text-primary" />
              Complete your subscription
            </DialogTitle>
            <DialogDescription className="text-sm">
              Choose the billing that works best for your business
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Billing toggle — yearly is DEFAULT */}
          {hasYearly && (
            <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/50">
              <button
                onClick={() => setBilling("yearly")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  billing === "yearly"
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Calendar className="size-4" />
                Annual
                {billing === "yearly" && (
                  <Badge variant="secondary" className="ml-1 bg-primary-foreground/20 text-primary-foreground text-[10px] px-1.5 py-0">
                    Best value
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setBilling("monthly")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  billing === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="size-4" />
                Monthly
              </button>
            </div>
          )}

          {/* Plan info + pricing card */}
          <div className={cn(
            "rounded-xl border-2 p-4 space-y-3 transition-all duration-300",
            billing === "yearly" && hasYearly
              ? "border-primary/30 bg-primary/[0.03] ring-1 ring-primary/10"
              : "border-border bg-card"
          )}>
            {/* Plan name + description */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm">{monthlyPlan.name} Plan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {monthlyPlan.description?.replace(/^Billed annually\.\s*/i, "")}
                </p>
              </div>
              {billing === "yearly" && hasYearly && (
                <Badge variant="default" className="shrink-0 gap-1 text-[10px]">
                  <Sparkles className="size-3" />
                  Most popular
                </Badge>
              )}
            </div>

            {/* --- ANNUAL PRICING (default, shown when yearly selected) --- */}
            {billing === "yearly" && hasYearly && yearlyPlan && (
              <div className="space-y-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight">{formatPriceShort(yearlyPlan.price)}</span>
                  <span className="text-sm text-muted-foreground">/year</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="text-primary font-semibold">
                    Just ₹{perMonthAnnual.toLocaleString("en-IN")}/mo
                  </span>
                  <span className="text-muted-foreground line-through">
                    {formatPriceShort(monthlyPaise)}/mo × 12 = {formatPriceShort(monthlyPaise * 12)}
                  </span>
                </div>

                {/* Savings badge — loss aversion framing */}
                {savePaise > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900">
                    <Sparkles className="size-3.5" />
                    Save {formatPriceShort(savePaise)}/yr — that&apos;s {saveMonths} month{saveMonths > 1 ? "s" : ""} free
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IndianRupee className="size-3" />
                  Less than ~₹{perDay.toLocaleString("en-IN")}/day
                </div>

                {/* Price with GST */}
                <div className="border-t pt-2 mt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Base price</span>
                    <span>{formatPriceShort(yearlyPlan.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%)</span>
                    <span>₹{activeGst.gst.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-semibold text-foreground">
                    <span>Total (inc. GST)</span>
                    <span>₹{activeGst.total.toLocaleString("en-IN")}/yr</span>
                  </div>
                </div>

                {/* Lock-in message */}
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="size-3 text-green-600" />
                  Lock in today&apos;s price for 12 months. Cancel anytime.
                </p>
              </div>
            )}

            {/* --- MONTHLY PRICING --- */}
            {billing === "monthly" && (
              <div className="space-y-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight">{formatPriceShort(monthlyPaise)}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>

                {/* Show what they miss by not choosing annual */}
                {hasYearly && yearlyPlan && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 space-y-0.5">
                    <p className="font-medium flex items-center gap-1">
                      <Zap className="size-3" />
                      You&apos;d pay {formatPriceShort(yearlyPlan.price)}/yr with annual
                    </p>
                    <p>
                      Switch to annual and save {formatPriceShort(savePaise)} ({saveMonths} months free)
                    </p>
                  </div>
                )}

                {/* Price with GST */}
                <div className="border-t pt-2 mt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Base price</span>
                    <span>{formatPriceShort(monthlyPaise)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%)</span>
                    <span>₹{monthlyGst.gst.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-semibold text-foreground">
                    <span>Total (inc. GST)</span>
                    <span>₹{monthlyGst.total.toLocaleString("en-IN")}/mo</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feature highlights */}
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">What&apos;s included:</p>
              <ul className="space-y-1.5">
                {monthlyPlan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="size-3.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Trust bar */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-1">
              <IndianRupee className="size-3" />
              GST invoice
            </span>
            <span className="flex items-center gap-1">
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Razorpay secure
            </span>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(activePlan.id)}
              disabled={loading}
              className="flex-1 gap-2"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <IndianRupee className="size-4" />
              )}
              {loading ? "Processing..." : `Pay ${formatPriceShort(activePaise)}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
