import { Star, Search, TrendingUp, ThumbsUp, MessageSquareText, BarChart3, Timer, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const PAIN_POINTS = [
  {
    icon: Timer,
    title: "You're losing reviews every day",
    body: "Most happy customers never leave a review simply because nobody asked at the right moment. Without a point-of-experience system, unhappy moments become public reviews — while satisfied visits walk out silent.",
    stat: "97%",
    statLabel: "of consumers read reviews for local businesses (BrightLocal 2026)",
    statColor: "text-amber-400",
    gradient: "from-amber-500/10 via-amber-500/[0.02] to-transparent",
    borderColor: "border-l-amber-500",
  },
  {
    icon: Search,
    title: "Your Google visibility depends on genuine reviews",
    body: "Google says review count and score can contribute to local prominence, alongside relevance and distance. Fresh, genuine reviews build trust and keep your profile active — no shortcuts, no gating.",
    stat: "6",
    statLabel: "review sites the average consumer checks (BrightLocal 2026)",
    statColor: "text-emerald-400",
    gradient: "from-emerald-500/10 via-emerald-500/[0.02] to-transparent",
    borderColor: "border-l-emerald-500",
  },
  {
    icon: ThumbsUp,
    title: "Consumers trust specifics, not templates",
    body: "Reviews convert browsers into customers when they describe real experiences — staff, cleanliness, waiting time, food quality. BEYONDVYU turns what customers already told you into their own words, never copy-paste templates.",
    stat: "89%",
    statLabel: "expect businesses to respond to reviews (BrightLocal 2025)",
    statColor: "text-blue-400",
    gradient: "from-blue-500/10 via-blue-500/[0.02] to-transparent",
    borderColor: "border-l-blue-500",
  },
]

const SOLUTIONS = [
  {
    icon: TrendingUp,
    title: "Turn visits into authentic reviews",
    body: "A QR code at billing, checkout or reception does what paper cards never could. Customers scan, describe their visit in their language, and post to Google in about a minute — the same path for every customer, never gated.",
    gradient: "from-primary/10 via-primary/[0.02] to-transparent",
  },
  {
    icon: BarChart3,
    title: "Weekly WhatsApp intelligence, not another dashboard",
    body: "Every interaction feeds sentiment, praise/complaint themes and review-velocity trends — delivered as a weekly WhatsApp digest. See what customers love, what needs fixing, and which location needs attention.",
    gradient: "from-violet-500/10 via-violet-500/[0.02] to-transparent",
  },
  {
    icon: ShieldCheck,
    title: "Compliance-first by design",
    body: "No gating, no incentives, no staff-name prompts, no posting on a customer's behalf. Open-ended prompts keep you aligned with Google's review policies. India privacy (DPDP Act) and consent-first messaging built in.",
    gradient: "from-sky-500/10 via-sky-500/[0.02] to-transparent",
  },
]

export function ValueProposition() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-muted/10 to-background">
      {/* Section header */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-28 sm:px-6">
        <div className="mx-auto max-w-3xl text-center reveal">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Why BEYONDVYU</p>
          <div className="mx-auto mt-3 h-px w-16 bg-primary/40" />
          <h2 className="mt-6 text-balance text-4xl font-bold tracking-[-0.025em] text-foreground sm:text-5xl">
            Your reputation <span className="text-gradient">is your revenue</span>
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            Online reviews decide whether customers choose you or your competitor. Yet most businesses leave their
            reputation to chance. Here is why you need a system — and why BeyondVyu is the one.
          </p>
        </div>

        {/* Pain points grid (bento style) */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {PAIN_POINTS.map((item) => (
            <div
              key={item.title}
              className={`group relative rounded-2xl border border-border/60 bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-l-[3px] ${item.borderColor} overflow-hidden`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} aria-hidden="true" />
              <div className="relative z-10">
                <div className="flex size-11 items-center justify-center rounded-xl bg-muted/50 text-foreground/70 mb-4">
                  <item.icon className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                <div className="mt-4 flex items-baseline gap-1.5 border-t border-border/40 pt-4">
                  <span className={`text-2xl font-bold ${item.statColor}`}>{item.stat}</span>
                  <span className="text-xs text-muted-foreground">{item.statLabel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Solutions grid (2 rows of bento) */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-20 pb-28 sm:px-6">
        <div className="mx-auto max-w-3xl text-center reveal">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">What you get</p>
          <div className="mx-auto mt-3 h-px w-16 bg-primary/40" />
          <h2 className="mt-6 text-balance text-3xl font-bold tracking-[-0.025em] text-foreground sm:text-4xl">
            A complete review intelligence platform — <span className="text-gradient">in one QR code</span>
          </h2>
        </div>

        {/* 3-card bento row */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {SOLUTIONS.map((item) => (
            <div
              key={item.title}
              className={`group relative rounded-2xl border border-border/60 bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} aria-hidden="true" />
              <div className="relative z-10">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <item.icon className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center reveal">
          <div className="magnetic-wrap inline-block">
            <Button
              render={<Link href="/signup" />}
              nativeButton={false}
              size="lg"
              className="btn-3d magnetic-child group rounded-xl bg-primary px-10 py-4 text-sm font-bold text-primary-foreground squishy"
            >
              Start collecting reviews free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required · Set up in 2 minutes · Free plan forever · From ₹100/mo — see pricing
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-[11px] leading-relaxed text-muted-foreground/70">
            Review statistics cited from BrightLocal Local Consumer Review Survey 2025–2026 (US panel, n≈1,026).
            Product performance varies by location, volume and execution — we measure visits → review starts → Google posts per location.
          </p>
        </div>
      </div>
    </section>
  )
}
