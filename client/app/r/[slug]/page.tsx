import { notFound } from "next/navigation"
import { FeedbackFlow } from "@/components/feedback/feedback-flow"

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

  return (
    <main className="flex min-h-dvh min-w-0 flex-col overflow-hidden bg-muted/40">
      <FeedbackFlow business={business} slug={slug} demo={isDemo} />
    </main>
  )
}
