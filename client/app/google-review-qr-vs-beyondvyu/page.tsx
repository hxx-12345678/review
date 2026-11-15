import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Google's Free Review QR vs BeyondVyu — Why Businesses Pay for a System",
  description:
    "Google gives every business a free review link and QR code. BeyondVyu builds the guided multilingual flow, funnel analytics, velocity tracking and reply workflow around it. Same review path for every customer — no gating, no fake reviews.",
  alternates: { canonical: "https://beyondvyu.com/google-review-qr-vs-beyondvyu" },
  openGraph: {
    title: "Google's Free Review QR vs BeyondVyu",
    description:
      "Google gives you the destination. BeyondVyu builds the system that gets customers there consistently — and shows you where they drop off.",
    url: "https://beyondvyu.com/google-review-qr-vs-beyondvyu",
    type: "article",
  },
};

const ROWS: { label: string; google: string; vyu: string; googleOk: boolean }[] = [
  { label: "Review QR / link", google: "Free link + generic QR from Google", vyu: "Custom QR, short link, touchpoint tracking & NFC-ready flows", googleOk: true },
  { label: "Customer experience", google: "Blank review box, English-first", vyu: "Multilingual guided flow in English, Spanish + 10 languages", googleOk: false },
  { label: "Voice-to-text feedback", google: "Manual typing only", vyu: "Voice recording with live waveform & automatic AI transcription", googleOk: false },
  { label: "Industry-tailored questions", google: "One-size-fits-all blank comment", vyu: "Adaptive questions for dental, auto repair, salons, restaurants & retail", googleOk: false },
  { label: "Funnel analytics", google: "None — you never see drop-offs", vyu: "Visits → starts → Google posts, per touchpoint and staff", googleOk: false },
  { label: "Touchpoint QRs", google: "One static code for entire business", vyu: "Billing, reception, table, counter, receipt — compared", googleOk: false },
  { label: "Review velocity & health", google: "Not tracked", vyu: "Reviews/location/month with safe-cadence guidance & competitor gap", googleOk: false },
  { label: "Feedback intelligence", google: "None", vyu: "Praise/complaint themes, sentiment trends, follow-ups", googleOk: false },
  { label: "Reply workflow", google: "Manual, easy to miss", vyu: "Unified inbox + AI-assisted replies with tone control", googleOk: false },
  { label: "FTC & Google Compliance", google: "Compliant destination", vyu: "100% compliant with FTC 16 CFR Part 465 & Google policies (zero gating)", googleOk: true },
];

