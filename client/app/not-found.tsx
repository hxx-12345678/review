import Link from "next/link"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { JsonLd } from "@/components/json-ld"

export default function NotFound() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-24 text-center">
        <h1 className="text-7xl font-bold tracking-tight text-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Page not found. The link may be broken or the page may have moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to home
        </Link>
      </main>
      <MarketingFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "404 — Page Not Found | BEYONDVYU",
          url: "https://beyondvyu.com/404",
          description: "The requested page could not be found on BEYONDVYU.",
        }}
      />
    </div>
  )
}
