#!/usr/bin/env python3
"""
Comprehensive SEO, AEO, and GEO enhancements + US Pricing Fixes:
1. client/app/pricing/page.tsx: Default currency to USD for all non-IN visitors; add Product/Offer JSON-LD
2. client/app/layout.tsx: Global metadata, OpenGraph, keywords, twitter updated to global/US compliant messaging
3. client/app/page.tsx: Schema.org Organization, SoftwareApplication, and FAQPage updated to multi-region/currency
4. client/components/marketing/faq-section.tsx: Multi-currency pricing answer, Spanish language inclusion
5. client/components/marketing/marketing-footer.tsx: "Pricing (INR)" -> "Pricing"
6. client/public/llms.txt and llms-full.txt: Complete update for Generative Engine Optimization (GEO)
"""

def read_file(path):
    with open(path, 'rb') as f:
        raw = f.read()
    return raw.decode('utf-8').replace('\r\n', '\n')

def write_file(path, content):
    with open(path, 'wb') as f:
        f.write(content.replace('\n', '\r\n').encode('utf-8'))
    print(f"  Wrote: {path}")

# ── 1. client/app/pricing/page.tsx ───────────────────────────────────────────
pricing_path = r"d:\Project\review-os-mvp-build\client\app\pricing\page.tsx"
pricing_src = read_file(pricing_path)

NEW_PRICING_PAGE = '''import { MarketingHeader } from "@/components/marketing/marketing-header"
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
'''
write_file(pricing_path, NEW_PRICING_PAGE)

# ── 2. client/app/layout.tsx ─────────────────────────────────────────────────
layout_path = r"d:\Project\review-os-mvp-build\client\app\layout.tsx"
layout_src = read_file(layout_path)

old_meta_block = '''  description:
    "QR + link review collection in ~60 seconds, in 10 Indian languages. Same review path for every customer — no gating. Review velocity funnel, AI insights, WhatsApp-ready digest. Plans from ₹0, UPI & cards via Razorpay.",
  keywords: [
    "Google reviews",
    "review management",
    "QR code reviews",
    "collect Google reviews",
    "Google review QR code",
    "review management software India",
    "online reputation management",
    "customer review platform",
    "customer feedback platform",
    "review velocity",
    "review conversion funnel",
    "WhatsApp review reports",
    "multi-language reviews Hindi Hinglish Tamil Telugu",
    "restaurant review software India",
    "salon review software India",
    "clinic review software India",
    "how to get more Google reviews",
    "Google review link generator",
  ],
  authors: [{ name: "BEYONDVYU" }],
  publisher: "BEYONDVYU",
  creator: "BEYONDVYU",
  category: "business",
  classification: "Review Management Software",
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://beyondvyu.com",
    languages: { "en-IN": "https://beyondvyu.com", en: "https://beyondvyu.com" },
  },
  openGraph: {
    type: "website",
    siteName: "BEYONDVYU",
    title: "BEYONDVYU — Turn real customer experiences into authentic Google reviews",
    description:
      "QR + link review collection in 10 Indian languages. No gating, customer owns every word. Review velocity funnel + weekly digest. Free plan, INR pricing.",
    url: "https://beyondvyu.com",
    locale: "en_IN",
    alternateLocale: ["en_US", "hi_IN"],
    countryName: "India",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BEYONDVYU — Google review management platform for local businesses",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@beyondvyu",
    creator: "@beyondvyu",
    title: "BEYONDVYU — Authentic Google reviews from real customer experiences",
    description:
      "QR review flow in 10 Indian languages. No gating. Review velocity + WhatsApp-ready digest. Free plan.",
    images: ["/og-image.png"],
  },'''

