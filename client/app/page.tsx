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
          countriesSupported: "IN",
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
                text: "Free (₹0) for 1 location with 30 AI credits/month. Paid plans: Lite ₹100/month, Starter ₹249/month, Growth ₹499/month, Pro ₹799/month, with yearly options. UPI and cards via Razorpay; GST invoice included. See /pricing for the full table.",
              },
            },
            {
              "@type": "Question",
              name: "Which languages does the customer review flow support?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "English, Hinglish, Hindi, Marathi, Gujarati, Gujlish, Tamil, Telugu, Bengali and Kannada. AI drafts follow the selected language, and if a customer types in a different script we suggest switching. Dashboard keyword trends work best in English/Hinglish today.",
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
              name: "Stay policy-safe",
              text: "No gating, no incentives, no staff-name prompts. Open-ended prompts keep collection aligned with Google review policies.",
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
