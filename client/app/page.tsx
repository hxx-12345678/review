import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Hero } from "@/components/marketing/hero"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { ComplianceSection } from "@/components/marketing/compliance-section"
import { CtaSection } from "@/components/marketing/cta-section"

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ComplianceSection />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  )
}
