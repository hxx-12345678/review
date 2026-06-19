import Link from "next/link"
import { ArrowRight, ShieldCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              Google & FTC compliant by design
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Turn happy customers into authentic Google reviews
            </h1>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              ReviewOS makes it effortless for customers to leave real reviews. Our AI jogs their memory with
              personal talking points — it never writes the review for them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button render={<Link href="/signup" />} nativeButton={false} size="lg" className="group">
                Start collecting reviews
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button render={<Link href="/r/brightsmile" />} nativeButton={false} size="lg" variant="outline">
                Try the customer flow
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"].map((c, i) => (
                  <div
                    key={i}
                    className={`size-8 rounded-full border-2 border-background ${c}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-accent text-accent" />
                  ))}
                </div>
                <span className="ml-1">Trusted by 1,200+ local businesses</span>
              </div>
            </div>
          </div>

          <HeroVisual />
        </div>
      </div>
    </section>
  )
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/5" aria-hidden="true" />
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Star className="size-4 fill-current" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Brightsmile Dental</p>
              <p className="text-xs text-muted-foreground">Step 2 of 3 · Your visit</p>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">AI helper</span>
        </div>

        <div className="mt-4 rounded-xl bg-muted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            A few reminders for your review
          </p>
          <ul className="mt-3 space-y-2">
            {[
              "You mentioned Dr. Lee explained the crown clearly",
              "Priya the hygienist was gentle",
              "You were in and out in 40 minutes",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          These are reminders — you write the review in your own words.
        </p>

        <Button className="mt-4 w-full" size="sm">
          Write my review on Google
        </Button>
      </div>
    </div>
  )
}
