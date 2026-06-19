import { QrCode, MessageSquareText, Sparkles, Star } from "lucide-react"

const STEPS = [
  {
    icon: QrCode,
    title: "Customer scans your QR code",
    body: "Place it at the front desk, on receipts, or send via text. One tap opens a fast, mobile-first flow.",
  },
  {
    icon: Star,
    title: "They rate their experience",
    body: "Every customer sees the same path. No gating — happy or unhappy, everyone can post a public review.",
  },
  {
    icon: MessageSquareText,
    title: "They share a few details",
    body: "A couple of quick questions surface the specifics worth mentioning, in the customer's own words.",
  },
  {
    icon: Sparkles,
    title: "AI gives them talking points",
    body: "Not a written review — just personal reminders that make it easy to write something authentic on Google.",
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-border/60 bg-secondary/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">How it works</p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Less friction for customers. More reviews for you.
          </h2>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            The biggest reason customers don&apos;t leave reviews is that it feels like work. ReviewOS removes
            every point of friction without ever crossing a compliance line.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-border bg-card p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <step.icon className="size-5" />
              </div>
              <div className="mt-4 text-xs font-semibold text-muted-foreground">STEP {i + 1}</div>
              <h3 className="mt-1 font-medium text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
