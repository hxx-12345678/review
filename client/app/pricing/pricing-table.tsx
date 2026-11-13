"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, ShieldCheck, Sparkles, Building2, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Currency = "INR" | "USD";

interface PlanItem {
  name: string;
  priceMonthlyINR: number;
  priceAnnualINR: number;
  priceMonthlyUSD: number;
  priceAnnualUSD: number;
  tagline: string;
  cta: string;
  highlight?: boolean;
  features: string[];
}

const PLANS: PlanItem[] = [
  {
    name: "Free",
    priceMonthlyINR: 0,
    priceAnnualINR: 0,
    priceMonthlyUSD: 0,
    priceAnnualUSD: 0,
    tagline: "For trying review collection on one location.",
    cta: "Start free",
    features: [
      "1 business location",
      "30 AI credits / month",
      "QR + link review collection",
      "Review inbox (Google)",
      "Basic analytics",
    ],
  },
  {
    name: "Starter",
    priceMonthlyINR: 249,
    priceAnnualINR: 2499,
    priceMonthlyUSD: 29,
    priceAnnualUSD: 290,
    tagline: "For single-location businesses ready to grow.",
    cta: "Choose Starter",
    highlight: true,
    features: [
      "1 business location",
      "300 AI credits / month",
      "AI reply drafting",
      "Review insights",
      "Table attribution & QR",
      "Priority email support",
    ],
  },
  {
    name: "Growth",
    priceMonthlyINR: 499,
    priceAnnualINR: 4999,
    priceMonthlyUSD: 59,
    priceAnnualUSD: 590,
    tagline: "For growing businesses and small chains.",
    cta: "Choose Growth",
    features: [
      "Up to 3 business locations",
      "1,500 AI credits / month",
      "Everything in Starter",
      "Google Business Profile sync",
      "Operational Task SLA alerts",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    priceMonthlyINR: 799,
    priceAnnualINR: 7999,
    priceMonthlyUSD: 99,
    priceAnnualUSD: 990,
    tagline: "For multi-location businesses.",
    cta: "Choose Pro",
    features: [
      "Up to 10 business locations",
      "5,000 AI credits / month",
      "Everything in Growth",
      "Multi-Unit Command Center",
      "Closed-Loop Guest Recovery",
      "Dedicated account manager",
    ],
  },
  {
    name: "Restaurant Group",
    priceMonthlyINR: 1999,
    priceAnnualINR: 19999,
    priceMonthlyUSD: 249,
    priceAnnualUSD: 2490,
    tagline: "For multi-unit groups and regional chains.",
    cta: "Choose Group",
    features: [
      "Up to 25 locations",
      "20,000 AI credits / month",
      "Complaint-to-Task Engine (2h/12h SLA)",
      "Table & Server attribution analytics",
      "Custom onboarding & team training",
      "VIP Priority SLA & dedicated manager",
    ],
  },
];

export function PricingTable({ defaultCurrency = "USD" }: { defaultCurrency?: Currency }) {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const isUSD = currency === "USD";

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* ── Region Selector Pill & Billing Cycle Toggle ── */}
      <div className="mt-8 flex flex-col items-center justify-center gap-4">
        {/* Region Selector Pill */}
        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-border/80 bg-muted/60 p-1 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                isUSD
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-sm">🇺🇸</span>
              <span>United States (USD)</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrency("INR")}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                !isUSD
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-sm">🇮🇳</span>
              <span>India (INR)</span>
            </button>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary/80" />
            <span>
              Pricing in {isUSD ? "USD ($)" : "INR (₹)"}. Subscription currency is verified and locked to your business location at setup.
            </span>
          </p>
        </div>

        {/* Monthly vs Annual Toggle */}
        <div className="mt-2 inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border/50">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all",
              billingCycle === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all",
              billingCycle === "annual"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Annual billing</span>
            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 py-0 border-0 font-bold">
              Save 2 months free
            </Badge>
          </button>
        </div>
      </div>

      {/* ── Pricing Cards Grid ── */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLANS.map((p) => {
          const isFree = p.priceMonthlyINR === 0;
          let displayPrice = "";
          let periodText = "";
          let savingsText = "";

          if (isFree) {
            displayPrice = isUSD ? "$0" : "₹0";
            periodText = "forever";
          } else if (billingCycle === "annual") {
            const annualPrice = isUSD ? p.priceAnnualUSD : p.priceAnnualINR;
            const monthlyEquivalent = isUSD ? Math.round(annualPrice / 12) : Math.round(annualPrice / 12);
            displayPrice = isUSD ? `$${monthlyEquivalent}` : `₹${monthlyEquivalent}`;
            periodText = "/ month";
            savingsText = isUSD
              ? `Billed annually ($${annualPrice}/yr) · Save 2 months`
              : `Billed annually (₹${annualPrice.toLocaleString("en-IN")}/yr) · Save 2 months`;
          } else {
            const monthlyPrice = isUSD ? p.priceMonthlyUSD : p.priceMonthlyINR;
            displayPrice = isUSD ? `$${monthlyPrice}` : `₹${monthlyPrice.toLocaleString("en-IN")}`;
            periodText = "/ month";
          }

          return (
            <div
              key={p.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg",
                p.highlight
                  ? "border-primary bg-primary/[0.03] ring-1 ring-primary"
                  : "border-border/60 bg-card"
              )}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-bold">{p.name}</h2>
              <div className="mt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">{displayPrice}</span>
                  <span className="text-sm text-muted-foreground">{periodText}</span>
                </div>
                {savingsText ? (
                  <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    {savingsText}
                  </p>
                ) : (
                  <div className="h-4" />
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{p.tagline}</p>

              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground/85">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                render={<Link href="/signup" />}
                nativeButton={false}
                variant={p.highlight ? "default" : "outline"}
                className="mt-6 w-full"
              >
                <span>{p.cta}</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* ── Explanatory Disclosures ── */}
      <div className="mx-auto mt-12 max-w-3xl space-y-3 text-xs text-muted-foreground border-t pt-8">
        {isUSD ? (
          <>
            <p>
              * <strong>Transparent U.S. Pricing:</strong> Billed in USD ($) with Visa, Mastercard, or American Express via Razorpay international billing. Annual billing provides 2 free months on every tier.
            </p>
            <p>
              * <strong>Automated SMS &amp; WhatsApp:</strong> Post-dine review requests require restaurant owner verification and carrier A2P 10DLC compliance. Meta WhatsApp rates apply for optional WhatsApp delivery.
            </p>
            <p>
              * <strong>No Review Gating &amp; FTC Compliant:</strong> Every guest receives the exact same direct Google review routing regardless of star rating or feedback sentiment.
            </p>
            <p>
              * <strong>Click-to-Cancel:</strong> Cancel your subscription anytime directly from your billing dashboard in a single click without calling support.
            </p>
          </>
        ) : (
          <>
            <p>
              * <strong>India Transparent Pricing:</strong> Pay with UPI, cards, or net banking via Razorpay. Prices include 18% GST — compliant tax invoices are issued for every payment.
            </p>
            <p>
              * <strong>RBI E-Mandate Compliant:</strong> Subscriptions under ₹15,000 process without secondary OTP after the initial authorization per RBI/2026-27/396 guidelines.
            </p>
            <p>
              * <strong>WhatsApp Delivery:</strong> Review collection and owner digests via WhatsApp require a connected Meta WhatsApp Business number and approved utility templates.
            </p>
            <p>
              * <strong>Zero Review Gating:</strong> All customers receive identical direct Google review routing across every plan tier. Cancel anytime from your billing page.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
