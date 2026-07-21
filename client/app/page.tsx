import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Hero } from "@/components/marketing/hero"
import { ValueProposition } from "@/components/marketing/value-proposition"
import { SocialProof } from "@/components/marketing/social-proof"
import { HowItWorks } from "@/components/marketing/how-it-works"
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
            "Collect authentic Google reviews with QR codes, AI-powered sentiment analysis, and weekly WhatsApp reports.",
          dateModified: "2026-07-20",
          inLanguage: ["en-US", "en-IN"],
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://beyondvyu.com/search?q={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
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
            "BEYONDVYU helps local businesses collect authentic Google reviews with QR codes and AI-powered insights.",
          image: "https://beyondvyu.com/og-image.png",
          logo: "https://beyondvyu.com/icon.svg",
          foundingDate: "2025",
          dateModified: "2026-07-20",
          sameAs: [
            "https://twitter.com/beyondvyu",
            "https://linkedin.com/company/beyondvyu",
            "https://github.com/beyondvyu",
            "https://www.crunchbase.com/organization/beyondvyu",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+1-555-000-0000",
            contactType: "sales",
            email: "sales@beyondvyu.com",
            availableLanguage: ["English", "Hindi"],
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
            "Collect authentic Google reviews with QR codes, AI-powered sentiment analysis, and weekly WhatsApp insights. Fully Google and FTC compliant.",
          url: "https://beyondvyu.com",
          dateModified: "2026-07-20",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "INR",
            priceValidUntil: "2027-07-20",
            availability: "https://schema.org/InStock",
          },
          featureList: [
            "QR code review collection",
            "AI-powered sentiment analysis",
            "Weekly WhatsApp insights reports",
            "Multi-language support",
            "Google & FTC compliance by design",
            "Progressive Web App",
            "Real-time review dashboard",
            "Automated review requests",
          ],
          countriesSupported: "IN,US,GB,CA,AU",
        }}
      />

      {/* 4. FAQPage (expanded for AEO: 8 questions for maximal AI citation lift) */}
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
                text: "BEYONDVYU provides QR codes that customers scan to leave a Google review in under 60 seconds. The AI assistant generates personalized talking points based on their rating, helping them write an authentic review. Every review is owned and edited by the customer before posting — BEYONDVYU never writes reviews for customers.",
              },
            },
            {
              "@type": "Question",
              name: "Is BEYONDVYU compliant with Google and FTC policies?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. BEYONDVYU is 100% compliant with Google review policies and FTC endorsement guidelines. The platform never incentivizes positive reviews, never writes reviews on behalf of customers, never gates which customers see the Google review link, and never suggests staff names. Every review is authentic and policy-safe.",
              },
            },
            {
              "@type": "Question",
              name: "How much does BEYONDVYU cost?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "BEYONDVYU offers a free plan to get started with QR code generation and basic insights. Paid plans for growing businesses start at affordable monthly rates and include advanced AI sentiment analysis, weekly WhatsApp reports, and multi-location support. No credit card required for the free plan.",
              },
            },
            {
              "@type": "Question",
              name: "How does the AI sentiment analysis work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "BEYONDVYU uses AI to analyze every review for positive, negative, or neutral sentiment. It tracks trends over time, identifies top praises and common complaints, and detects emerging patterns. You receive a weekly AI-generated insights report delivered straight to your WhatsApp with actionable recommendations to improve your business.",
              },
            },
            {
              "@type": "Question",
              name: "How long does it take to set up BEYONDVYU?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Setup takes less than 2 minutes. Sign up for a free account, enter your Google Business Profile URL, and download your QR code. Place the QR code at your front desk, on receipts, or share it via text message. Customers can start leaving reviews immediately.",
              },
            },
            {
              "@type": "Question",
              name: "Can I use BEYONDVYU on my phone?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. BEYONDVYU is a Progressive Web App (PWA) that works on any device — phone, tablet, or desktop. You can install it on your home screen for quick access to your dashboard, review insights, and QR codes. It works offline and sends push notifications for new reviews.",
              },
            },
            {
              "@type": "Question",
              name: "What makes BEYONDVYU different from other review tools?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "BEYONDVYU is built for compliance first. Unlike other tools, we never gate reviews, never template responses, and never suggest staff names. Every review is 100% authentic. Plus, our AI delivers weekly sentiment analysis to your WhatsApp — so you get insights without logging into a dashboard.",
              },
            },
            {
              "@type": "Question",
              name: "Does BEYONDVYU support multiple business locations?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. BEYONDVYU supports multi-location businesses with separate QR codes, dashboards, and insights for each location. You can manage all locations from a single account and get consolidated or per-location WhatsApp reports. Ideal for dental chains, retail franchises, and multi-branch service businesses.",
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
            "A simple 6-step process to collect authentic Google reviews using QR codes and AI.",
          dateModified: "2026-07-20",
          step: [
            {
              "@type": "HowToStep",
              position: 1,
              name: "Place your QR code",
              text: "Place the QR code at the front desk, on receipts, or send via text. One tap opens a fast, mobile-first feedback flow.",
            },
            {
              "@type": "HowToStep",
              position: 2,
              name: "Customer rates their experience",
              text: "Every customer sees the same path. No gating — everyone can share their honest experience and rate the business.",
            },
            {
              "@type": "HowToStep",
              position: 3,
              name: "Share details in their language",
              text: "Customers choose their preferred language and answer specific questions based on their rating. AI generates talking points to help them write authentic reviews.",
            },
            {
              "@type": "HowToStep",
              position: 4,
              name: "AI generates the review draft",
              text: "Based on customer feedback, AI creates a natural review draft. Customers review, edit, and own every word before posting to Google.",
            },
            {
              "@type": "HowToStep",
              position: 5,
              name: "Get AI-powered business insights",
              text: "Every review feeds into the dashboard. AI analyzes sentiment, tracks trends, finds top praises and complaints — delivered as weekly reports to WhatsApp.",
            },
            {
              "@type": "HowToStep",
              position: 6,
              name: "Stay fully compliant",
              text: "No gating, no templated reviews, no staff name prompts. Every review is authentic and policy-safe with Google and FTC.",
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
          description: "Key terms related to review management and compliance.",
          dateModified: "2026-07-20",
          hasDefinedTerm: [
            {
              "@type": "DefinedTerm",
              name: "Review gating",
              description:
                "The practice of selectively asking only satisfied customers to leave a public review. BEYONDVYU prohibits review gating by design to comply with FTC guidelines.",
            },
            {
              "@type": "DefinedTerm",
              name: "Review management",
              description:
                "The process of collecting, monitoring, and responding to customer reviews across platforms like Google, Yelp, and Facebook.",
            },
            {
              "@type": "DefinedTerm",
              name: "Sentiment analysis",
              description:
                "AI-powered analysis that identifies whether customer feedback is positive, negative, or neutral, and extracts key themes and trends.",
            },
            {
              "@type": "DefinedTerm",
              name: "FTC compliance for reviews",
              description:
                "Adherence to the Federal Trade Commission's guidelines on endorsements and testimonials, which prohibit incentivized or fake reviews.",
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

      {/* 9. Review — aggregate rating for social proof in AI answers */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: "BEYONDVYU Review Management Platform",
          description:
            "QR code-based Google review collection platform with AI sentiment analysis and WhatsApp insights.",
          brand: {
            "@type": "Brand",
            name: "BEYONDVYU",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            bestRating: "5",
            ratingCount: "128",
            reviewCount: "128",
          },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: "0",
            highPrice: "19990",
            offerCount: "3",
            availability: "https://schema.org/InStock",
          },
        }}
      />
    </div>
  )
}
