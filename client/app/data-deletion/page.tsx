import type { Metadata } from "next"
import Link from "next/link"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"

export const metadata: Metadata = {
  title: "Data deletion request",
  description:
    "How to request deletion of data associated with your Facebook or Meta account from BEYONDVYU.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://beyondvyu.com/data-deletion" },
}

export default function DataDeletionPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-28 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Privacy</p>
        <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Data deletion request
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          BEYONDVYU uses Meta only for WhatsApp Embedded Signup. It does not create a
          Facebook profile for you. If you still want to remove the app and request deletion
          of any data associated with your Facebook or Meta account, use the steps below.
        </p>

        <section className="mt-10 space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Remove BEYONDVYU and send a deletion request</h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Open{" "}
              <a
                href="https://www.facebook.com/settings?tab=applications"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                Facebook Settings → Apps and Websites
              </a>
              .
            </li>
            <li>Find <strong className="text-foreground">BEYONDVYU</strong> and remove it.</li>
            <li>
              Open <strong className="text-foreground">View Removed Apps and Websites</strong>,
              click <strong className="text-foreground">View</strong> next to BEYONDVYU, then click{" "}
              <strong className="text-foreground">Send Request</strong>.
            </li>
            <li>
              Meta will call our data-deletion callback and return a confirmation code plus a
              status link. Keep that code.
            </li>
          </ol>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You can also email{" "}
            <a
              href="mailto:support@beyondvyu.com?subject=Data%20deletion%20request"
              className="font-medium text-primary underline underline-offset-2"
            >
              support@beyondvyu.com
            </a>{" "}
            with the subject “Data deletion request”. We respond within 30 days.
          </p>
        </section>

        <section className="mt-8 space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-6">
          <h2 className="text-lg font-semibold">What is deleted</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We delete or anonymize personal data we hold about you, except records we must keep
            for tax, fraud prevention, or legal obligations. WhatsApp business assets belong to
            the business that connected them, not to the person who removes the Meta app.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Read the{" "}
            <Link href="/privacy" className="font-medium text-primary underline underline-offset-2">
              Privacy Policy
            </Link>{" "}
            for retention periods and your rights.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
