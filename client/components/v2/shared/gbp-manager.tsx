"use client"

import { useState, useEffect } from "react"
import {
  Globe,
  Star,
  RefreshCw,
  Send,
  Loader2,
  Check,
  Clock,
  Trash2,
  Filter,
  Sparkles,
} from "lucide-react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { timeAgo } from "@/lib/format"

interface GbpReview {
  id: string
  googleReviewId: string
  reviewerName: string | null
  reviewerPhotoUrl: string | null
  starRating: number
  comment: string | null
  createTime: string
  reviewReply: string | null
  replyStatus: string
  googleAccount?: { accessToken: string } | null
}

interface Props {
  businessId: string
  businessName: string
}

export function GbpManager({ businessId, businessName }: Props) {
  const [reviews, setReviews] = useState<GbpReview[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState("all")
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [bulkText, setBulkText] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  async function loadData() {
    setLoading(true)
    try {
      const [reviewRes, statsRes] = await Promise.all([
        api.v2.gbp.reviews(businessId, {
          status: filter === "all" ? undefined : filter,
        }),
        api.v2.gbp.stats(businessId),
      ])
      setReviews(reviewRes.reviews)
      setStats(statsRes)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [businessId, filter])

  async function sync() {
    setSyncing(true)
    try {
      const res = await api.v2.gbp.sync(businessId)
      toast.success(`Synced ${res.synced} reviews`)
      loadData()
    } catch {
      toast.error("Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  async function sendReply(reviewId: string) {
    const text = replyDrafts[reviewId]
    if (!text?.trim()) return
    setSendingId(reviewId)
    try {
      const res = await api.v2.gbp.reply({ reviewId, replyText: text.trim() })
      toast.success(res.postedToGoogle ? "Reply posted to Google" : "Reply saved locally")
      setReplyDrafts((d) => ({ ...d, [reviewId]: "" }))
      loadData()
    } catch {
      toast.error("Failed to post reply")
    } finally {
      setSendingId(null)
    }
  }

  async function bulkReply() {
    if (!bulkText.trim() || selectedIds.size === 0) return
    try {
      const res = await api.v2.gbp.bulkReply({
        reviewIds: Array.from(selectedIds),
        replyText: bulkText.trim(),
      })
      toast.success(`Replied to ${res.updatedCount} reviews`)
      setSelectedIds(new Set())
      setBulkText("")
      loadData()
    } catch {
      toast.error("Bulk reply failed")
    }
  }

  async function deleteReview(reviewId: string) {
    try {
      await api.v2.gbp.deleteReview(reviewId)
      toast.success("Review deleted")
      loadData()
    } catch {
      toast.error("Failed to delete review")
    }
  }

  function toggleSelect(reviewId: string) {
    const next = new Set(selectedIds)
    if (next.has(reviewId)) next.delete(reviewId)
    else next.add(reviewId)
    setSelectedIds(next)
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.needsReply}</p>
            <p className="text-xs text-muted-foreground">Needs Reply</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.replied}</p>
            <p className="text-xs text-muted-foreground">Replied</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.averageRating ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => { if (v) setFilter(v); }}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reviews</SelectItem>
              <SelectItem value="NEEDS_REPLY">Needs reply</SelectItem>
              <SelectItem value="REPLIED">Replied</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
          <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
          Sync
        </Button>
      </div>

      {/* Bulk reply */}
      {selectedIds.size > 0 && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <p className="text-sm font-medium mb-2">{selectedIds.size} reviews selected</p>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Write a bulk reply for all selected reviews..."
            rows={2}
            className="mb-2"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={bulkReply} disabled={!bulkText.trim()}>
              <Send className="size-4" />
              Reply to all selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Reviews */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className={`p-4 ${review.replyStatus === "NEEDS_REPLY" ? "border-l-destructive border-l-4" : ""}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(review.id)}
                  onChange={() => toggleSelect(review.id)}
                  className="mt-1 size-4 shrink-0"
                />
                <Avatar className="size-9 shrink-0 bg-blue-500/10 text-blue-600">
                  <AvatarFallback>{(review.reviewerName || "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{review.reviewerName || "Google User"}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`size-3 ${i < review.starRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <Badge variant={review.replyStatus === "REPLIED" ? "secondary" : "default"} className="text-[10px]">
                      {review.replyStatus === "REPLIED" ? "Replied" : "Needs reply"}
                    </Badge>
                  </div>

                  {review.comment && (
                    <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{review.comment}</p>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    <Clock className="size-3 inline mr-1" />
                    {timeAgo(review.createTime)}
                  </p>

                  {/* Reply section */}
                  {review.replyStatus !== "REPLIED" && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        value={replyDrafts[review.id] || (review.reviewReply || "")}
                        onChange={(e) => setReplyDrafts((d) => ({ ...d, [review.id]: e.target.value }))}
                        placeholder="Write a reply..."
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => sendReply(review.id)}
                          disabled={sendingId === review.id || !replyDrafts[review.id]?.trim()}
                        >
                          {sendingId === review.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                          Post to Google
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteReview(review.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Show existing reply */}
                  {review.reviewReply && review.replyStatus === "REPLIED" && (
                    <div className="mt-2 rounded-lg bg-muted/30 p-3 text-sm border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Your reply:</p>
                      <p>{review.reviewReply}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {reviews.length === 0 && (
            <Card className="py-12 text-center">
              <Globe className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No Google reviews found. Connect your Google account and sync.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
