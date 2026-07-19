import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with BEYONDVYU. Email us at support@beyondvyu.app or reach out through our contact form.",
  alternates: {
    canonical: "https://beyondvyu.com/contact",
  },
  openGraph: {
    title: "Contact — BEYONDVYU",
    description: "Get in touch with the BEYONDVYU team.",
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
                <p className="mt-1 text-sm text-muted-foreground">support@beyondvyu.app</p>
                <p className="text-sm text-muted-foreground">sales@beyondvyu.app</p>
                <p className="mt-1 text-xs text-muted-foreground">We respond within 24 hours</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Phone className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-medium">Phone</h3>
                <p className="mt-1 text-sm text-muted-foreground">+1 (555) 000-0000</p>
                <p className="mt-1 text-xs text-muted-foreground">Mon-Fri, 9 AM - 6 PM PST</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <MapPin className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-medium">Business Address</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  123 Innovation Drive, Suite 400<br />
                  San Francisco, CA 94105<br />
                  United States
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Clock className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-medium">Business Hours</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Monday - Friday: 9:00 AM - 6:00 PM PST<br />
                  Saturday: 10:00 AM - 2:00 PM PST<br />
                  Sunday: Closed
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-4 font-medium">Send us a message</h3>
            <form
              action={`mailto:support@beyondvyu.app`}
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
    </div>
  );
}
