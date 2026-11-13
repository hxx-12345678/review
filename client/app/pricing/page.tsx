import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { JsonLd } from "@/components/json-ld"
import { PricingTable, Currency } from "./pricing-table"

// ─── Geo-detect currency from Cloudflare / Vercel headers (server-side default) ───

async function detectCurrency(): Promise<Currency> {
  try {
    const { headers } = await import("next/headers");
    const hdrs = await headers();
    const country =
      hdrs.get("cf-ipcountry") ||
      hdrs.get("x-vercel-ip-country") ||
      hdrs.get("x-country") ||
      "";
    return country.toUpperCase() === "US" ? "USD" : "INR";
  } catch {
    return "USD"; // Default to USD for global visitors
  }
}

export default async function PricingPage() {
  const currency = await detectCurrency();

  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 min-w-0 px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Transparent Pricing
          </p>
          <h1 className="speakable mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Simple pricing per location, not per seat
          </h1>
          <p className="speakable mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when review volume grows. Every plan includes zero review gating, direct Google review collection, and AI-assisted drafting.
          </p>
        </div>

        {/* Client-side pricing table with region selector pill & annual toggle */}
        <PricingTable defaultCurrency={currency} />
      </main>
      <MarketingFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://beyondvyu.com" },
            { "@type": "ListItem", position: 2, name: "Pricing", item: "https://beyondvyu.com/pricing" },
          ],
        }}
      />
    </div>
  );
}
