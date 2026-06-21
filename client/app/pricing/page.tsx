"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Button } from "@/components/ui/button"

const PLANS = [
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    desc: "For a single location getting started.",
    features: ["1 location", "Unlimited QR scans", "AI talking points", "Review inbox", "Email support"],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$59",
    period: "/mo",
    desc: "For busy businesses that want to scale reviews.",
    features: [
      "Up to 3 locations",
      "Everything in Starter",
      "AI reply drafting",
      "SMS & email review requests",
      "Analytics & trends",
      "Priority support",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Multi",
    price: "Custom",
    period: "",
    desc: "For franchises and multi-location brands.",
    features: [
      "Unlimited locations",
      "Everything in Growth",
      "Team roles & permissions",
      "Branded customer flow",
      "Dedicated success manager",
    ],
    cta: "Contact sales",
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="flex-1 min-w-0 overflow-hidden">
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Simple pricing that pays for itself
            </h1>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              One new customer from a better Google rating usually covers the whole month. Every plan stays fully
              compliant with Google and FTC policy.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
                  plan.highlight ? "border-primary shadow-sm ring-1 ring-primary" : "border-border"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h2 className="font-medium text-foreground">{plan.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                {plan.cta === "Contact sales" ? (
                  <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4 text-left">
                    <p className="text-sm font-medium text-foreground">Contact our sales team</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Email us at{" "}
                      <a
                        href="mailto:sales@reviewos.app"
                        className="font-medium text-primary hover:underline"
                      >
                        sales@reviewos.app
                      </a>{" "}
                      or call +1 (555) 000-0000
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const subject = encodeURIComponent("ReviewOS Multi-Plan Inquiry")
                        window.location.href = `mailto:sales@reviewos.app?subject=${subject}`
                      }}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
                    >
                      Send us an email
                    </button>
                  </div>
                ) : (
                  <Button
                    render={<Link href="/signup" />}
                    nativeButton={false}
                    className="mt-5"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                )}
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