export default function Page() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="flex-1 min-w-0 pt-16">
        <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            The question every owner asks
          </p>
          <h1 className="speakable mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Google gives you the review link.{" "}
            <span className="text-gradient">BeyondVyu builds the system around it.</span>
          </h1>
          <p className="speakable mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Your happiest customers almost never review on their own — and your
            staff forgets to ask. A free QR doesn&apos;t fix either problem. What
            fixes it is a repeatable workflow: every visit gets asked, every
            customer gets guided in their language, and you see exactly where
            they drop off.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button render={<Link href="/signup" />} nativeButton={false} size="lg">
              Get my free Review Health Check
              <ArrowRight className="size-4" />
            </Button>
            <Button render={<Link href="/contact" />} nativeButton={false} size="lg" variant="outline">
              Talk to us
            </Button>
          </div>

          <h2 className="mt-16 text-2xl font-bold tracking-tight">
            Free QR vs a review system
          </h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  <th className="px-4 py-3 font-semibold">Capability</th>
                  <th className="px-4 py-3 font-semibold">Google&apos;s free QR</th>
                  <th className="px-4 py-3 font-semibold">BeyondVyu</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.label} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-3 font-medium">{r.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-start gap-2">
                        {r.googleOk ? (
                          <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                        ) : (
                          <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                        )}
                        {r.google}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        {r.vyu}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-16 text-2xl font-bold tracking-tight">
            The funnel is the product
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Don&apos;t buy &ldquo;more reviews.&rdquo; Buy a measurable operating
            system: customer visits turn into review starts, starts turn into
            Google posts — per location, per touchpoint, every week. Then the
            same data tells you what customers praise, what they complain about,
            and which branch needs attention.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {["Customer visits", "Review starts", "Choose Google", "Reviews posted"].map((s, i) => (
              <div key={s} className="rounded-xl border border-border/60 bg-card p-4 text-center">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Step {i + 1}</div>
                <div className="mt-1 text-sm font-semibold">{s}</div>
              </div>
            ))}
          </div>

          <h2 className="mt-16 text-2xl font-bold tracking-tight">
            How BeyondVyu compares to legacy platforms (Podium & Birdeye)
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Legacy reputation tools charge $289 to $449/month per location, push locked annual contracts, and often rely on aggressive SMS blasts. BeyondVyu is designed for modern local businesses: clean in-person QR & link collection, multi-industry questions, voice-to-text, and zero review gating starting at $0/month.
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  <th className="px-4 py-3 font-semibold">Feature</th>
                  <th className="px-4 py-3 font-semibold">BeyondVyu</th>
                  <th className="px-4 py-3 font-semibold">Podium / Birdeye</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="px-4 py-3 font-medium">Pricing</td>
                  <td className="px-4 py-3 text-primary font-semibold">Free to $29–$99/mo (no contract)</td>
                  <td className="px-4 py-3 text-muted-foreground">$289–$449+/mo per location (annual lock-in)</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="px-4 py-3 font-medium">Customer Review Guidance</td>
                  <td className="px-4 py-3 text-primary">Multilingual (English, Spanish, + 10 langs) + Voice</td>
                  <td className="px-4 py-3 text-muted-foreground">Generic English SMS review links</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="px-4 py-3 font-medium">Industry Specificity</td>
                  <td className="px-4 py-3 text-primary">Dental, Auto, Salon, Restaurant, Retail, Clinics</td>
                  <td className="px-4 py-3 text-muted-foreground">Generic rating and feedback form</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="px-4 py-3 font-medium">FTC 16 CFR 465 Compliance</td>
                  <td className="px-4 py-3 text-primary">100% compliant: zero review gating or suppression</td>
                  <td className="px-4 py-3 text-muted-foreground">Historically flagged for gating practices</td>
                </tr>
                <tr className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3 font-medium">Setup Time</td>
                  <td className="px-4 py-3 text-primary">Under 2 minutes, self-serve</td>
                  <td className="px-4 py-3 text-muted-foreground">Days to weeks with mandatory sales demo</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="mt-16 text-2xl font-bold tracking-tight">
            Trust is the moat, not AI
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Anyone can add AI. Almost nobody constrains it: same review path for
            every customer, no incentives, no gating, no staff-name prompts, no
            posting on anyone&apos;s behalf — the customer writes and approves
            the final review. AI only reminds them of what they already said.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button render={<Link href="/signup" />} nativeButton={false} size="lg">
              Start free — 2-minute setup
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card · Free plan forever · See{" "}
            <Link href="/pricing" className="underline underline-offset-2">pricing</Link>
          </p>
        </section>
      </main>
      <MarketingFooter />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://beyondvyu.com" },
            { "@type": "ListItem", position: 2, name: "Google Review QR vs BeyondVyu", item: "https://beyondvyu.com/google-review-qr-vs-beyondvyu" },
          ],
        }}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Why not just use Google's free review QR?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Google's free QR opens a blank review box with no guidance, no funnel analytics, no multilingual guidance, no per-touchpoint conversion tracking, and no velocity monitoring. BeyondVyu builds the complete guided system around your Google review link so more customers actually finish leaving their review.",
              },
            },
            {
              "@type": "Question",
              name: "Is BeyondVyu an affordable alternative to Podium or Birdeye?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. While legacy platforms like Podium and Birdeye charge $289 to $449/month with annual lock-in contracts, BeyondVyu provides compliant QR-based collection, voice-to-text input, multilingual support (English, Spanish + 10 languages), and AI reply drafting starting on a generous Free tier and low-cost transparent monthly plans ($29–$99/month).",
              },
            },
            {
              "@type": "Question",
              name: "Does BeyondVyu comply with FTC rules against review gating?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes, 100%. BeyondVyu strictly complies with FTC 16 CFR Part 465 and Google's 2026 policies. All customers are given the direct Google review path regardless of whether their feedback is positive or critical. Negative reviews are never intercepted, filtered, or gated.",
              },
            },
            {
              "@type": "Question",
              name: "Does BeyondVyu write reviews for customers?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. Customers describe their visit in their own words (or speak via microphone), then edit and approve the final review text. AI only creates reminder talking points drawn strictly from what the customer said.",
              },
            },
            {
              "@type": "Question",
              name: "Can BeyondVyu be customized for dental clinics, auto repair shops, or salons?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. BeyondVyu dynamically tailors feedback questions based on the business vertical — such as gentle care and hygiene for dental, transparent diagnostics and fair turnaround for auto repair, stylist skill and ambiance for salons, and food quality and atmosphere for restaurants.",
              },
            },
          ],
        }}
      />
    </div>
  );
}
