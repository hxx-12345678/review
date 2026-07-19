import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for BEYONDVYU. Start free and upgrade as you grow. Every plan is fully compliant with Google and FTC policy.",
  openGraph: {
    title: "Pricing — BEYONDVYU",
    description:
      "Simple, transparent pricing for BEYONDVYU. Start free and upgrade as you grow.",
  },
}

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children
}
