const VERTICALS = [
  "Restaurants & Cafes",
  "Dental & Clinics",
  "Salons & Spas",
  "Gyms & Fitness",
  "Hotels & Homestays",
  "Auto Workshops",
  "Retail Stores",
  "Home Services",
]

function BusinessCard({ name }: { name: string }) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border/50 bg-card/80 px-5 py-3 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
        {name.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground whitespace-nowrap">{name}</p>
        <p className="text-xs text-muted-foreground">High walk-in vertical</p>
      </div>
    </div>
  )
}

export function SocialProof() {
  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-gradient-to-b from-background via-muted/30 to-background py-5">
      {/* Heading */}
      <div className="text-center reveal px-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Purpose-built for high walk-in local businesses
        </p>
        <p className="mx-auto mt-1 max-w-xl text-[11px] text-muted-foreground/70">
          Illustrative verticals — publish verified Indian case studies here (rating before/after, reviews/month, conversion).
        </p>
      </div>

      {/* Marquee */}
      <div className="mt-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_2%,black_98%,transparent_100%)]">
        <div className="marquee-track flex gap-3">
          {[...VERTICALS, ...VERTICALS, ...VERTICALS].map((name, i) => (
            <BusinessCard key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  )
}
