import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Free Google Review Health Check",
  description:
    "Free instant audit: your Google rating, review count, recent activity and competitor gap — live data, no account. Unlock velocity, responses and funnel with BeyondVyu.",
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
  return children;
}
