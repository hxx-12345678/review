"use client"

import dynamic from "next/dynamic"

const AuthRedirect = dynamic(
  () => import("@/components/marketing/auth-redirect").then((m) => ({ default: m.AuthRedirect })),
  { ssr: false },
)

const LandingAnimations = dynamic(
  () => import("@/components/marketing/landing-animations").then((m) => ({ default: m.LandingAnimations })),
  { ssr: false },
)

export function ClientEffects() {
  return (
    <>
      <AuthRedirect />
      <LandingAnimations />
    </>
  )
}
