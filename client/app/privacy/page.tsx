import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "BEYONDVYU Privacy Policy — how we collect, use, store, and protect your personal data in compliance with the Digital Personal Data Protection Act 2023 (India), GDPR, and applicable privacy laws.",
  alternates: { canonical: "https://beyondvyu.com/privacy" },
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 min-w-0 overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Last updated: July 21, 2026
        </p>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">1. Overview</h2>
          <p>
            BEYONDVYU (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to
            protecting your privacy. This policy explains how we collect, use, store, process, and
            protect your personal data when you use our review management platform. It complies with
            the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India,
            along with other applicable privacy laws.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">2. Data Fiduciary &amp; Contact Information</h2>
          <p>
            BEYONDVYU is the <strong>Data Fiduciary</strong> under the DPDP Act. For any
            privacy-related inquiries, grievances, or requests to exercise your rights:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            <li>
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@beyondvyu.app" className="text-primary underline-offset-2 hover:underline">
                privacy@beyondvyu.app
              </a>
            </li>
            <li>
              <strong>Grievance Officer:</strong> Contact us at privacy@beyondvyu.app —
              complaints will be acknowledged within 24 hours and resolved within 30 days as
              required by the DPDP Act.
            </li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">3. Personal Data We Collect</h2>
          <p>We collect only the personal data necessary to provide our services:</p>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            <li>
              <strong>Account Data:</strong> name, email address, phone number, and password
              (password is hashed with bcrypt — never stored in plain text)
            </li>
            <li>
              <strong>Business Data:</strong> business name, address, phone number, website, Google
              Place ID, and Google Review URL
            </li>
            <li>
              <strong>Customer Feedback Data:</strong> ratings, comments, review drafts, and
              feedback submitted through our platform
            </li>
            <li>
              <strong>Usage Data:</strong> QR code scans, page visits, feature interactions, and
              platform activity logs
            </li>
            <li>
              <strong>Payment Data:</strong> Razorpay subscription and payment identifiers
              <em> (we never store credit/debit card numbers, CVV, or bank account details)</em>
            </li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">4. Consent</h2>
          <p>
            Under the DPDP Act, we collect your personal data only after obtaining your{" "}
            <strong>free, specific, informed, unconditional, and unambiguous consent</strong>. You
            are required to:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            <li>
              Explicitly consent to data processing before creating an account (no pre-ticked
              checkboxes)
            </li>
            <li>
              Accept our Privacy Policy and Terms of Service before using the platform
            </li>
          </ul>
          <p className="mt-3">
            You may <strong>withdraw your consent at any time</strong> with the same ease as you
            gave it. Withdrawing consent does not affect the lawfulness of processing carried out
            before the withdrawal. To withdraw consent, visit your account settings or email
            privacy@beyondvyu.app.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">5. Purpose of Data Processing</h2>
          <p>We use your personal data only for the following purposes:</p>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            <li>To create and manage your account</li>
            <li>To provide review management services (review requests, feedback collection, AI drafts)</li>
            <li>To send service-related notifications (new feedback, review reminders)</li>
            <li>To generate aggregated analytics and insights (anonymized where possible)</li>
            <li>To comply with legal and regulatory obligations</li>
            <li>
              With separate, specific consent: to send marketing updates, tips, and product
              announcements (you may opt out at any time)
            </li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">6. Data Sharing &amp; Disclosure</h2>
          <p>
            We <strong>do not sell</strong> your personal data. We share data only with:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            <li>
              <strong>Razorpay</strong> (payment processing) — only Razorpay IDs are stored in our
              database; no financial instrument data
            </li>
            <li>
              <strong>Google</strong> — only when you choose to redirect customers to Google Reviews
              or connect Google Business Profile
            </li>
            <li>
              <strong>Service providers</strong> — hosting (Render), email delivery, and analytics
              under strict data processing agreements
            </li>
            <li>
              <strong>Law enforcement</strong> — only when required by applicable law or valid legal
              process
            </li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">7. Data Localization &amp; Storage</h2>
          <p>
            As required by the DPDP Act and the RBI April 2018 circular on data localization, all
            personal data is stored on servers located in <strong>India</strong>. Our database
            infrastructure uses India-region cloud services (AWS ap-south-1 / Mumbai).
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">8. Data Security</h2>
          <p>We implement industry-standard security measures:</p>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            <li>Encryption at rest (AES-256) and in transit (TLS 1.3)</li>
            <li>Passwords hashed using bcrypt with cost factor 12</li>
            <li>Token-based authentication with session expiry</li>
            <li>No raw PAN, CVV, or expiry stored anywhere</li>
            <li>Content Security Policy (CSP) headers configured</li>
            <li>Regular security audits and access controls</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">9. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active. Upon account
            deletion, we delete or anonymize your data within 30 days unless retention is required
            by law (e.g., invoice records for tax purposes are retained for 7 years as required by
            Indian tax law).
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">10. Your Rights (DPDP Act)</h2>
          <p>Under the DPDP Act, you have the following rights:</p>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            <li>
              <strong>Right to know:</strong> information about the personal data collected and the
              purpose of processing
            </li>
            <li>
              <strong>Right to access:</strong> a summary of your personal data held by us and the
              processing activities
            </li>
            <li>
              <strong>Right to correction:</strong> update inaccurate or incomplete personal data
            </li>
            <li>
              <strong>Right to erasure:</strong> delete your personal data (subject to legal
              retention requirements)
            </li>
            <li>
              <strong>Right to grievance redressal:</strong> lodge a complaint with our Grievance
              Officer
            </li>
            <li>
              <strong>Right to nominate:</strong> nominate a person to manage your data in case of
              death or incapacity
            </li>
            <li>
              <strong>Right to withdraw consent:</strong> at any time, with the same ease as you
              gave it
            </li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email us at privacy@beyondvyu.app. We will respond
            within 30 days as required by the DPDP Act.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">11. Cookies &amp; Tracking</h2>
          <p>
            We use cookies and similar technologies to improve your experience and analyze platform
            usage. When you first visit our website, you will be asked to consent to non-necessary
            cookies. You can categorize your preferences as follows:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            <li>
              <strong>Necessary:</strong> required for basic functionality (session management,
              authentication). Always enabled.
            </li>
            <li>
              <strong>Analytics:</strong> help us understand how you use our platform to improve it
            </li>
            <li>
              <strong>Marketing:</strong> used to deliver relevant advertisements and track campaign
              effectiveness
            </li>
          </ul>
          <p className="mt-3">
            You can change your cookie preferences at any time by clicking &ldquo;Cookie
            Preferences&rdquo; in the footer. You may withdraw consent for analytics and marketing
            cookies at any time.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">12. Children&apos;s Data</h2>
          <p>
            Our services are not directed at children under 18. We do not knowingly collect personal
            data from children. If we become aware that a child has provided us with personal data,
            we will delete it immediately.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">13. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be notified
            via email or through a notice on our platform. Continued use of BEYONDVYU after changes
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">14. Grievance Redressal</h2>
          <p>
            If you have any complaints or concerns regarding your personal data, please contact our
            Grievance Officer:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            <li>
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@beyondvyu.app" className="text-primary underline-offset-2 hover:underline">
                privacy@beyondvyu.app
              </a>
            </li>
            <li>
              <strong>Acknowledgment:</strong> within 24 hours
            </li>
            <li>
              <strong>Resolution:</strong> within 30 days
            </li>
          </ul>
          <p className="mt-3">
            If you are not satisfied with our response, you may file a complaint with the{" "}
            <strong>Data Protection Board of India</strong> as provided under the DPDP Act.
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
            { "@type": "ListItem", position: 2, name: "Privacy Policy", item: "https://beyondvyu.com/privacy" },
          ],
        }}
      />
    </div>
  );
}
