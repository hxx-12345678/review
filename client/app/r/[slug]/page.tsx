import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { FeedbackFlow } from "@/components/feedback/feedback-flow"
import { NoReviewsScreen } from "@/components/feedback/no-reviews-screen"

async function getBusinessBySlug(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
  try {
    const res = await fetch(`${apiUrl}/feedback/public/${slug}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.business
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)

  if (!business) {
    return {
      title: "Review not found",
      robots: { index: false, follow: false },
    }
  }

  return {
    title: `Leave a review for ${business.name}`,
    description: `Share your experience with ${business.name}. Leave an authentic Google review through BEYONDVYU's secure feedback platform.`,
    robots: { index: false, follow: true },
    openGraph: {
      title: `Leave a review for ${business.name}`,
      description: `Share your experience with ${business.name}.`,
    },
  }
}

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ demo?: string; table?: string | string[]; staff?: string | string[]; touchpoint?: string | string[] }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const isDemo = sp?.demo === "true"
  // Query params are user-controlled; take the first value and clamp it so a
  // crafted or repeated link cannot push the payload past schema limits.
  const firstParam = (value: string | string[] | undefined, max: number) => {
    const raw = Array.isArray(value) ? value[0] : value
    return raw?.trim().slice(0, max) || undefined
  }
  const table = firstParam(sp?.table, 60)
  const staff = firstParam(sp?.staff, 60)
  const touchpoint = firstParam(sp?.touchpoint, 30)
  const business = await getBusinessBySlug(slug)

  if (!business) {
    notFound()
  }

  const subscription = business.subscription

  // Demo mode bypasses the subscription check so the flow can be previewed.
  // Capture the review whenever the owner has an entitled plan, even with zero
  // AI credits: writing and submitting a review is free, and blocking the QR
  // page would punish the business's customers for the owner's AI quota. AI
  // suggestions degrade gracefully inside the flow instead.
  const hasActivePlan =
    isDemo ||
    (subscription && ["active", "authenticated", "past_due"].includes(subscription.status))

  if (!hasActivePlan) {
    return (
      <main className="flex min-h-dvh min-w-0 flex-col overflow-hidden bg-muted/40">
        <NoReviewsScreen
          business={business}
          googleReviewUrl={business.googleReviewUrl || `https://www.google.com/maps/search/${encodeURIComponent(business.name)}`}
          demo={isDemo}
        />
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh min-w-0 flex-col overflow-hidden bg-muted/40">
      <FeedbackFlow business={business} slug={slug} demo={isDemo} table={table} staff={staff} touchpoint={touchpoint} />
    </main>
  )
}