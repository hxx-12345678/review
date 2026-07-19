"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Loader2 } from "lucide-react"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Button } from "@/components/ui/button"
import { JsonLd } from "@/components/json-ld"

type Plan = {
  id: string
  name: string
  slug: string
  price: number
  interval: string
  features: string[]
  description: string
  sortOrder: number
}

function formatPrice(paise: number) {
  if (paise === 0) return "Free"
  return `₹${(paise / 100).toLocaleString("en-IN")}`
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/payments/plans`)
      .then((r) => r.json())
      .then((data) => {
        setPlans((data.plans || []).filter((p: Plan) => p.price > 0))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const paidPlans = plans.length > 0 ? plans : [];

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

          {loading ? (
            <div className="mt-14 flex justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {paidPlans.map((plan, idx) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
                    idx === 1 ? "border-primary shadow-sm ring-1 ring-primary" : "border-border"
                  }`}
                >
                  {idx === 1 && (
                    <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Most popular
                    </span>
                  )}
                  <h2 className="font-medium text-foreground">{plan.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-foreground">{formatPrice(plan.price)}</span>
                    <span className="text-sm text-muted-foreground">/{plan.interval}</span>
                  </div>
                  <Button
                    render={<Link href="/signup" />}
                    nativeButton={false}
                    className="mt-5"
                    variant={idx === 1 ? "default" : "outline"}
                  >
                    Start free trial
                  </Button>
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
          )}
        </section>
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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Is there a free plan?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. BEYONDVYU offers a free plan with QR code generation, basic analytics, and up to 50 feedback submissions per month. No credit card required.",
              },
            },
            {
              "@type": "Question",
              name: "Can I switch plans later?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. You can upgrade or downgrade your plan at any time from your dashboard. Changes take effect at the start of the next billing cycle.",
              },
            },
            {
              "@type": "Question",
              name: "Are all plans FTC and Google compliant?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Every BEYONDVYU plan is designed to be fully compliant with Google review policies, FTC endorsement guidelines, and RBI e-mandate regulations for Indian subscriptions.",
              },
            },
            {
              "@type": "Question",
              name: "What payment methods do you accept?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "We accept all major credit and debit cards via Razorpay. Subscriptions are billed monthly or annually with RBI-compliant e-mandate support.",
              },
            },
          ],
        }}
      />
    </div>
  )
}
