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
  searchParams?: Promise<{ demo?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const isDemo = sp?.demo === "true"
  const business = await getBusinessBySlug(slug)

  if (!business) {
    notFound()
  }

  const subscription = business.subscription

  // Demo mode bypasses subscription check to allow previewing the flow
  // Real check: active/authenticated status AND remaining credits (monthly + top-up) > 0
  const hasActivePlan =
    isDemo ||
    (subscription &&
      ["active", "authenticated"].includes(subscription.status) &&
      (Math.max(0, (subscription.creditsLimit ?? 0) - (subscription.creditsUsed ?? 0)) +
        (subscription.creditsTopUpBalance ?? 0) >
        0))

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
      <FeedbackFlow business={business} slug={slug} demo={isDemo} />
    </main>
  )
}