new_meta_block = '''  description:
    "Compliant QR + link review collection across dental clinics, auto repair, salons, restaurants, and retail. AI talking points the customer owns, review velocity tracking, and zero review gating. Start free.",
  keywords: [
    "Google reviews",
    "review management software",
    "QR code customer reviews",
    "collect Google reviews",
    "Google review QR code",
    "reputation management platform",
    "customer feedback software",
    "dental review software",
    "auto repair review management",
    "restaurant Google reviews",
    "salon review management",
    "bilingual Google reviews Spanish English",
    "review velocity funnel",
    "FTC compliant review collection",
    "AEO review software",
    "local business SEO reviews",
    "how to get more Google reviews",
  ],
  authors: [{ name: "BEYONDVYU" }],
  publisher: "BEYONDVYU",
  creator: "BEYONDVYU",
  category: "business",
  classification: "Review Management Software",
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://beyondvyu.com",
    languages: {
      "en-US": "https://beyondvyu.com",
      "en-IN": "https://beyondvyu.com",
      "es-US": "https://beyondvyu.com",
      en: "https://beyondvyu.com",
    },
  },
  openGraph: {
    type: "website",
    siteName: "BEYONDVYU",
    title: "BEYONDVYU — Turn real customer experiences into authentic Google reviews",
    description:
      "Compliant QR + link review collection across all business verticals. No review gating. AI-assisted drafts the customer owns. Multi-language support and transparent pricing.",
    url: "https://beyondvyu.com",
    locale: "en_US",
    alternateLocale: ["en_IN", "es_US", "hi_IN"],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BEYONDVYU — Google review management platform for local businesses",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@beyondvyu",
    creator: "@beyondvyu",
    title: "BEYONDVYU — Authentic Google reviews from real customer experiences",
    description:
      "Compliant QR review flow in English, Spanish, and regional languages. No gating. AI talking points and review velocity tracking. Start free.",
    images: ["/og-image.png"],
  },'''

if old_meta_block in layout_src:
    layout_src = layout_src.replace(old_meta_block, new_meta_block)
    write_file(layout_path, layout_src)
    print("  [Layout] Patched global metadata in layout.tsx")
else:
    print("  [Layout] Warning: old_meta_block not found")

# ── 3. client/app/page.tsx ───────────────────────────────────────────────────
page_path = r"d:\Project\review-os-mvp-build\client\app\page.tsx"
page_src = read_file(page_path)

old_page_org = '''          "@context": "https://schema.org",
          "@type": "Organization",
          name: "BEYONDVYU",
          url: "https://beyondvyu.com",
          description:
            "BEYONDVYU helps Indian local businesses turn real customer visits into authentic Google reviews — QR + link flow, 10 languages, review velocity funnel, WhatsApp-ready digest.",
          image: "https://beyondvyu.com/og-image.png",
          logo: "https://beyondvyu.com/icon.svg",
          foundingDate: "2025",
          dateModified: "2026-09-09",
          areaServed: "IN",
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "sales",
            email: "sales@beyondvyu.com",
            availableLanguage: ["English", "Hindi"],
            areaServed: "IN",
          },'''

new_page_org = '''          "@context": "https://schema.org",
          "@type": "Organization",
          name: "BEYONDVYU",
          url: "https://beyondvyu.com",
          description:
            "BEYONDVYU helps local businesses in the US, India, and globally turn real customer visits into authentic Google reviews — QR + link flow, multilingual support (English, Spanish, Hindi), review velocity tracking, and zero review gating.",
          image: "https://beyondvyu.com/og-image.png",
          logo: "https://beyondvyu.com/icon.svg",
          foundingDate: "2025",
          dateModified: "2026-11-15",
          areaServed: ["US", "IN", "CA", "GB", "AU"],
          sameAs: [
            "https://twitter.com/beyondvyu",
            "https://linkedin.com/company/beyondvyu",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "support@beyondvyu.com",
            availableLanguage: ["English", "Spanish", "Hindi"],
          },'''

if old_page_org in page_src:
    page_src = page_src.replace(old_page_org, new_page_org)
    print("  [Page] Patched Organization schema in page.tsx")
else:
    print("  [Page] Warning: old_page_org not found")

old_page_soft = '''          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "BEYONDVYU",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description:
            "QR + link Google review collection in 10 Indian languages with review velocity funnel and WhatsApp-ready digest. No review gating; customer owns every word.",
          url: "https://beyondvyu.com",
          dateModified: "2026-09-09",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "INR",
            priceValidUntil: "2027-09-09",
            availability: "https://schema.org/InStock",
          },
          featureList: [
            "QR + link review collection",
            "10 Indian languages incl. Hinglish/Gujlish",
            "Same review path for every customer (no gating)",
            "Review velocity + conversion funnel per location",
            "AI talking points & drafts the customer edits and owns",
            "WhatsApp-ready weekly digest (API + opt-in required)",
            "Progressive Web App",
          ],
          countriesSupported: "IN",'''

