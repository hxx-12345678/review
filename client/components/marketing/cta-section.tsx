import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Full gradient background */}
      <div className="absolute inset-0 gradient-bg-animated noise" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-32 text-center sm:px-6">
        {/* Subtle decorative line */}
        <div className="mx-auto mb-10 h-px w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />

        <h2 className="text-balance text-4xl font-bold tracking-[-0.025em] text-white sm:text-5xl lg:text-6xl">
          Start collecting{" "}
          <span className="text-gradient">authentic</span>{" "}
          reviews this week
        </h2>

        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-white/70">
          Set up your QR code in minutes. No fake reviews, no gating, no risk to your Google profile — just more of
          the real reviews you&apos;ve earned.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <div className="magnetic-wrap">
            <Button
              render={<Link href="/signup" />}
              nativeButton={false}
              size="lg"
              className="btn-3d magnetic-child group rounded-xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground squishy"
            >
              Get started free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
          <div className="magnetic-wrap">
            <Button
              render={<Link href="/pricing" />}
              nativeButton={false}
              size="lg"
              variant="outline"
              className="magnetic-child rounded-xl border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white squishy hover:bg-white/15"
            >
              View pricing
            </Button>
          </div>
        </div>

        {/* Trust signal */}
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-white/60">
          <span>No credit card required</span>
          <span className="mx-2 text-white/20">·</span>
          <span>Set up in minutes</span>
        </div>
      </div>
    </section>
  )
}
