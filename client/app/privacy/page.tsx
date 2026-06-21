import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 min-w-0 overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="mb-8 text-3xl font-bold">Privacy Policy</h1>
        <p className="mb-4 text-sm text-muted-foreground">Last updated: June 12, 2026</p>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">1. Information We Collect</h2>
          <p>
            When you use ReviewOS, we collect information you provide directly, including:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Account information: name, email address, and password</li>
            <li>Business information: business name, address, phone number, website, and Google Review URL</li>
            <li>Customer feedback: ratings, comments, and review drafts submitted through our platform</li>
            <li>Usage data: QR code scans, review clicks, and feature interactions</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>To provide and improve our review management services</li>
            <li>To generate review drafts based on customer feedback</li>
            <li>To send notifications about new feedback and reviews</li>
            <li>To analyze usage patterns and improve our platform</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">3. Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Service providers who help operate our platform (hosting, analytics)</li>
            <li>Google, only when you choose to redirect customers to Google Reviews</li>
            <li>Law enforcement when required by law</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">4. Data Security</h2>
          <p>
            We implement industry-standard security measures including encryption at rest and in transit,
            regular security audits, and access controls. Passwords are hashed using bcrypt with a cost factor of 12.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">5. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. You can request deletion of your
            account and associated data at any time by contacting us.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">6. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have rights to:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data</li>
            <li>Export your data</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">7. Consent</h2>
          <p>
            By using ReviewOS, you consent to our collection and use of information as described in this policy.
            We collect explicit consent from customers before processing their feedback.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">8. Contact</h2>
          <p>
            For privacy-related inquiries, contact us at privacy@reviewos.app.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
