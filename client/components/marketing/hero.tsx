import Link from "next/link"
import { ArrowRight, Star, ShieldCheck, BarChart3, Users, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

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
      <div className="pointer-events-none absolute top-1/4 -left-32 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[150px]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-1/4 -right-32 h-[400px] w-[400px] rounded-full bg-violet-500/8 blur-[120px]" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-28 pb-20 sm:px-6 sm:pt-36 lg:pt-40">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* Left: Copy */}
          <div className="reveal">
            {/* Badge pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/80 backdrop-blur-sm">
              <ShieldCheck className="size-3.5 text-primary" />
              Google & FTC compliant by design
            </div>

            {/* Outcome-driven headline */}
            <h1 className="mt-7 text-balance text-[2.75rem] font-bold leading-[1.03] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.25rem]">
              Turn every happy customer{" "}
              <span className="text-gradient">into your best</span>{" "}
              salesperson
            </h1>

            {/* Pain-point subheadline */}
            <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
              Collect authentic Google reviews in <strong className="text-white">60 seconds</strong> — no code, no app
              install, no gating. AI-powered insights delivered to your WhatsApp weekly.
            </p>

            {/* Social proof strip */}
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="size-8 rounded-full border-2 border-white/20 bg-gradient-to-br from-primary/40 to-violet-500/40"
                  />
                ))}
              </div>
              <div className="text-sm text-white/60">
                <span className="font-bold text-white">2,000+</span> businesses using BEYONDVYU
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/50">
              <span className="flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-primary" />
                Google compliant
              </span>
              <span className="flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-primary" />
                FTC compliant
              </span>
              <span className="flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-primary" />
                94% completion rate
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="magnetic-wrap">
                <Button
                  render={<Link href="/signup" />}
                  nativeButton={false}
                  size="lg"
                  className="btn-3d magnetic-child group rounded-xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground squishy"
                >
                  Start your journey — zero commitment
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

            </div>
          </div>

          {/* Right: Bento Grid Visual */}
          <div className="hidden sm:block">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroVisual() {
  return (
    <div className="relative">
      {/* Glow behind */}
      <div className="absolute -inset-10 -z-10 rounded-3xl bg-primary/12 blur-3xl" aria-hidden="true" />

      {/* Bento grid container */}
      <div className="grid grid-cols-4 gap-3">
        {/* Main card: Review flow preview — spans 3 cols */}
        <div className="tilt-card col-span-3 row-span-2 rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl" data-tilt="8" data-tilt-scale="1.01">
          <div className="tilt-shine" />
          <div className="relative z-10">
            {/* Mini header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Star className="size-4 fill-current" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">BEYONDVYU</p>
                  <p className="text-[10px] text-white/50">Step 2 of 3</p>
                </div>
              </div>
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                <Star className="mr-0.5 inline size-2.5 fill-accent text-accent" />
                AI helper
              </span>
            </div>

            {/* Review talking points */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">A few reminders for your review</p>
              <ul className="mt-3 space-y-2">
                {["You mentioned Dr. Lee explained the crown clearly", "Priya the hygienist was gentle", "You were in and out in 40 minutes"].map((text) => (
                  <li key={text} className="flex items-start gap-2 text-xs text-white/80">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-primary/60" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-3 text-[10px] text-white/50">These are reminders — you write the review in your own words.</p>

            <div className="mt-4 w-full rounded-lg bg-white/10 py-2.5 text-center text-xs font-bold text-white/80 border border-white/10 transition-all duration-200 hover:bg-white/20 hover:text-white cursor-pointer">
              Write my review on Google
            </div>
          </div>
        </div>

        {/* Side card 1: Stats */}
        <div className="tilt-card col-span-1 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl flex flex-col items-center justify-center text-center" data-tilt="6" data-tilt-scale="1.01">
          <div className="tilt-shine" />
          <BarChart3 className="size-5 text-primary/80" />
          <p className="mt-2 text-xl font-bold text-white">3.2<span className="text-xs text-primary">×</span></p>
          <p className="text-[10px] text-white/50 leading-tight">more reviews<br />vs paper cards</p>
        </div>

        {/* Side card 2: Users */}
        <div className="tilt-card col-span-1 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl flex flex-col items-center justify-center text-center" data-tilt="6" data-tilt-scale="1.01">
          <div className="tilt-shine" />
          <Users className="size-5 text-primary/80" />
          <p className="mt-2 text-xl font-bold text-white">94<span className="text-xs text-primary">%</span></p>
          <p className="text-[10px] text-white/50 leading-tight">completion<br />rate</p>
        </div>

        {/* Bottom badge spanning full width */}
        <div className="col-span-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-center text-xs text-white/50">
          ⚡ No code · No app install · Works on any device · Fully compliant
        </div>
      </div>
    </div>
  )
}
