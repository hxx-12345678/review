import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for BEYONDVYU. Start free and upgrade as you grow. Every plan is fully compliant with Google and FTC policy.",
  alternates: {
    canonical: "https://beyondvyu.com/pricing",
  },
  openGraph: {
    title: "Pricing — BEYONDVYU",
    description:
      "Simple, transparent pricing for BEYONDVYU. Start free and upgrade as you grow.",
    url: "https://beyondvyu.com/pricing",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "BEYONDVYU pricing plans",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — BEYONDVYU",
    description: "Simple, transparent pricing for BEYONDVYU. Start free and upgrade as you grow.",
    images: ["/icon-512x512.png"],
  },
}

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children
}
