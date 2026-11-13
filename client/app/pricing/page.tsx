import Link from "next/link"
import { Check, ArrowRight } from "lucide-react"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Button } from "@/components/ui/button"
import { JsonLd } from "@/components/json-ld"

// ─── Types ───────────────────────────────────────────────────────────────────

type Currency = "INR" | "USD";

type PlanRow = {
  name: string;
  priceINR: string;
  priceUSD: string;
  period: string;
  tagline: string;
  cta: string;
  highlight?: boolean;
  features: string[];
};

// ─── Static plan definitions (both currencies) ────────────────────────────────
// USD plans align with what the backend seeds (starter=$29, growth=$59, pro=$99)

const PLANS: PlanRow[] = [
  {
    name: "Free",
    priceINR: "₹0",
    priceUSD: "$0",
    period: "forever",
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
    priceINR: "₹249",
    priceUSD: "$29",
    period: "/ month",
    tagline: "For single-location businesses ready to grow.",
    cta: "Choose Starter",
    highlight: true,
    features: [
      "1 business location",
      "300 AI credits / month",
      "AI reply drafting",
      "Review insights",
      "SMS & email requests",
      "Priority support",
    ],
  },
  {
    name: "Growth",
    priceINR: "₹499",
    priceUSD: "$59",
    period: "/ month",
    tagline: "For growing businesses and small chains.",
    cta: "Choose Growth",
    features: [
      "Up to 3 business locations",
      "1,500 AI credits / month",
      "Everything in Starter",
      "Google Business Profile sync",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    priceINR: "₹799",
    priceUSD: "$99",
    period: "/ month",
    tagline: "For multi-location businesses.",
    cta: "Choose Pro",
    features: [
      "Up to 10 business locations",
      "5,000 AI credits / month",
      "Everything in Growth",
      "WhatsApp review collection*",
      "Google Business Profile sync",
      "Dedicated support",
    ],
  },
  {
    name: "Restaurant Group",
    priceINR: "₹1,999",
    priceUSD: "$249",
    period: "/ month",
    tagline: "For multi-unit groups and chains.",
    cta: "Contact us",
    features: [
      "Unlimited locations",
      "20,000 AI credits / month",
      "Everything in Pro",
      "Custom onboarding",
      "Dedicated account manager",
      "SLA-backed support",
    ],
  },
];

// ─── Geo-detect currency from Cloudflare / Vercel headers (server-side) ───────
// We NEVER expose a manual region toggle — currency is locked to visitor geo.

async function detectCurrency(): Promise<Currency> {
  try {
    const { headers } = await import("next/headers");
    const hdrs = await headers();
    // Cloudflare sets cf-ipcountry; Vercel sets x-vercel-ip-country
    const country =
      hdrs.get("cf-ipcountry") ||
      hdrs.get("x-vercel-ip-country") ||
      hdrs.get("x-country") ||
      "";
    return country.toUpperCase() === "US" ? "USD" : "INR";
  } catch {
    return "INR";
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PricingPage() {
  const currency = await detectCurrency();
  const isUSD = currency === "USD";

  const currencyLabel = isUSD ? "USD" : "INR";
  const paymentNote = isUSD
    ? "Pay securely with Visa, Mastercard, or Amex via Razorpay. Prices in USD. Annual billing available on every paid plan."
    : "Pay with UPI or cards via Razorpay. Prices include GST — a tax invoice is provided for every payment. Annual billing available on every paid plan.";

  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 min-w-0 px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Pricing in {currencyLabel}
          </p>
          <h1 className="speakable mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Simple pricing per location, not per seat
          </h1>
          <p className="speakable mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when review volume grows.{" "}
            {paymentNote}
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${
                p.highlight
                  ? "border-primary bg-primary/[0.03] ring-1 ring-primary"
                  : "border-border/60 bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-bold">{p.name}</h2>
              <p className="mt-2">
                <span className="text-3xl font-bold">
                  {isUSD ? p.priceUSD : p.priceINR}
                </span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                render={<Link href="/signup" />}
                nativeButton={false}
                variant={p.highlight ? "default" : "outline"}
                className="mt-6 w-full"
              >
                {p.cta}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-3 text-sm text-muted-foreground">
          {isUSD ? (
            <>
              <p>
                * WhatsApp review collection requires connecting your WhatsApp Business API number
                (Meta) plus customer and owner opt-in. Meta per-message rates apply.
              </p>
              <p>
                AI features (talking points, drafts, replies, insights) consume credits — 1 credit
                per reply, 2 per insights report. Annual plans: Starter $290/yr, Growth $590/yr,
                Pro $990/yr, Restaurant Group $2,490/yr.
              </p>
              <p>
                Review collection never gates by sentiment: every customer gets the same Google
                review path on every plan. Cancel anytime from billing — you keep access till the
                period ends, then move to Free.
              </p>
            </>
          ) : (
            <>
              <p>
                * WhatsApp review collection and WhatsApp digest delivery require connecting your
                WhatsApp Business API number (Meta) plus customer/owner opt-in. Until connected,
                the dashboard shows an honest preview. Meta per-message rates apply (India utility
                roughly ₹0.14–₹0.30).
              </p>
              <p>
                AI features (talking points, drafts, replies, insights) consume credits — 1 credit
                per reply, 2 per insights report. Yearly plans: Starter ₹2,499/yr, Growth
                ₹4,999/yr, Pro ₹7,999/yr, Restaurant Group ₹19,999/yr.
              </p>
              <p>
                Review collection never gates by sentiment: every customer gets the same Google
                review path on every plan. Cancel anytime from billing — you keep access till the
                period ends, then move to Free.
              </p>
            </>
          )}
        </div>
      </main>
      <MarketingFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://beyondvyu.com" },
            { "@type": "ListItem", position: 2, name: "Pricing", item: "https://beyondvyu.com/pricing" },
          ],
        }}
      />
    </div>
  )
}
