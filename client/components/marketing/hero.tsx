import Link from "next/link"
import { ArrowRight, ShieldCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden gradient-bg-animated noise">
      {/* Subtle grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Single subtle glow orb */}
      <div
        className="pointer-events-none absolute top-1/3 -left-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-28 pb-20 sm:px-6 sm:pt-36 lg:pt-40">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* Left: Copy */}
          <div className="reveal">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/80 backdrop-blur-sm shadow-sm">
              <ShieldCheck className="size-3.5 text-primary" />
              Google & FTC compliant by design
            </div>

            <h1 className="mt-7 text-balance text-[2.75rem] font-bold leading-[1.03] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.25rem]">
              Turn reviews into{" "}
              <span className="text-gradient">business</span>{" "}
              insights
            </h1>

            <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
              BEYONDVYU turns every customer review into actionable business intelligence. Collect authentic Google
              reviews, analyze sentiment, track trends, and get AI-powered insights delivered to your WhatsApp weekly.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="magnetic-wrap">
                <Button
                  render={<Link href="/signup" />}
                  nativeButton={false}
                  size="lg"
                  className="btn-3d magnetic-child group rounded-xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground squishy"
                >
                  Get started
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

            </div>
          </div>

          {/* Right: Hero Visual */}
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

      {/* 3D Tilt Card */}
      <div
        className="tilt-card relative rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl"
        data-tilt="10"
        data-tilt-scale="1.01"
      >
        <div className="tilt-shine" />

        {/* Card header */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Star className="size-5 fill-current" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Brightsmile Dental</p>
                <p className="text-xs text-white/60">Step 2 of 3 · Your visit</p>
              </div>
            </div>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-primary-foreground">
              <Star className="mr-1 inline size-3 fill-accent text-accent" />
              AI helper
            </span>
          </div>

          {/* Talking points */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-white/50">
              A few reminders for your review
            </p>
            <ul className="mt-4 space-y-3">
              {[
                "You mentioned Dr. Lee explained the crown clearly",
                "Priya the hygienist was gentle",
                "You were in and out in 40 minutes",
              ].map((text) => (
                <li key={text} className="flex items-start gap-3 text-sm text-white/80">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-xs text-white/50">
            These are reminders — you write the review in your own words.
          </p>

          <div className="mt-5 w-full rounded-xl bg-white/10 py-3 text-center text-sm font-bold text-white/80 border border-white/10 transition-all duration-200 hover:bg-white/20 hover:text-white cursor-pointer">
            Write my review on Google
          </div>
        </div>
      </div>
    </div>
  )
}
