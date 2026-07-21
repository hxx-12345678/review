import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Mail } from "lucide-react";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with BEYONDVYU. Email us at support@beyondvyu.com or reach out through our contact form.",
  alternates: {
    canonical: "https://beyondvyu.com/contact",
  },
  openGraph: {
    title: "Contact — BEYONDVYU",
    description: "Get in touch with the BEYONDVYU team.",
    url: "https://beyondvyu.com/contact",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Contact BEYONDVYU",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact — BEYONDVYU",
    description: "Get in touch with the BEYONDVYU team.",
    images: ["/icon-512x512.png"],
  },
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 min-w-0 overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="mb-2 text-3xl font-bold">Contact Us</h1>
        <p className="mb-10 text-muted-foreground">
          We are here to help. Reach out to us through any of the channels below.
        </p>

        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Mail className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-medium">Email</h3>
                <p className="mt-1 text-sm text-muted-foreground">support@beyondvyu.com</p>
                <p className="text-sm text-muted-foreground">sales@beyondvyu.com</p>
                <p className="mt-1 text-xs text-muted-foreground">We respond within 24 hours</p>
              </div>
            </div>


          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-4 font-medium">Send us a message</h3>
            <form
              action={`mailto:support@beyondvyu.com`}
              method="GET"
              encType="text/plain"
              className="space-y-4"
            >
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground">
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label htmlFor="body" className="block text-sm font-medium text-foreground">
                  Message
                </label>
                <textarea
                  id="body"
                  name="body"
                  required
                  rows={5}
                  className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Describe your issue or question..."
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Send via Email
              </button>
            </form>
          </div>
        </div>
      </main>
      <MarketingFooter />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://beyondvyu.com" },
            { "@type": "ListItem", position: 2, name: "Contact", item: "https://beyondvyu.com/contact" },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact BEYONDVYU",
          description: "Get in touch with the BEYONDVYU team for support, sales, or legal inquiries.",
          url: "https://beyondvyu.com/contact",
          mainEntity: {
            "@type": "Organization",
            name: "BEYONDVYU",
            contactPoint: [
              {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "support@beyondvyu.com",
                availableLanguage: ["English"],
              },
              {
                "@type": "ContactPoint",
                contactType: "sales",
                email: "sales@beyondvyu.com",
                availableLanguage: ["English"],
              },
              {
                "@type": "ContactPoint",
                contactType: "legal",
                email: "legal@beyondvyu.com",
                availableLanguage: ["English"],
              },
            ],
          },
        }}
      />
    </div>
  );
}