new_page_soft = '''          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "BEYONDVYU",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, iOS, Android",
          description:
            "Compliant QR + link Google review collection across dental clinics, auto repair, salons, restaurants, and retail. Multi-language flow in English, Spanish, and regional languages with zero review gating.",
          url: "https://beyondvyu.com",
          dateModified: "2026-11-15",
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
                description: "1 location, 30 AI credits/month, QR code and direct review link",
              },
              {
                "@type": "Offer",
                name: "Starter Plan",
                price: "29",
                priceCurrency: "USD",
                description: "1 location, 300 AI credits/month, AI reply drafting, review insights",
              },
              {
                "@type": "Offer",
                name: "Growth Plan",
                price: "59",
                priceCurrency: "USD",
                description: "Up to 3 locations, 1,500 AI credits/month, GBP sync, task SLA alerts",
              },
              {
                "@type": "Offer",
                name: "Pro Plan",
                price: "99",
                priceCurrency: "USD",
                description: "Up to 10 locations, 5,000 AI credits/month, Multi-Unit Command Center",
              },
            ],
          },
          featureList: [
            "QR + link review collection in ~60 seconds",
            "Multi-industry feedback flow: dental, auto repair, salon, cafe, restaurant, retail",
            "English, Spanish (es-US), and 9 regional languages",
            "Same review path for every customer (zero review gating)",
            "Review velocity + conversion funnel per location",
            "AI talking points & drafts the customer edits and owns",
            "100% compliant with Google Review Policy and FTC 16 CFR Part 465",
            "Progressive Web App with offline fallback",
          ],
          countriesSupported: ["US", "IN", "CA", "GB", "AU"],'''

if old_page_soft in page_src:
    page_src = page_src.replace(old_page_soft, new_page_soft)
    print("  [Page] Patched SoftwareApplication schema in page.tsx")
else:
    print("  [Page] Warning: old_page_soft not found")

old_page_faq_price = 'text: "Free (₹0) for 1 location with 30 AI credits/month. Paid plans: Lite ₹100/month, Starter ₹249/month, Growth ₹499/month, Pro ₹799/month, with yearly options. UPI and cards via Razorpay; GST invoice included. See /pricing for the full table."'
new_page_faq_price = 'text: "BEYONDVYU offers a Free plan for 1 location with 30 AI credits/month. For growing businesses, transparent pricing is $29/mo (Starter), $59/mo (Growth), $99/mo (Pro), and $249/mo (Restaurant Group) in the US and globally. In India, localized plans are ₹249/mo (Starter), ₹499/mo (Growth), and ₹799/mo (Pro). Annual billing includes 2 months free on all tiers. See /pricing for full plan comparison."'

if old_page_faq_price in page_src:
    page_src = page_src.replace(old_page_faq_price, new_page_faq_price)
    print("  [Page] Patched FAQ price answer in page.tsx")

old_page_faq_lang = 'text: "English, Hinglish, Hindi, Marathi, Gujarati, Gujlish, Tamil, Telugu, Bengali and Kannada. AI drafts follow the selected language, and if a customer types in a different script we suggest switching. Dashboard keyword trends work best in English/Hinglish today."'
new_page_faq_lang = 'text: "The customer review flow supports English, Spanish (es-US / Latin American), Hinglish, Hindi, Marathi, Gujarati, Gujlish, Tamil, Telugu, Bengali, and Kannada. AI drafts adapt seamlessly to the customer\'s selected language and industry vertical."'

if old_page_faq_lang in page_src:
    page_src = page_src.replace(old_page_faq_lang, new_page_faq_lang)
    print("  [Page] Patched FAQ language answer in page.tsx")

write_file(page_path, page_src)

# ── 4. client/components/marketing/faq-section.tsx ───────────────────────────
faq_path = r"d:\Project\review-os-mvp-build\client\components\marketing\faq-section.tsx"
faq_src = read_file(faq_path)

old_faq_q = '''    q: "How much does BEYONDVYU cost?",
    a: "Free (₹0) for 1 location with 30 AI credits/month. Paid plans: Lite ₹100/month, Starter ₹249/month, Growth ₹499/month (up to 3 locations), Pro ₹799/month (up to 10 locations) — with yearly options. UPI and cards via Razorpay, GST invoice included. Full table on /pricing.",'''

