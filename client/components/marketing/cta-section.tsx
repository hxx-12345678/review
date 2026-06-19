import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaSection() {
  return (
    <section className="border-t border-border/60 bg-secondary/30">
      <div className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Start collecting authentic reviews this week
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
          Set up your QR code in minutes. No fake reviews, no gating, no risk to your Google profile — just more of
          the real reviews you&apos;ve earned.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button render={<Link href="/signup" />} nativeButton={false} size="lg" className="group">
            Get started free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button render={<Link href="/pricing" />} nativeButton={false} size="lg" variant="outline">
            View pricing
          </Button>
        </div>
      </div>
    </section>
  )
}
