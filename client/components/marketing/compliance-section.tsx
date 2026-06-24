import { ShieldCheck, XCircle, CheckCircle2, AlertTriangle, Scale, Eye } from "lucide-react"
import { COMPLIANCE_RULES } from "@/lib/compliance"

export function ComplianceSection() {
  return (
    <section id="compliance" className="relative overflow-hidden bg-gradient-to-b from-background via-muted/10 to-background">
      {/* Colored backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/2 right-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gradient-to-l from-primary/[0.04] to-transparent blur-[140px]" />
        <div className="absolute top-0 left-0 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-rose-500/[0.03] to-transparent blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-28 sm:px-6">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          {/* Left */}
          <div className="reveal-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground/80 shadow-sm">
              <ShieldCheck className="size-3.5 text-primary" />
              Built to protect your business
            </div>

            <h2 className="mt-5 text-balance text-4xl font-bold tracking-[-0.025em] text-foreground sm:text-5xl">
              Compliant with Google & FTC rules
            </h2>

            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Google removes AI-generated reviews, and the FTC&apos;s rule makes fake reviews
              illegal — penalties over $50,000 per violation. ReviewOS keeps your profile safe.
            </p>

            {/* Comparison Cards */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Comparison
                negative
                title="What other tools do"
                items={[
                  "Auto-write reviews to copy-paste",
                  "Hide unhappy customers (gating)",
                  "Templated, generic 5-star text",
                ]}
              />
              <Comparison
                title="What ReviewOS does"
                items={[
                  "AI gives reminders only",
                  "Same link for every customer",
                  "Specific, authentic, in their words",
                ]}
              />
            </div>

            {/* Risk Banner */}
            <div className="mt-6 rounded-2xl border border-destructive/20 border-l-4 border-l-destructive bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.05)]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-bold text-foreground">FTC penalties up to $50,120 per fake review</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    The 2024 rule specifically targets AI-generated content and review gating.
                    Compliance is not optional.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Rules */}
          <div className="space-y-4 stagger-children">
            {COMPLIANCE_RULES.map((rule) => (
              <div
                key={rule.id}
                className="reveal tilt-card spotlight group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.08)] border-l-3 border-l-primary/40"
                data-tilt="4"
                data-tilt-scale="1.003"
              >
                <div className="tilt-shine" />

                <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />

                <div className="relative z-10 flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{rule.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{rule.body}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Trust Badges */}
            <div className="reveal mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.05)]">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: ShieldCheck, label: "Google Policy" },
                  { icon: Scale, label: "FTC Compliant" },
                  { icon: Eye, label: "Transparent" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-2 text-center">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-xs font-bold text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Comparison({
  title,
  items,
  negative,
}: {
  title: string
  items: string[]
  negative?: boolean
}) {
  const Icon = negative ? XCircle : CheckCircle2
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.05)] ${negative ? "border-l-3 border-l-destructive/40" : "border-l-3 border-l-primary/40"}`}>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Icon className={`mt-0.5 size-4 shrink-0 ${negative ? "text-destructive" : "text-primary"}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
