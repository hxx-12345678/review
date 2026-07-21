import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for BEYONDVYU review management platform. Learn about your rights, obligations, and compliance requirements when using our service.",
  alternates: { canonical: "https://beyondvyu.com/terms" },
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 min-w-0 overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="mb-8 text-3xl font-bold">Terms of Service</h1>
        <p className="mb-4 text-sm text-muted-foreground">Last updated: July 8, 2026</p>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the BEYONDVYU platform,
            website, dashboard, API, widgets, and related services (collectively, the &ldquo;Service&rdquo;).
            By creating an account, accessing the dashboard, or using the Service in any way, you agree to be
            bound by these Terms. If you do not agree, do not use the Service.
          </p>
          <p>
            If you are accepting on behalf of a business or other entity, you represent that you have full
            authority to bind that entity to these Terms.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">2. Description of Service</h2>
          <p>
            BEYONDVYU is a software platform that helps local businesses collect authentic customer feedback and
            convert it into Google reviews. The Service provides:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>A branded review collection flow accessible via QR code or link</li>
            <li>AI-powered talking points that remind customers of their experience without writing the review for them</li>
            <li>Review draft generation based on customer feedback (always editable by the customer)</li>
            <li>Analytics dashboard showing feedback trends, conversion rates, and review performance</li>
            <li>Integration with Google Reviews and the Google Places API</li>
            <li>SMS and email review request templates</li>
          </ul>
          <p>
            BEYONDVYU never writes or posts reviews on behalf of any customer. All reviews are written by
            customers in their own words. The Service is designed to comply with Google&rsquo;s review policies
            and FTC guidelines on endorsements and testimonials.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">3. Eligibility and Account Registration</h2>
          <p>You must be at least 18 years old to use the Service. By registering, you agree to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Provide accurate, current, and complete account information</li>
            <li>Maintain the security of your password and account credentials</li>
            <li>Accept responsibility for all activity that occurs under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
            <li>Not create accounts through automated means or for purposes of abuse</li>
          </ul>
          <p>
            You are responsible for all activity conducted through your account, including actions taken by your
            employees, contractors, or agents.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">4. Subscription Plans, Billing, and Payment</h2>
          <p>
            The Service is offered on a subscription basis. Fees, billing intervals, and plan features are
            displayed on our pricing page at the time of purchase.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Fees are billed in advance on a monthly or annual basis, depending on your selected plan</li>
            <li>All fees are non-refundable except as required by applicable law or as expressly stated in these Terms</li>
            <li>Subscriptions automatically renew at the end of each billing period unless cancelled before the renewal date</li>
            <li>You authorize us to charge your payment method on file for all applicable fees</li>
            <li>Fees exclude all taxes, and you are responsible for any applicable sales, use, VAT, or other taxes</li>
            <li>We may change our fees with 30 days&rsquo; notice. Price changes take effect at the start of the next billing period</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">5. Customer Data and Content Ownership</h2>
          <p>
            You retain full ownership of all data, content, and materials you upload to or generate through the
            Service (&ldquo;Customer Data&rdquo;), including customer feedback, review drafts, business
            information, and contact lists.
          </p>
          <p>
            You grant BEYONDVYU a worldwide, non-exclusive, royalty-free license to host, store, process,
            transmit, display, and reproduce Customer Data solely for the purpose of providing the Service to
            you and improving it. This license continues for the duration of your use of the Service.
          </p>
          <p>
            You represent and warrant that:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>You have obtained all necessary consents from your customers to collect and process their feedback</li>
            <li>Your Customer Data does not violate any applicable law or third-party rights</li>
            <li>You have provided adequate notice to your customers about how their data is collected and used</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">6. Acceptable Use and Prohibited Conduct</h2>
          <p>You agree not to use the Service to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Collect or solicit reviews in a way that violates Google&rsquo;s review policies or FTC guidelines</li>
            <li>Offer incentives, discounts, or payments in exchange for reviews (positive or negative)</li>
            <li>Write or post reviews on behalf of your customers</li>
            <li>Gate, filter, or restrict review collection based on the likely sentiment of the feedback</li>
            <li>Harass, abuse, or spam users of the Service</li>
            <li>Upload malware, viruses, or malicious code</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its systems</li>
            <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">7. Review Compliance</h2>
          <p>
            BEYONDVYU is designed for compliant review collection. The following rules are enforced by the
            platform by design and cannot be disabled:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li><strong>No review gating:</strong> Every customer sees the same Google review link, regardless of their rating or feedback. You cannot condition review collection on positive feedback.</li>
            <li><strong>No writing on behalf of customers:</strong> AI generates talking points that remind customers of their experience. Customers always write their own review in their own words. The platform never posts to Google on anyone&rsquo;s behalf.</li>
            <li><strong>Authenticity checks:</strong> Automated checks flag generic, templated, or artificially similar review drafts to help maintain genuineness.</li>
            <li><strong>Transparency:</strong> Customers are informed that they are leaving a Google review and that their feedback (excluding private notes) may be shared with the business.</li>
          </ul>
          <p>
            You are solely responsible for ensuring that your use of the Service complies with all applicable
            laws, regulations, and platform policies, including Google&rsquo;s Terms of Service, the FTC&rsquo;s
            Guides Concerning the Use of Endorsements and Testimonials in Advertising, and any applicable state
            or federal consumer protection laws.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">8. Third-Party Platforms and Integrations</h2>
          <p>
            The Service integrates with third-party platforms, including Google Reviews and the Google Places
            API. Your use of those platforms is governed by their own terms and privacy policies. We are not
            responsible for the availability, accuracy, or actions of any third-party service.
          </p>
          <p>
            When you connect a Google account or use the Google Places API integration, you authorize
            BEYONDVYU to access, retrieve, and process data from those services on your behalf as needed to
            provide the Service. Google may restrict, block, or modify access to their data at any time, and
            we do not guarantee uninterrupted access to any third-party platform.
          </p>
          <p>
            If you use SMS messaging features, you are responsible for complying with the Telephone Consumer
            Protection Act (TCPA), CTIA guidelines, and carrier requirements, including obtaining prior
            express written consent from message recipients and honoring opt-out requests.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">9. AI Features</h2>
          <p>
            The Service includes AI-powered features such as talking point generation, review draft creation,
            and sentiment analysis. These features use third-party AI models.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>AI-generated content is provided as a suggestion only</li>
            <li>You are solely responsible for reviewing, editing, and approving any content generated by AI features before use</li>
            <li>Relevant feedback data may be transmitted to third-party AI providers for processing</li>
            <li>We make no warranty as to the accuracy, appropriateness, or completeness of AI-generated content</li>
            <li>The AI never posts content to Google or any third-party platform on behalf of any user</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">10. Intellectual Property</h2>
          <p>
            The Service, including all software, designs, algorithms, trademarks, logos, documentation, and
            related technology, is owned by BEYONDVYU or its licensors. We grant you a limited,
            non-exclusive, non-transferable license to access and use the Service for your internal business
            purposes, subject to these Terms.
          </p>
          <p>
            You may not copy, modify, reverse engineer, distribute, sell, lease, or create derivative works of
            the Service or any part thereof, except as expressly permitted by these Terms.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">11. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTY OF
            ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, BEYONDVYU
            DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p>
            We do not warrant that:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>The Service will be uninterrupted, timely, secure, or error-free</li>
            <li>Reviews will be posted or displayed on any third-party platform</li>
            <li>Specific business outcomes (such as increased ratings or review volume) will result from using the Service</li>
            <li>AI-generated content will be accurate or appropriate</li>
            <li>Messages sent through the platform (email, SMS) will be delivered or received</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">12. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, BEYONDVYU SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST REVENUE,
            LOST DATA, OR BUSINESS INTERRUPTION, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
          </p>
          <p>
            OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU
            HAVE PAID US IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">13. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless BEYONDVYU and its officers, directors,
            employees, and agents from and against any claims, liabilities, damages, losses, and expenses
            (including reasonable legal fees) arising out of or related to:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Your use of the Service in violation of these Terms</li>
            <li>Your Customer Data or any content you submit through the Service</li>
            <li>Your violation of any applicable law or third-party right</li>
            <li>Your collection or use of customer data, including SMS messaging</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">14. Term and Termination</h2>
          <p>
            These Terms remain in effect for as long as you maintain an active account. You may terminate
            your account at any time through the dashboard or by contacting us.
          </p>
          <p>
            We may suspend or terminate your access to the Service immediately if:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>You breach these Terms</li>
            <li>Your use of the Service poses a risk to the platform or its users</li>
            <li>We are required to do so by law</li>
            <li>Your account is inactive for an extended period</li>
          </ul>
          <p>
            Upon termination, your right to access and use the Service ceases immediately. We will retain your
            Customer Data for a reasonable period to allow for export, after which it may be permanently
            deleted. You may request a data export before your account is terminated.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">15. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. When we make material changes, we will provide notice
            through the Service or by email. Your continued use of the Service after the effective date of the
            updated Terms constitutes your acceptance of the changes.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">16. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Delaware, United States, without regard to
            its conflict of laws principles. Any disputes arising under these Terms shall be resolved
            exclusively in the state or federal courts located in Delaware.
          </p>
          <p>
            The United Nations Convention on Contracts for the International Sale of Goods does not apply to
            these Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">17. Contact</h2>
          <p>
            For questions about these Terms, please contact us at:
          </p>
          <p className="text-muted-foreground">
            Email: legal@beyondvyu.com
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
            { "@type": "ListItem", position: 2, name: "Terms of Service", item: "https://beyondvyu.com/terms" },
          ],
        }}
      />
    </div>
  );
}
