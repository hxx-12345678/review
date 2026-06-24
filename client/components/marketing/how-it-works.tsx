import { QrCode, MessageSquareText, Sparkles, Star, ShieldCheck, TrendingUp, Clock, Zap } from "lucide-react"

const STEPS = [
  {
    icon: QrCode,
    title: "Scan the QR code",
    body: "Place it at the front desk, on receipts, or send via text. One tap opens a fast, mobile-first flow.",
    color: "border-l-primary",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    cardBgGrad: "from-primary/12 via-primary/[0.03] to-transparent",
    index: 0,
  },
  {
    icon: Star,
    title: "Rate their experience",
    body: "Every customer sees the same path. No gating — everyone can post a public review.",
    color: "border-l-amber-500",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    cardBgGrad: "from-amber-500/12 via-amber-500/[0.03] to-transparent",
    index: 1,
  },
  {
    icon: MessageSquareText,
    title: "Share a few details",
    body: "Quick questions surface the specifics worth mentioning, in the customer's own words.",
    color: "border-l-blue-500",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    cardBgGrad: "from-blue-500/12 via-blue-500/[0.03] to-transparent",
    index: 2,
  },
  {
    icon: Sparkles,
    title: "AI gives talking points",
    body: "Not a written review — just personal reminders that make it easy to write something authentic on Google.",
    color: "border-l-violet-500",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600",
    cardBgGrad: "from-violet-500/12 via-violet-500/[0.03] to-transparent",
    index: 3,
  },
  {
    icon: ShieldCheck,
    title: "Fully compliant",
    body: "No gating, no templated reviews, no staff name prompts. Every review is authentic and policy-safe.",
    color: "border-l-emerald-500",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    cardBgGrad: "from-emerald-500/12 via-emerald-500/[0.03] to-transparent",
    index: 4,
  },
]

const STATS = [
  { icon: TrendingUp, value: 3.2, suffix: "×", label: "More reviews", desc: "vs. paper cards" },
  { icon: Clock, value: 60, suffix: "s", label: "Average flow", desc: "start to finish", prefix: "< " },
  { icon: Zap, value: 94, suffix: "%", label: "Completion rate", desc: "customers finish" },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative bg-gradient-to-b from-muted/20 via-background to-muted/20">
      <div className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6">
        {/* Section header */}
        <div className="max-w-2xl reveal">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">How it works</p>
          <div className="line-reveal mt-3 w-16" />
          <h2 className="mt-4 text-balance text-4xl font-bold tracking-[-0.025em] text-foreground sm:text-5xl">
            Less friction. More reviews.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            The biggest reason customers don&apos;t leave reviews is that it feels like work. ReviewOS removes
            every point of friction without ever crossing a compliance line.
          </p>
        </div>

        {/* Sticky card stack (Apple-style) — responsive */}
        <div className="mt-14 md:mt-24 lg:mt-36">
          <div className="sticky-stack">
            {STEPS.map((step, i) => (
              <div key={step.title} className="sticky-card">
                <div className="sticky-card-content">
                  <div
                    className={`stack-card-inner relative rounded-xl sm:rounded-2xl border border-border/60 bg-card p-5 sm:p-6 lg:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_30px_rgba(0,0,0,0.06)] border-l-3 sm:border-l-4 ${step.color}`}
                  >
                    <div className={`pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br ${step.cardBgGrad}`} aria-hidden="true" />
                    <div className="relative z-10 flex items-start gap-4 sm:gap-6">
                      <div className={`flex size-11 sm:size-12 lg:size-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl ${step.iconBg} ${step.iconColor}`}>
                        <step.icon className="size-5 sm:size-6 lg:size-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                            Step {i + 1}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground">{step.title}</h3>
                        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-muted-foreground">
                          {step.body}
                        </p>
                      </div>
                      <div className="hidden shrink-0 lg:flex lg:items-center lg:justify-center">
                        <div className="flex size-16 items-center justify-center rounded-full border border-border/40 bg-muted/30 text-2xl font-bold text-primary/40">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="reveal mt-20">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="group rounded-2xl border border-border/60 bg-card p-7 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.08)]"
              >
                <stat.icon className="mx-auto size-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                <div className="mt-3 text-3xl font-bold tracking-tight text-foreground tabular-nums">
                  {stat.prefix || ""}
                  <span className="counter-value" data-target={stat.value} data-suffix={stat.suffix}>
                    0{stat.suffix}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground/80">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
