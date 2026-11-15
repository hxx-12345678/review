import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Hero } from "@/components/marketing/hero"
import { ValueProposition } from "@/components/marketing/value-proposition"
import { SocialProof } from "@/components/marketing/social-proof"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { FaqSection } from "@/components/marketing/faq-section"
import { ComplianceSection } from "@/components/marketing/compliance-section"
import { CtaSection } from "@/components/marketing/cta-section"
import { ClientEffects } from "@/components/marketing/client-effects"
import { JsonLd } from "@/components/json-ld"

export default function Page() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <ClientEffects />
      <MarketingHeader />
      <main className="flex-1 min-w-0 pt-16">
        <Hero />
        <ValueProposition />
        <SocialProof />
        <HowItWorks />
        <FaqSection />
        <ComplianceSection />
        <CtaSection />
      </main>
      <MarketingFooter />

      {/* ──────────────────────────────────── */}
      {/* JSON-LD Structured Data for SEO/AEO */}
      {/* ──────────────────────────────────── */}

      {/* 1. WebSite */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "BEYONDVYU",
          url: "https://beyondvyu.com",
          description:
            "QR + link Google review collection in 10 Indian languages, review velocity funnel, and WhatsApp-ready weekly digest. Same review path for every customer — no gating.",
          dateModified: "2026-09-09",
          inLanguage: ["en-IN", "hi", "mr", "gu", "ta", "te", "bn", "kn"],
        }}
      />

      {/* 2. Organization */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
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
          },
        }}
      />

      {/* 3. SoftwareApplication */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
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
          countriesSupported: ["US", "IN", "CA", "GB", "AU"],
        }}
      />

      {/* 4. FAQPage — mirrors the visible FAQ section for AEO/GEO */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How does BEYONDVYU help collect Google reviews?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Customers scan a QR code or open a link, rate their visit, and describe it in their own words in one of 10 languages (English, Hinglish, Hindi, Marathi, Gujarati, Gujlish, Tamil, Telugu, Bengali, Kannada). They get reminder talking points drawn only from what they wrote, then edit and own their review before choosing what to post to Google. BEYONDVYU never posts on a customer's behalf.",
              },
            },
            {
              "@type": "Question",
              name: "Does BEYONDVYU gate reviews or push only happy customers to Google?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. Every customer gets the same Google review path regardless of rating. Private feedback is offered alongside — never as a substitute that hides the public option. No incentives, no staff-name prompts, no posting on anyone's behalf.",
              },
            },
            {
              "@type": "Question",
              name: "How much does BEYONDVYU cost?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "BEYONDVYU offers a Free plan for 1 location with 30 AI credits/month. For growing businesses, transparent pricing is $29/mo (Starter), $59/mo (Growth), $99/mo (Pro), and $249/mo (Restaurant Group) in the US and globally. In India, localized plans are ₹249/mo (Starter), ₹499/mo (Growth), and ₹799/mo (Pro). Annual billing includes 2 months free on all tiers. See /pricing for full plan comparison.",
              },
            },
            {
              "@type": "Question",
              name: "Which languages does the customer review flow support?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "The customer review flow supports English, Spanish (es-US / Latin American), Hinglish, Hindi, Marathi, Gujarati, Gujlish, Tamil, Telugu, Bengali, and Kannada. AI drafts adapt seamlessly to the customer's selected language and industry vertical.",
              },
            },
            {
              "@type": "Question",
              name: "How long does it take to set up BEYONDVYU?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "About 2 minutes: create an account, add your business and Google review link or Place ID, download the QR code, and place it at billing, checkout or reception.",
              },
            },
            {
              "@type": "Question",
              name: "Does the weekly WhatsApp digest work automatically?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "The digest content (feedback volume, review velocity, rating change, top praise/issues, follow-ups) is generated in the dashboard today and shows an honest preview. Automatic WhatsApp delivery needs your WhatsApp Business API number connected plus owner opt-in, with an approved Meta utility template. Until then nothing is auto-sent.",
              },
            },
            {
              "@type": "Question",
              name: "What should owners track — beyond star rating?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Review velocity (reviews per location per month) and the visits → review-starts → Google-posts conversion funnel, plus rating change, unresolved 1–2 star follow-ups, and repeat praise/complaint themes per location.",
              },
            },
            {
              "@type": "Question",
              name: "Does BEYONDVYU support multiple business locations?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Growth covers up to 3 locations and Pro up to 10, each with its own QR, dashboard and digest, plus team roles. Review velocity and funnel are reported per location.",
              },
            },
          ],
        }}
      />

      {/* 5. HowTo */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Collect Google reviews with BEYONDVYU",
          description:
            "A simple 6-step process to turn real customer visits into authentic Google reviews.",
          dateModified: "2026-09-09",
          step: [
            {
              "@type": "HowToStep",
              position: 1,
              name: "Place your QR code",
              text: "Place the QR code at billing, checkout or reception, or share the link. One tap opens a fast, mobile-first flow — no app, no login.",
            },
            {
              "@type": "HowToStep",
              position: 2,
              name: "Customer rates their experience",
              text: "Every customer sees the same path and the same Google review option, whatever they rate. No gating.",
            },
            {
              "@type": "HowToStep",
              position: 3,
              name: "Share details in their language",
              text: "Customers pick from 10 languages and describe their visit in their own words with neutral, open-ended prompts.",
            },
            {
              "@type": "HowToStep",
              position: 4,
              name: "Customer crafts their own review",
              text: "Reminder talking points come only from what the customer wrote. They edit and own every word, then choose what to post to Google. Nothing is posted on their behalf.",
            },
            {
              "@type": "HowToStep",
              position: 5,
              name: "Track velocity and insights",
              text: "Every interaction feeds review velocity, the visits-to-posts funnel, rating trends and praise/issue themes — plus a WhatsApp-ready weekly digest.",
            },
            {
              "@type": "HowToStep",
              position: 6,
              name: "Stay within Google's review policies",
              text: "Same review path for every customer. No gating, no incentives, no staff-name prompts, no posting on a customer's behalf — the customer approves the final review.",
            },
          ],
        }}
      />

      {/* 6. SpeakableSpecification (AEO — for voice search / AI answers) */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "BEYONDVYU — Google review management platform",
          url: "https://beyondvyu.com",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: ["h1", "h2", ".speakable"],
          },
        }}
      />

      {/* 7. DefinedTermSet */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          name: "BEYONDVYU Industry Concepts",
          description: "Key terms related to review management.",
          dateModified: "2026-09-09",
          hasDefinedTerm: [
            {
              "@type": "DefinedTerm",
              name: "Review gating",
              description:
                "Showing the Google review option only to customers expected to leave positive reviews, or discouraging negative reviews. BEYONDVYU prohibits gating by design: every customer gets the same review path.",
            },
            {
              "@type": "DefinedTerm",
              name: "Review velocity",
              description:
                "Reviews collected per location per month. BEYONDVYU reports it per location alongside the visits to review-starts to Google-posts conversion funnel.",
            },
            {
              "@type": "DefinedTerm",
              name: "Sentiment analysis",
              description:
                "Analysis that identifies whether customer feedback is positive, negative, or neutral, and extracts praise/issue themes. Works best in English/Hinglish; native-script coverage keeps improving.",
            },
          ],
        }}
      />

      {/* 8. BreadcrumbList */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://beyondvyu.com",
            },
          ],
        }}
      />

      {/* 9. OfferCatalog — real INR plans for GEO comparability */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: "BEYONDVYU Review Management Platform",
          description:
            "QR + link Google review collection in 10 Indian languages with review velocity funnel and WhatsApp-ready digest.",
          brand: {
            "@type": "Brand",
            name: "BEYONDVYU",
          },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: "0",
            highPrice: "799",
            offerCount: "5",
            availability: "https://schema.org/InStock",
          },
        }}
      />
    </div>
  )
}
