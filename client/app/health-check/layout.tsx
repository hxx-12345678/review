import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Free Google Review Health Check — BeyondVyu",
  description:
    "Free instant audit: check your Google rating, review count, recency signal, and competitor gap in real-time. No sign-up required.",
  alternates: { canonical: "https://beyondvyu.com/health-check" },
  openGraph: {
    title: "Free Google Review Health Check — BeyondVyu",
    description:
      "Are AI search engines recommending your business? Enter your business for a free live audit.",
    url: "https://beyondvyu.com/health-check",
    type: "website",
  },
};

export default function HealthCheckLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://beyondvyu.com" },
            { "@type": "ListItem", position: 2, name: "Review Health Check", item: "https://beyondvyu.com/health-check" },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "BeyondVyu Free Google Review Health Check",
          url: "https://beyondvyu.com/health-check",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: "Instant, free audit tool that checks your Google Business Profile review recency, rating, total review count, and competitive gap.",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        }}
      />
    </>
  );
}
