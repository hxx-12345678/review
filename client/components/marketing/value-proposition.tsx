import { Star, Search, TrendingUp, ThumbsUp, MessageSquareText, BarChart3, Timer, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const PAIN_POINTS = [
  {
    icon: Timer,
    title: "You're losing reviews every day",
    body: "Most happy customers never leave a review simply because nobody asked. Without a system, every unsatisfied customer leaves a public review — but every satisfied one walks out silent.",
    stat: "76%",
    statLabel: "of customers never leave a review, even when satisfied",
    statColor: "text-amber-400",
    gradient: "from-amber-500/10 via-amber-500/[0.02] to-transparent",
    borderColor: "border-l-amber-500",
  },
  {
    icon: Search,
    title: "Your Google ranking depends on reviews",
    body: "Google's Local Pack ranks businesses by review count, rating, and response rate. More reviews = higher visibility. Higher visibility = more customers walking through your door.",
    stat: "4.7×",
    statLabel: "higher chance to appear in Google Local 3-Pack",
    statColor: "text-emerald-400",
    gradient: "from-emerald-500/10 via-emerald-500/[0.02] to-transparent",
    borderColor: "border-l-emerald-500",
  },
  {
    icon: ThumbsUp,
    title: "93% of consumers read reviews before buying",
    body: "Reviews are your most powerful sales asset. Each authentic 5-star review is a trust signal that converts skeptical browsers into paying customers — but only if you're actively collecting them.",
    stat: "93%",
    statLabel: "of consumers say online reviews influence their buying decisions",
    statColor: "text-blue-400",
    gradient: "from-blue-500/10 via-blue-500/[0.02] to-transparent",
    borderColor: "border-l-blue-500",
  },
]

const SOLUTIONS = [
  {
    icon: TrendingUp,
    title: "3.2× more reviews than paper cards",
    body: "A QR code on the counter does what a stack of business cards never could. Customers scan, rate, and review in under 60 seconds — no typing URLs, no searching your business name.",
    gradient: "from-primary/10 via-primary/[0.02] to-transparent",
  },
  {
    icon: BarChart3,
    title: "Weekly AI insights on WhatsApp",
    body: "Every review feeds into an AI that tracks sentiment, identifies trends, and finds top praises and complaints — delivered as a weekly report to your WhatsApp. Know what customers love and what needs fixing.",
    gradient: "from-violet-500/10 via-violet-500/[0.02] to-transparent",
  },
  {
    icon: ShieldCheck,
    title: "100% Google & FTC compliant",
    body: "No gating, no templated reviews, no staff name prompts. Every review is authentic. BEYONDVYU is built from the ground up to follow every Google and FTC rule — because your reputation is too important to risk.",
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
            No credit card required · Set up in 2 minutes · Free plan available
          </p>
        </div>
      </div>
    </section>
  )
}
