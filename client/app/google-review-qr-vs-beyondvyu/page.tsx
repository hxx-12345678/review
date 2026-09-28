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
  { label: "Review QR / link", google: "Free link + QR from Google", vyu: "QR, link, WhatsApp + NFC-ready flows", googleOk: true },
  { label: "Customer experience", google: "Blank review box, English-first", vyu: "Guided flow in 10 Indian languages", googleOk: false },
  { label: "Funnel analytics", google: "None — you never see drop-offs", vyu: "Visits → starts → Google posts, per touchpoint", googleOk: false },
  { label: "Touchpoint QRs", google: "One generic code", vyu: "Billing, reception, table, receipt, WhatsApp — compared", googleOk: false },
  { label: "Review velocity", google: "Not tracked", vyu: "Reviews/location/month with safe-cadence guidance", googleOk: false },
  { label: "Feedback intelligence", google: "None", vyu: "Praise/complaint themes, trends, follow-ups", googleOk: false },
  { label: "Reply workflow", google: "Manual, easy to miss", vyu: "Inbox + AI-assisted replies, nothing unanswered", googleOk: false },
  { label: "Review Health Check", google: "Do it yourself on Maps", vyu: "Rating, count, recency, gap vs competitors, velocity plan", googleOk: false },
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
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Why not just use Google's free review QR?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Google's free QR opens the review box but shows no funnel analytics, no multilingual guidance, no per-touchpoint comparison, no velocity tracking and no reply workflow. BeyondVyu builds the guided system around the same link so more visits convert into reviews.",
              },
            },
            {
              "@type": "Question",
              name: "Does BeyondVyu write reviews for customers?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. Customers describe their visit in their own words, edit and own the final review. AI only creates reminder talking points from what they wrote.",
              },
            },
          ],
        }}
      />
    </div>
  );
}
