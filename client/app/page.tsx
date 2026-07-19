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
          sameAs: [
            "https://twitter.com/beyondvyu",
            "https://linkedin.com/company/beyondvyu",
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
                text: "BEYONDVYU provides QR codes that customers can scan to leave a Google review. Our AI assistant helps jog their memory about their experience, making it easy to write an authentic review.",
              },
            },
            {
              "@type": "Question",
              name: "Is BEYONDVYU compliant with Google and FTC policies?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. BEYONDVYU is fully compliant with Google review policies and FTC endorsement guidelines. We never incentivize positive reviews or fake reviews. All reviews are authentic customer experiences.",
              },
            },
            {
              "@type": "Question",
              name: "How much does BEYONDVYU cost?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "BEYONDVYU offers a free plan to get started, with paid plans starting at affordable monthly rates. All plans include QR code generation, AI-powered insights, and WhatsApp reports.",
              },
            },
            {
              "@type": "Question",
              name: "Can I install BEYONDVYU as a mobile app?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. BEYONDVYU is a Progressive Web App that can be installed on your phone or desktop. Look for the 'Download app' button to install it on your home screen for quick access.",
              },
            },
            {
              "@type": "Question",
              name: "How does the AI sentiment analysis work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "BEYONDVYU uses AI to analyze review sentiment, track trends over time, and identify areas for improvement. You receive weekly insights delivered straight to your WhatsApp.",
              },
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
