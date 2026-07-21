import Link from "next/link"
import { Logo } from "@/components/logo"

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border/30">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The compliant way to grow authentic Google reviews for local businesses.
            </p>
          </div>

          {/* Link columns */}
          <FooterCol
            title="Product"
            links={[
              { label: "How it works", href: "/#how" },
              { label: "Contact", href: "/contact" },
              { label: "Dashboard", href: "/dashboard" },
            ]}
          />
          <FooterCol
            title="Trust & Compliance"
            links={[
              { label: "Privacy policy", href: "/privacy" },
              { label: "Cookie preferences", href: "#", onClick: () => window.dispatchEvent(new CustomEvent("beyondvyu:open-cookie-preferences")) },
              { label: "Terms of service", href: "/terms" },
              { label: "Refund policy", href: "/refund" },
              { label: "Compliance", href: "/#compliance" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "Contact us", href: "/contact" },
              { label: "Get started", href: "/signup" },
              { label: "Log in", href: "/login" },
            ]}
          />
        </div>

        <div className="mt-12 border-t border-border/30 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              {"\u00A9"} {new Date().getFullYear()} BEYONDVYU. BEYONDVYU never writes reviews on your behalf. Reviews are
              always written by your customers in their own words.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                Terms
              </Link>
              <Link href="/refund" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                Refunds
              </Link>
              <Link href="/contact" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: ({ label: string; href?: string; onClick?: () => void })[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.href ? (
              <Link
                href={l.href}
                className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {l.label}
              </Link>
            ) : (
              <button
                onClick={l.onClick}
                className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {l.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
