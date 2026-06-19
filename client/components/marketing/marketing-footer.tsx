import Link from "next/link"
import { Logo } from "@/components/logo"

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The compliant way to grow authentic Google reviews for local businesses.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterCol
              title="Product"
              links={[
                { label: "How it works", href: "/#how" },
                { label: "Pricing", href: "/pricing" },
                { label: "Live demo", href: "/r/brightsmile" },
              ]}
            />
            <FooterCol
              title="Trust"
              links={[
                { label: "Compliance", href: "/#compliance" },
                { label: "Google policy", href: "/#compliance" },
                { label: "FTC rule", href: "/#compliance" },
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Get started", href: "/signup" },
                { label: "Privacy policy", href: "/privacy" },
              ]}
            />
          </div>
        </div>
        <div className="mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <p>
            {"\u00A9"} {new Date().getFullYear()} ReviewOS. ReviewOS never writes reviews on your behalf. Reviews are
            always written by your customers in their own words.
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
