import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Languages,
  Play,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReviewShowcase } from "@/components/marketing/review-showcase"

export function Hero() {
  return (
    <section className="relative overflow-hidden gradient-bg-animated noise">
      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Gradient orbs */}
      <div className="pointer-events-none absolute top-1/4 -left-32 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[150px]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-1/4 -right-32 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-teal-400/5 blur-[120px]" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-36 lg:pb-28 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 xl:gap-16">
          {/* Left: Copy */}
          <div className="reveal min-w-0">
            {/* Badge pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/80 backdrop-blur-sm">
              <ShieldCheck className="size-3.5 text-primary" />
              Feedback → fix → proof · Policy-first by design
            </div>

            {/* Outcome-driven headline */}
            <h1 className="speakable mt-7 text-balance text-[2.3rem] font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.15rem]">
              Turn real customer experiences{" "}
              <span className="text-gradient">into authentic Google reviews</span>
            </h1>

            {/* Pain-point subheadline */}
            <p className="speakable mt-6 w-full max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
              Collect honest feedback by QR, WhatsApp or link in <strong className="text-white">60 seconds</strong>.
              Fix what went wrong, see whether the fix held, and let every guest tell their story in their own words
              — in English, Hinglish, Hindi or a regional language.
            </p>

            {/* Three proof points */}
            <div className="mt-6 grid max-w-xl grid-cols-3 gap-2 sm:gap-2.5">
              {[
                { icon: QrCode, title: "60-second flow", sub: "QR, link or WhatsApp" },
                { icon: Languages, title: "10 languages", sub: "guest's own words" },
                { icon: ShieldCheck, title: "No gating", sub: "same path for everyone" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-2.5 py-2 backdrop-blur-sm sm:gap-2.5 sm:px-3 sm:py-2.5"
                >
                  <item.icon className="mt-0.5 size-3.5 shrink-0 text-primary sm:size-4" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold leading-tight text-white sm:text-xs">{item.title}</p>
                    <p className="mt-0.5 text-[9px] leading-tight text-white/45 sm:text-[10px]">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social proof strip */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/50">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                Restaurant-first, built for Indian local businesses
              </span>
              <span className="hidden h-3 w-px bg-white/15 sm:block" aria-hidden="true" />
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                Customer owns every word
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="magnetic-wrap">
                <Button
                  render={<Link href="/signup" />}
                  nativeButton={false}
                  size="lg"
                  className="btn-3d magnetic-child group rounded-xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground squishy"
                >
                  Start free — 2-minute setup
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              <Link
                href="#how"
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-sm font-semibold text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                  <Play className="size-2.5 fill-current" />
                </span>
                See how it works
              </Link>
            </div>

            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40">
              <span>Free plan · no credit card</span>
              <span aria-hidden="true">·</span>
              <span>UPI &amp; cards via Razorpay</span>
              <span aria-hidden="true">·</span>
              <span>DPDP controls</span>
            </p>
          </div>

          {/* Right: 3D review card */}
          <div className="relative min-w-0">
            <div className="mb-2 flex items-center justify-center gap-2 lg:justify-end">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                <BarChart3 className="size-3 text-primary/80" />
                What your guests see
              </span>
            </div>
            <ReviewShowcase />
          </div>
        </div>
      </div>
    </section>
  )
}
