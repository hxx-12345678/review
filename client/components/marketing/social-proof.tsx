const VERTICALS = [
  { name: "Restaurants & Cafes", detail: "QR at billing", initial: "R" },
  { name: "Dental & Clinics", detail: "Front-desk follow-up", initial: "D" },
  { name: "Salons & Spas", detail: "Chair-side QR", initial: "S" },
  { name: "Gyms & Fitness", detail: "Check-in prompt", initial: "G" },
  { name: "Hotels & Homestays", detail: "Checkout QR", initial: "H" },
  { name: "Auto Workshops", detail: "Service-desk QR", initial: "A" },
  { name: "Retail Stores", detail: "Counter QR", initial: "R" },
  { name: "Home Services", detail: "Job-completion link", initial: "H" },
]

function BusinessCard({ name, detail, initial }: { name: string; detail: string; initial: string }) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border/50 bg-card/80 px-5 py-3 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
        {initial}
      </div>
      <div>
        <p className="whitespace-nowrap text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

export function SocialProof() {
  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-gradient-to-b from-background via-muted/30 to-background py-6">
      {/* Heading */}
      <div className="reveal px-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Built for high walk-in local businesses
        </p>
        <p className="mx-auto mt-1 max-w-2xl text-[11px] text-muted-foreground/70">
          Restaurants first — the same feedback → fix → proof loop works for clinics, salons, gyms, hotels and more.
        </p>
      </div>

      {/* Marquee */}
      <div className="mt-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_2%,black_98%,transparent_100%)]">
        <div className="marquee-track flex gap-3">
          {[...VERTICALS, ...VERTICALS, ...VERTICALS].map((item, i) => (
            <BusinessCard key={`${item.name}-${i}`} {...item} />
          ))}
        </div>
      </div>
    </section>
  )
}
