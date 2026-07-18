const BUSINESSES = [
  "Brightsmile Dental",
  "Coastal Coffee Co.",
  "Maple Street Salon",
  "Riverside Fitness",
  "The Copper Plate",
  "Oakwood Veterinary",
  "Sage & Thyme Cafe",
  "Blue Ridge Auto",
]

function BusinessCard({ name }: { name: string }) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border/50 bg-card/80 px-5 py-3 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
        {name.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground whitespace-nowrap">{name}</p>
        <p className="text-xs text-muted-foreground">Local business</p>
      </div>
    </div>
  )
}

export function SocialProof() {
  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-gradient-to-b from-background via-muted/30 to-background py-8">
      {/* Heading */}
      <div className="text-center reveal px-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Built for local businesses
        </p>
      </div>

      {/* Marquee */}
      <div className="mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_4%,black_96%,transparent_100%)]">
        <div className="marquee-track flex gap-4">
          {[...BUSINESSES, ...BUSINESSES, ...BUSINESSES].map((name, i) => (
            <BusinessCard key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  )
}