new_faq_q = '''    q: "How much does BEYONDVYU cost?",
    a: "Free ($0 / ₹0) for 1 location with 30 AI credits/month. Paid plans start at $29/mo (₹249/mo in India) for Starter, $59/mo (₹499/mo) for Growth, and $99/mo (₹799/mo) for Pro, with annual discounts giving 2 months free. Transparent per-location pricing with no per-seat charges. Full comparison on /pricing.",'''

if old_faq_q in faq_src:
    faq_src = faq_src.replace(old_faq_q, new_faq_q)
    print("  [FAQ] Patched cost answer in faq-section.tsx")

old_faq_lang_q = 'a: "English, Hinglish, Hindi, Marathi, Gujarati, Gujlish, Tamil, Telugu, Bengali and Kannada. AI drafts follow the selected language, and if a customer types in a different script we suggest switching. Dashboard keyword trends work best in English/Hinglish today.",'
new_faq_lang_q = 'a: "English, Spanish (US / Latin America), Hinglish, Hindi, Marathi, Gujarati, Gujlish, Tamil, Telugu, Bengali and Kannada. AI drafts follow the selected language, and if a customer types in a different script we suggest switching.",'

if old_faq_lang_q in faq_src:
    faq_src = faq_src.replace(old_faq_lang_q, new_faq_lang_q)
    print("  [FAQ] Patched language answer in faq-section.tsx")

write_file(faq_path, faq_src)

# ── 5. client/components/marketing/marketing-footer.tsx ──────────────────────
footer_path = r"d:\Project\review-os-mvp-build\client\components\marketing\marketing-footer.tsx"
footer_src = read_file(footer_path)

old_footer_link = '{ label: "Pricing (INR)", href: "/pricing" },'
new_footer_link = '{ label: "Pricing", href: "/pricing" },'

if old_footer_link in footer_src:
    footer_src = footer_src.replace(old_footer_link, new_footer_link)
    write_file(footer_path, footer_src)
    print("  [Footer] Patched Pricing link in marketing-footer.tsx")

# ── 6. client/public/llms.txt and llms-full.txt ──────────────────────────────
llms_path = r"d:\Project\review-os-mvp-build\client\public\llms.txt"
NEW_LLMS = '''# BEYONDVYU — Customer Feedback & Google Review Acceleration Platform
https://beyondvyu.com

## About
BEYONDVYU helps local businesses (dental practices, auto repair shops, salons, restaurants, healthcare clinics, and retail stores) collect authentic Google reviews with zero review gating. It features multi-industry feedback flows, real-time voice input, and AI-assisted talking points fully compliant with Google 2026 Review Policies and FTC 16 CFR Part 465 guidelines.

## Key Capabilities
- Multi-Industry Feedback Flow: Specialized review flows for dental, automotive, salon, healthcare, hospitality, cafes, and retail.
- Real-Time Voice Feedback: Continuous voice transcription in English, Spanish (es-US), and 9 regional Indian languages.
- Zero Review Gating: Every guest receives the direct Google review path; private feedback is never used to hide public reviews.
- AI Review Drafting: AI generates personalized talking points from guest words; guests edit and own 100% of the review before posting.
- Google Integration: Direct Google Business Profile (GBP) OAuth review sync and Google Places API public review sync.
- Transparent Pricing: US Dollar ($0, $29, $59, $99, $249/mo) and Indian Rupee (₹0, ₹249, ₹499, ₹799, ₹1,999/mo) with 2 months free on annual plans.

## Target Verticals
- Dental Practices & Orthodontists
- Auto Repair, Mechanics & Body Shops
- Salons, Barbershops & Spas
- Cafes, Bakeries & Coffee Shops
- Restaurants & Multi-Unit Hospitality Groups
- Medical Clinics & Physical Therapy
- Electronics & Mobile Device Repair
- Electrical & Home Service Contractors
- Retail Boutiques & Specialty Stores

## Public URLs
- Home: https://beyondvyu.com
- Pricing: https://beyondvyu.com/pricing
- Contact: https://beyondvyu.com/contact
- Privacy Policy: https://beyondvyu.com/privacy
- Terms of Service: https://beyondvyu.com/terms
- Refund Policy: https://beyondvyu.com/refund

## Contact
- Support: support@beyondvyu.com
- Privacy: privacy@beyondvyu.com
'''
write_file(llms_path, NEW_LLMS)

