import type { Metadata } from "next"
import Link from "next/link"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"

export const metadata: Metadata = {
  title: "Data deletion status",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

type DeletionStatus = {
  confirmation_code?: string
  status?: string
  note?: string | null
  requested_at?: string
  completed_at?: string | null
  error?: string
}

async function loadStatus(code: string): Promise<DeletionStatus | null> {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
  try {
    const res = await fetch(`${api.replace(/\/$/, "")}/meta/data-deletion/${encodeURIComponent(code)}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return (await res.json()) as DeletionStatus
  } catch {
    return null
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function statusLabel(status?: string) {
  switch (status) {
    case "completed":
      return "Completed"
    case "no_data":
      return "Reviewed — no matching profile data"
    case "pending":
      return "In progress"
    default:
      return "Unknown"
  }
}

export default async function DataDeletionStatusPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const record = await loadStatus(code)

  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-28 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Privacy</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Data deletion status</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Confirmation code <span className="font-mono text-foreground">{code}</span>
        </p>

        {!record ? (
          <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="text-lg font-semibold">We could not find that request</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Check the link from Meta, or email{" "}
              <a
                href="mailto:support@beyondvyu.com?subject=Data%20deletion%20status"
                className="font-medium text-primary underline underline-offset-2"
              >
                support@beyondvyu.com
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {statusLabel(record.status)}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
              <span className="text-sm text-muted-foreground">Requested</span>
              <span className="text-sm font-medium">{formatDate(record.requested_at)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
              <span className="text-sm text-muted-foreground">Completed</span>
              <span className="text-sm font-medium">{formatDate(record.completed_at)}</span>
            </div>
            {record.note && (
              <p className="border-t border-border/40 pt-4 text-sm leading-relaxed text-muted-foreground">
                {record.note}
              </p>
            )}
          </div>
        )}

        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
          See the{" "}
          <Link href="/data-deletion" className="font-medium text-primary underline underline-offset-2">
            data deletion instructions
          </Link>{" "}
          or the{" "}
          <Link href="/privacy" className="font-medium text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
      <MarketingFooter />
    </div>
  )
}
