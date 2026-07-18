"use client"

import { useState } from "react"
import {
  CheckCircle2,
  Smartphone,
  Users,
  CreditCard,
  ShieldCheck,
  Plus,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui-bits"
import { agents } from "@/lib/mock-data"

type Tab = "connection" | "team" | "billing" | "compliance"

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "connection", label: "WhatsApp", icon: Smartphone },
  { key: "team", label: "Team", icon: Users },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "compliance", label: "Compliance", icon: ShieldCheck },
]

export function SettingsClient() {
  const [tab, setTab] = useState<Tab>("connection")
  const [market, setMarket] = useState<"IN" | "GLOBAL">("IN")

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  tab === t.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === "connection" && <ConnectionTab />}
        {tab === "team" && <TeamTab />}
        {tab === "billing" && <BillingTab market={market} setMarket={setMarket} />}
        {tab === "compliance" && <ComplianceTab />}
      </div>
    </div>
  )
}

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ConnectionTab() {
  return (
    <Card
      title="WhatsApp Business Platform"
      description="Connected via the official Cloud API. This swaps in for the demo data."
    >
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <CheckCircle2 className="size-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">+91 80 4718 2200</p>
          <p className="text-xs text-muted-foreground">
            Display name: Relay HQ · Quality rating: High
          </p>
        </div>
        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
          Connected
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {[
          ["WABA ID", "•••• 4821"],
          ["Phone number ID", "•••• 9920"],
          ["Messaging tier", "10K / 24h"],
          ["Webhook", "Verified"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-background p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Onboarding for additional numbers uses Meta Embedded Signup (v4).
      </p>
    </Card>
  )
}

function TeamTab() {
  return (
    <Card
      title="Team members"
      description="Everyone shares one inbox. Roles control what they can change."
    >
      <ul className="divide-y divide-border">
        {agents.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0">
            <Avatar initials={a.initials} color={a.avatarColor} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.name}</p>
              <p className="truncate text-xs text-muted-foreground">{a.email}</p>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                a.role === "owner"
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {a.role}
            </span>
            <span
              className={cn(
                "size-2 rounded-full",
                a.online ? "bg-primary" : "bg-muted-foreground/40",
              )}
              aria-label={a.online ? "online" : "offline"}
            />
          </li>
        ))}
      </ul>
      <button className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
        <Plus className="size-4" /> Invite teammate
      </button>
    </Card>
  )
}

const plans = {
  IN: {
    currency: "₹",
    label: "Indian businesses · billed via Razorpay",
    tiers: [
      { name: "Starter", price: "999", per: "/mo", seats: "2 agents", popular: false },
      { name: "Growth", price: "2,499", per: "/mo", seats: "6 agents + Copilot", popular: true },
      { name: "Scale", price: "6,999", per: "/mo", seats: "Unlimited + API", popular: false },
    ],
  },
  GLOBAL: {
    currency: "$",
    label: "Global businesses · billed via Stripe",
    tiers: [
      { name: "Starter", price: "29", per: "/mo", seats: "2 agents", popular: false },
      { name: "Growth", price: "79", per: "/mo", seats: "6 agents + Copilot", popular: true },
      { name: "Scale", price: "199", per: "/mo", seats: "Unlimited + API", popular: false },
    ],
  },
}

function BillingTab({
  market,
  setMarket,
}: {
  market: "IN" | "GLOBAL"
  setMarket: (m: "IN" | "GLOBAL") => void
}) {
  const plan = plans[market]
  return (
    <>
      <Card title="Billing region" description="Pricing and processor adapt to your market.">
        <div className="inline-flex rounded-lg border border-border p-1">
          {(["IN", "GLOBAL"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                market === m
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "IN" ? "India (INR)" : "Global (USD)"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{plan.label}</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {plan.tiers.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "rounded-xl border bg-card p-4",
              tier.popular ? "border-primary" : "border-border",
            )}
          >
            {tier.popular && (
              <span className="mb-2 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                Most popular
              </span>
            )}
            <p className="text-sm font-medium">{tier.name}</p>
            <p className="mt-1">
              <span className="text-2xl font-semibold tracking-tight">
                {plan.currency}
                {tier.price}
              </span>
              <span className="text-xs text-muted-foreground">{tier.per}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{tier.seats}</p>
            <button
              className={cn(
                "mt-3 w-full rounded-md py-2 text-xs font-medium transition-colors",
                tier.popular
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border border-border hover:bg-accent",
              )}
            >
              {tier.popular ? "Current plan" : "Choose"}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Plus WhatsApp conversation charges billed at Meta&apos;s rates by country
        and category. Service replies inside the 24h window are free.
      </p>
    </>
  )
}

function ComplianceTab() {
  const items = [
    {
      ok: true,
      title: "Official Cloud API only",
      body: "We never use unofficial libraries that risk a permanent ban.",
    },
    {
      ok: true,
      title: "Task-specific AI assistant",
      body: "The Copilot answers business questions — it is not a general-purpose chatbot, in line with Meta's January 2026 policy.",
    },
    {
      ok: true,
      title: "Human-in-the-loop",
      body: "AI drafts and summaries always require an agent to review and send.",
    },
    {
      ok: true,
      title: "24-hour window aware",
      body: "Free-form replies are kept inside the customer service window to stay compliant and reduce template costs.",
    },
  ]
  return (
    <Card
      title="Platform compliance"
      description="How Relay stays inside WhatsApp Business Platform rules."
    >
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.title} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Check className="size-3 text-primary" />
            </span>
            <div>
              <p className="text-sm font-medium">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