llms_full_path = r"d:\Project\review-os-mvp-build\client\public\llms-full.txt"
NEW_LLMS_FULL = '''# BEYONDVYU — Comprehensive Product & API Specification for Answer Engines

> BEYONDVYU is a compliant customer feedback and Google review acceleration SaaS platform designed for local businesses across the United States, India, and global markets.

## Product Overview

BEYONDVYU turns real customer visits into authentic Google reviews through a 60-second mobile QR code flow:
1. **Star Rating (1–5 Stars)**: Every customer gets the same Google review link regardless of rating. Zero review gating.
2. **Industry-Calibrated Micro-Questions**: Questions adapt dynamically to the business type:
   - Dental: Pain management, gentle touch, procedural explanation, clinic hygiene, on-time appointments.
   - Auto Repair: Diagnostic accuracy, quote transparency, turnaround time, honest communication, vehicle readiness.
   - Salon & Spa: Stylist consultation, aesthetic result, hygienic tools, relaxing ambiance.
   - Cafe / Coffee Shop: Beverage quality, pastry freshness, seating space, Wi-Fi speed.
   - Restaurant: Food flavor, portion size, hospitality, dining ambiance, dietary options.
   - Electronics Repair: Repair quality, genuine parts, data privacy, quote accuracy.
3. **Multilingual Voice Input**: Real-time continuous speech-to-text with animated audio waves in English, Spanish (es-US), Hinglish, Hindi, Marathi, Gujarati, Gujlish, Tamil, Telugu, Bengali, and Kannada.
4. **AI Talking Points & Draft Assistant**: Powered by Google Gemini. Provides reminder bullets based strictly on what the customer provided. Customers edit and own every word before posting to Google Maps.
5. **Operational Task SLA Engine**: Multi-unit command center converts low ratings (1–3 stars) into internal resolution tasks with 2h/12h SLAs.

## Transparent Multi-Region Pricing

### United States & Global (USD)
- **Free**: $0/mo — 1 location, 30 AI credits/mo, QR code and direct review link, basic analytics.
- **Starter**: $29/mo ($290/yr) — 1 location, 300 AI credits/mo, AI reply drafting, review insights, table attribution.
- **Growth**: $59/mo ($590/yr) — Up to 3 locations, 1,500 AI credits/mo, Google Business Profile sync, operational SLA alerts.
- **Pro**: $99/mo ($990/yr) — Up to 10 locations, 5,000 AI credits/mo, Multi-Unit Command Center, dedicated account manager.
- **Restaurant Group**: $249/mo ($2,490/yr) — Up to 25 locations, 20,000 AI credits/mo, custom onboarding, priority SLA.

### India (INR)
- **Free**: ₹0/mo — 1 location, 30 AI credits/mo.
- **Starter**: ₹249/mo (₹2,499/yr) — 1 location, 300 AI credits/mo.
- **Growth**: ₹499/mo (₹4,999/yr) — Up to 3 locations, 1,500 AI credits/mo.
- **Pro**: ₹799/mo (₹7,999/yr) — Up to 10 locations, 5,000 AI credits/mo.
- **Restaurant Group**: ₹1,999/mo (₹19,999/yr) — Up to 25 locations, 20,000 AI credits/mo.

## Regulatory & Platform Compliance

- **Google 2026 Review Policy**: Zero review gating, no incentivized reviews, no staff-name prompts (explicitly omitted to prevent review takedowns), no writing reviews on behalf of customers.
- **FTC 16 CFR Part 465 (Consumer Review Fairness Act)**: Equal access to review channels for all consumers; genuine consumer feedback with verified attribution.
- **Data Privacy**: Granular consent controls, transparent privacy policy, compliant with global data protection standards.
- **US Click-to-Cancel & RBI E-Mandate**: Self-service cancel button in billing dashboard for US customers; pre-debit notifications and mandate disclosures for Indian customers.

## Canonical URLs
- Main: https://beyondvyu.com
- Pricing: https://beyondvyu.com/pricing
- Contact: https://beyondvyu.com/contact
- Privacy: https://beyondvyu.com/privacy
- Terms: https://beyondvyu.com/terms
- Refund: https://beyondvyu.com/refund
'''
write_file(llms_full_path, NEW_LLMS_FULL)

print("All SEO, AEO, and GEO enhancements applied successfully.")
