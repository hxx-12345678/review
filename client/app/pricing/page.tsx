import Link from "next/link"
import { Check, ArrowRight } from "lucide-react"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Button } from "@/components/ui/button"
import { JsonLd } from "@/components/json-ld"

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    tagline: "For trying review collection on one location.",
    cta: "Start free",
    features: ["1 business location", "30 AI credits / month", "QR + link review collection", "Review inbox (Google)", "Basic analytics"],
  },
  {
    name: "Lite",
    price: "₹100",
    period: "/ month",
    tagline: "Affordable entry for a single location.",
    cta: "Choose Lite",
    features: ["1 business location", "100 AI credits / month", "QR + link review collection", "Review inbox (Google)", "Basic analytics", "Priority email support"],
  },
  {
    name: "Starter",
    price: "₹249",
    period: "/ month",
    tagline: "For single-location businesses ready to grow.",
    cta: "Choose Starter",
    highlight: true,
    features: ["1 business location", "300 AI credits / month", "AI reply drafting", "Review insights", "SMS & email requests", "Priority support"],
  },
  {
    name: "Growth",
    price: "₹499",
    period: "/ month",
    tagline: "For growing businesses and small chains.",
    cta: "Choose Growth",
    features: ["Up to 3 business locations", "1,500 AI credits / month", "Everything in Starter", "Google Business Profile sync", "Team roles (5 users)", "Priority support"],
  },
  {
    name: "Pro",
    price: "₹799",
    period: "/ month",
    tagline: "For multi-location businesses.",
    cta: "Choose Pro",
    features: ["Up to 10 business locations", "5,000 AI credits / month", "Everything in Growth", "WhatsApp review collection*", "Google Business Profile sync", "Team roles (15 users)", "Dedicated support"],
  },
]

export default function PricingPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 min-w-0 px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Pricing in INR</p>
          <h1 className="speakable mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Simple pricing per location, not per seat
          </h1>
          <p className="speakable mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when review volume grows. Yearly plans save roughly 2 months.
            Pay with UPI or cards via Razorpay. Prices exclusive of GST — GST invoice included.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${
                p.highlight ? "border-primary bg-primary/[0.03] ring-1 ring-primary" : "border-border/60 bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-bold">{p.name}</h2>
              <p className="mt-2">
                <span className="text-3xl font-bold">{p.price}</span>
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
              <Button render={<Link href="/signup" />} nativeButton={false} variant={p.highlight ? "default" : "outline"} className="mt-6 w-full">
                {p.cta}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-3 text-sm text-muted-foreground">
          <p>
            * WhatsApp review collection and WhatsApp digest delivery require connecting your WhatsApp Business
            API number (Meta) plus customer/owner opt-in. Until connected, the dashboard shows an honest preview.
            Meta per-message rates apply (India utility roughly ₹0.14–₹0.30).
          </p>
          <p>
            AI features (talking points, drafts, replies, insights) consume credits — 1 credit per reply, 2 per
            insights report. Yearly plans: Lite ₹1,200/yr, Starter ₹2,499/yr, Growth ₹4,999/yr, Pro ₹7,999/yr.
          </p>
          <p>
            Review collection never gates by sentiment: every customer gets the same Google review path on every
            plan. Cancel anytime from billing — you keep access till the period ends, then move to Free.
          </p>
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
