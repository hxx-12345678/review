import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Hero } from "@/components/marketing/hero"
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
        <SocialProof />
        <HowItWorks />
        <ComplianceSection />
        <CtaSection />
      </main>
      <MarketingFooter />
    
      {/* JSON-LD Structured Data */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "BEYONDVYU",
          url: "https://beyondvyu.com",
          description:
            "Turn happy customers into authentic Google reviews with QR codes, AI insights, and WhatsApp reports.",
          dateModified: "2026-07-19",
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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "BEYONDVYU",
          url: "https://beyondvyu.com",
          description:
            "BEYONDVYU helps local businesses collect authentic Google reviews with QR codes and AI.",
          image: "https://beyondvyu.com/icon.svg",
          logo: "https://beyondvyu.com/icon.svg",
          dateModified: "2026-07-19",
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
            email: "sales@beyondvyu.app",
            availableLanguage: ["English"],
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "BEYONDVYU",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description:
            "Collect authentic Google reviews with QR codes, AI-powered sentiment analysis, and weekly WhatsApp insights.",
          url: "https://beyondvyu.com",
          dateModified: "2026-07-19",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "INR",
          },
        }}
      />
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
                text: "BEYONDVYU provides QR codes that customers scan to leave a Google review. The AI assistant helps jog their memory by generating talking points based on their rating, making it easy to write an authentic review. Every review draft is owned and edited by the customer before posting.",
              },
            },
            {
              "@type": "Question",
              name: "Is BEYONDVYU compliant with Google and FTC policies?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. BEYONDVYU is fully compliant with Google review policies and FTC endorsement guidelines. The platform never incentivizes positive reviews, never writes reviews on behalf of customers, and never gates which customers see the Google review link.",
              },
            },
            {
              "@type": "Question",
              name: "How much does BEYONDVYU cost?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "BEYONDVYU offers a free plan to get started. Paid plans for growing businesses start at affordable monthly rates. Every plan includes QR code generation, AI-powered sentiment analysis, and weekly WhatsApp reports.",
              },
            },
            {
              "@type": "Question",
              name: "Can I install BEYONDVYU as a mobile app?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. BEYONDVYU is a Progressive Web App that can be installed on your phone or desktop. Look for the install button in your browser to add it to your home screen for quick access to your dashboard and insights.",
              },
            },
            {
              "@type": "Question",
              name: "How does the AI sentiment analysis work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "BEYONDVYU uses AI to analyze every review for sentiment, track trends over time, and identify top praises and complaints. You receive a weekly AI-generated insights report delivered straight to your WhatsApp with actionable recommendations.",
              },
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Collect Google reviews with BEYONDVYU",
          description:
            "A simple 6-step process to collect authentic Google reviews using QR codes and AI.",
          dateModified: "2026-07-19",
          step: [
            {
              "@type": "HowToStep",
              position: 1,
              name: "Scan the QR code",
              text: "Place the QR code at the front desk, on receipts, or send via text. One tap opens a fast, mobile-first feedback flow.",
            },
            {
              "@type": "HowToStep",
              position: 2,
              name: "Rate their experience",
              text: "Every customer sees the same path. No gating — everyone can share their honest experience and rate the business.",
            },
            {
              "@type": "HowToStep",
              position: 3,
              name: "Share details in their language",
              text: "Customers choose their preferred language and answer specific questions based on their rating. AI generates talking points to help them write authentic Google reviews.",
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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          name: "BEYONDVYU Industry Concepts",
          description: "Key terms related to review management and compliance.",
          dateModified: "2026-07-19",
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
    </div>
  )
}
