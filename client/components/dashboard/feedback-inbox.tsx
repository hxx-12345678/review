"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Inbox, Loader2, Search, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StarRating } from "@/components/star-rating"
import { timeAgo } from "@/lib/format"
import { api } from "@/lib/api"

const TOUCHPOINTS = [
  { value: "table", label: "Table stand" },
  { value: "bill", label: "Bill / checkout" },
  { value: "packaging", label: "Packaging" },
  { value: "reception", label: "Reception" },
  { value: "takeaway", label: "Takeaway counter" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "link", label: "Shared link" },
  { value: "other", label: "Other" },
]

const RATING_FILTERS = [
  { value: "any", label: "Any rating" },
  { value: "dissatisfied", label: "Dissatisfied (1–2★)", maxRating: 2 },
  { value: "neutral", label: "Neutral or below (≤3★)", maxRating: 3 },
  { value: "promoters", label: "Promoters (4–5★)", minRating: 4 },
  { value: "five", label: "5★ only", minRating: 5 },
]

const TOUCHPOINT_LABELS: Record<string, string> = Object.fromEntries(
  TOUCHPOINTS.map((touchpoint) => [touchpoint.value, touchpoint.label]),
)

interface FeedbackRow {
  id: string
  rating: number
  touchpoint: string | null
  customerName: string | null
  customerEmail: string | null
  purchaseInfo: string | null
  liked: string | null
  improvement: string | null
  privateNote: string | null
  status: string
  createdAt: string
  reviewDraft?: { content?: string; status?: string } | null
  generatedReply?: { status?: string } | null
  _count?: { reviewClicks: number }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function statusLabel(status: string): string {
  return status
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function FeedbackSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((index) => (
        <Card key={index} className="animate-pulse p-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
          <div className="mt-3 h-3 w-3/4 rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
        </Card>
      ))}
    </div>
  )
}

export function FeedbackInbox({ businessId }: { businessId: string }) {
  const [items, setItems] = useState<FeedbackRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [ratingFilter, setRatingFilter] = useState("any")
  const [touchpoint, setTouchpoint] = useState("all")
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  // Debounce typing so each keystroke does not hit the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const rating = RATING_FILTERS.find((option) => option.value === ratingFilter)
      const res = await api.feedback.list(businessId, {
        page,
        limit: 20,
        search: search || undefined,
        minRating: rating?.minRating,
        maxRating: rating?.maxRating,
        touchpoint: touchpoint === "all" ? undefined : touchpoint,
      })
      setItems(res.feedback as FeedbackRow[])
      setPagination(res.pagination as Pagination)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [businessId, page, search, ratingFilter, touchpoint])

  useEffect(() => {
    load()
  }, [load])

  const hasFilters = search.length > 0 || ratingFilter !== "any" || touchpoint !== "all"

  function clearFilters() {
    setSearchInput("")
    setSearch("")
    setRatingFilter("any")
    setTouchpoint("all")
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search comments, visit reason or touchpoint"
            className="pl-8"
            aria-label="Search feedback"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select value={ratingFilter} onValueChange={(value) => { setRatingFilter(value ?? "any"); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[190px]" aria-label="Filter by rating">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RATING_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={touchpoint} onValueChange={(value) => { setTouchpoint(value ?? "all"); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filter by touchpoint">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All touchpoints</SelectItem>
            {TOUCHPOINTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          {loading
            ? "Loading feedback…"
            : `${pagination?.total ?? 0} guest report${(pagination?.total ?? 0) === 1 ? "" : "s"}${
                hasFilters ? " match these filters" : ""
              }`}
        </p>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          )}
          <Link
            href="/v2/tasks"
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
          >
            Manager queue
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      {failed ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <p className="text-sm font-medium text-foreground">Could not load feedback</p>
          <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        </Card>
      ) : loading ? (
        <FeedbackSkeleton />
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <Inbox className="size-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {hasFilters ? "No feedback matches these filters" : "No guest feedback yet"}
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            {hasFilters
              ? "Try a different rating, touchpoint or search term."
              : "Place your QR at the table or bill counter. Guest reports will appear here as soon as they arrive."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const hasText = Boolean(item.liked || item.improvement || item.privateNote || item.reviewDraft?.content)
            const replyStatus = item.generatedReply?.status
            return (
              <Card key={item.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRating value={item.rating} readOnly size={14} />
                    <span className="text-xs font-semibold tabular-nums text-foreground">{item.rating}/5</span>
                    {item.touchpoint && (
                      <Badge variant="secondary" className="text-[10px]">
                        {TOUCHPOINT_LABELS[item.touchpoint] ?? statusLabel(item.touchpoint)}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {statusLabel(item.status)}
                    </Badge>
                    {replyStatus && (
                      <Badge variant={replyStatus === "REPLIED" ? "default" : "secondary"} className="text-[10px]">
                        Reply {statusLabel(replyStatus)}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {item.customerName?.trim() || "Anonymous guest"}
                  {item.purchaseInfo ? ` · ${item.purchaseInfo}` : ""}
                </p>

                <div className="mt-3 space-y-1.5 text-sm">
                  {item.liked && (
                    <p className="text-foreground">
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">Liked:</span> {item.liked}
                    </p>
                  )}
                  {item.improvement && (
                    <p className="text-foreground">
                      <span className="font-medium text-amber-700 dark:text-amber-400">Could improve:</span>{" "}
                      {item.improvement}
                    </p>
                  )}
                  {item.privateNote && (
                    <p className="text-foreground">
                      <span className="font-medium text-muted-foreground">Private note:</span> {item.privateNote}
                    </p>
                  )}
                  {!hasText && <p className="text-xs italic text-muted-foreground">Rating only — no written comment.</p>}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <span>
                    {(item._count?.reviewClicks ?? 0) > 0
                      ? `${item._count?.reviewClicks} Google review click${item._count?.reviewClicks === 1 ? "" : "s"}`
                      : "No Google review click yet"}
                  </span>
                  {item.reviewDraft?.content && <span>Review draft saved</span>}
                  {item.customerEmail && <span>Email captured</span>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
            disabled={page >= pagination.totalPages || loading}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {loading && items.length > 0 && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Refreshing…
        </p>
      )}
    </div>
  )
}
