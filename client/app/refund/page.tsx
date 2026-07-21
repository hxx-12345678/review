import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Refund, Return & Cancellation Policy",
  description: "Refund, return, and cancellation policy for BEYONDVYU subscriptions. Learn about our billing terms and how to request a refund.",
  alternates: { canonical: "https://beyondvyu.com/refund" },
  robots: { index: false, follow: false },
};

export default function RefundPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 min-w-0 overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="mb-8 text-3xl font-bold">Refund, Return & Cancellation Policy</h1>
        <p className="mb-4 text-sm text-muted-foreground">Last updated: July 18, 2026</p>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">1. Overview</h2>
          <p>
            BEYONDVYU provides a subscription-based SaaS platform for review management. This policy explains
            how refunds, returns, and cancellations are handled for all purchases made on our platform.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">2. Subscription Cancellation</h2>
          <p>
            You may cancel your subscription at any time from your dashboard billing page or by contacting our
            support team. Upon cancellation:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Your subscription will remain active until the end of the current billing period</li>
            <li>You will not be charged for subsequent billing periods</li>
            <li>Your account will be downgraded to the Free plan after the current period ends</li>
            <li>You will retain access to all data you have uploaded to the platform</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">3. Refund Policy</h2>
          <p>
            All subscription fees are non-refundable except in the following circumstances:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li><strong>Service unavailability:</strong> If BEYONDVYU experiences a demonstrable service outage that prevents core functionality for more than 48 consecutive hours, you may request a pro-rata refund for the affected period</li>
            <li><strong>Duplicate charges:</strong> If you are incorrectly charged more than once for the same billing period, the duplicate amount will be refunded in full</li>
            <li><strong>Legally mandated refunds:</strong> As required by applicable consumer protection laws in your jurisdiction</li>
          </ul>
          <p className="mt-4">
            Refund requests must be submitted within 7 days of the charge date. All refund approvals are at the
            discretion of BEYONDVYU and will be processed within 5-10 business days.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">4. How to Request a Refund</h2>
          <p>To request a refund, please contact us with the following information:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Your account email address</li>
            <li>The invoice or payment ID related to the charge</li>
            <li>A brief explanation of your refund request</li>
          </ul>
          <p className="mt-4">
            Contact us at <strong>support@beyondvyu.com</strong> or visit our{" "}
            <a href="/contact" className="text-primary underline hover:no-underline">Contact Us</a> page.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">5. Chargebacks</h2>
          <p>
            If you believe a charge is incorrect, we encourage you to contact us first before filing a
            chargeback with your bank. We are committed to resolving billing issues promptly and fairly.
            Unnecessary chargebacks may result in account suspension.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">6. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Changes will be posted on this page with an updated
            date. Material changes will be communicated via email.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">7. Contact</h2>
          <p>
            For questions about this policy, please contact us:
          </p>
          <p className="text-muted-foreground">
            Email: support@beyondvyu.com<br />
            Address: 123 Innovation Drive, Suite 400, San Francisco, CA 94105, United States
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
            { "@type": "ListItem", position: 2, name: "Refund Policy", item: "https://beyondvyu.com/refund" },
          ],
        }}
      />
    </div>
  );
}
