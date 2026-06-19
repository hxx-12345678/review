import { ShieldCheck, XCircle, CheckCircle2 } from "lucide-react"
import { COMPLIANCE_RULES } from "@/lib/compliance"

export function ComplianceSection() {
  return (
    <section id="compliance" className="border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              Built to protect your business
            </div>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Compliant with Google policy and the FTC rule
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Google removes AI-generated and templated reviews, and the FTC&apos;s 2024 rule makes fake reviews
              illegal — with penalties over $50,000 per violation. ReviewOS is engineered so the reviews you collect
              are always authentic and customer-written, keeping your profile safe.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="space-y-4">
            {COMPLIANCE_RULES.map((rule) => (
              <div key={rule.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-medium text-foreground">{rule.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{rule.body}</p>
                  </div>
                </div>
              </div>
            ))}
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
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Icon className={`mt-0.5 size-4 shrink-0 ${negative ? "text-destructive" : "text-primary"}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
