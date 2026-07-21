import Link from "next/link"
import { ArrowRight, Star, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InstallPWA } from "@/components/install-pwa"

export function CtaSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Full gradient background */}
      <div className="absolute inset-0 gradient-bg-animated noise" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-32 text-center sm:px-6">
        {/* Subtle decorative line */}
        <div className="mx-auto mb-10 h-px w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/80 backdrop-blur-sm">
          <Star className="size-3.5 fill-amber-300 text-amber-300" />
          <span>Trusted by 2,000+ businesses</span>
          <span className="text-white/40">·</span>
          <span>Google & FTC compliant</span>
        </div>

        <h2 className="text-balance text-4xl font-bold tracking-[-0.025em] text-white sm:text-5xl lg:text-6xl">
          Start turning happy customers{" "}
          <span className="text-gradient">into your best</span>{" "}
          salespeople
        </h2>

        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-white/70">
          Set up your QR code in 2 minutes. Collect authentic reviews automatically. Get AI-powered sentiment
          analysis and weekly WhatsApp reports — all while staying fully Google & FTC compliant.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <div className="magnetic-wrap">
            <Button
              render={<Link href="/signup" />}
              nativeButton={false}
              size="lg"
              className="btn-3d magnetic-child group rounded-xl bg-primary px-10 py-4 text-sm font-bold text-primary-foreground squishy"
            >
              Start free — no credit card
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
          <InstallPWA variant="cta" />
        </div>

        {/* Trust signals */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            Set up in 2 minutes
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            Cancel anytime
          </span>
        </div>
      </div>
    </section>
  )
}
