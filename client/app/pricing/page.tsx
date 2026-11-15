import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { JsonLd } from "@/components/json-ld"
import { PricingTable, Currency } from "./pricing-table"

// ─── Geo-detect currency from Cloudflare / Vercel headers (server-side default) ───

async function detectCurrency(): Promise<Currency> {
  try {
    const { headers } = await import("next/headers");
    const hdrs = await headers();
    const country = (
      hdrs.get("cf-ipcountry") ||
      hdrs.get("x-vercel-ip-country") ||
      hdrs.get("x-country") ||
      ""
    ).toUpperCase();
    // Default to USD for US and all global visitors.
    // Only show INR if explicitly identified as visiting from India.
    return country === "IN" ? "INR" : "USD";
  } catch {
    return "USD";
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

      {/* Breadcrumb Schema */}
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

      {/* Product & Pricing Offers Schema (AEO / GEO / Google Rich Snippets) */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: "BEYONDVYU Review Management Platform",
          description: "Compliant customer feedback and Google review collection platform with AI-assisted drafting, multi-industry questions, and zero gating.",
          brand: {
            "@type": "Brand",
            name: "BEYONDVYU",
          },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: "0",
            highPrice: "249",
            offerCount: "5",
            offers: [
              {
                "@type": "Offer",
                name: "Free Plan",
                price: "0",
                priceCurrency: "USD",
                description: "1 location, 30 AI credits/mo, QR code and direct review link",
              },
              {
                "@type": "Offer",
                name: "Starter Plan (US)",
                price: "29",
                priceCurrency: "USD",
                description: "1 location, 300 AI credits/mo, AI reply drafting, review insights",
              },
              {
                "@type": "Offer",
                name: "Growth Plan (US)",
                price: "59",
                priceCurrency: "USD",
                description: "Up to 3 locations, 1,500 AI credits/mo, Google Business Profile sync",
              },
              {
                "@type": "Offer",
                name: "Pro Plan (US)",
                price: "99",
                priceCurrency: "USD",
                description: "Up to 10 locations, 5,000 AI credits/mo, Multi-Unit Command Center",
              },
              {
                "@type": "Offer",
                name: "Restaurant Group Plan (US)",
                price: "249",
                priceCurrency: "USD",
                description: "Up to 25 locations, 20,000 AI credits/mo, SLA alerts, table attribution",
              },
            ],
          },
        }}
      />
    </div>
  );
}
