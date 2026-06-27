"use client"

import { useState } from "react"
import { Sparkles, Check, Clock, MessageSquare, Filter, Loader2, Copy, Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StarRating } from "@/components/star-rating"
import { timeAgo } from "@/lib/format"
import { toast } from "sonner"
import { api } from "@/lib/api"

type FilterKey = "all" | "needs_reply" | "replied" | "negative"

function getInitial(name: string) {
  return (name || "?").charAt(0).toUpperCase()
}

export function ReviewInbox({ feedback, googleReviews, businessName, businessId }: { feedback: any[]; googleReviews?: any[]; businessName: string; businessId: string }) {
  const [items, setItems] = useState(feedback)
  const [googleItems, setGoogleItems] = useState(googleReviews || [])
  const [filter, setFilter] = useState<FilterKey>("all")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [replyTones, setReplyTones] = useState<Record<string, string>>({})

  const allItems = [
    ...googleItems.map((g: any) => ({
      id: `google-${g.id}`,
      isGoogleReview: true,
      _orig: g,
      rating: g.starRating,
      createdAt: g.createTime,
      customerName: g.reviewerName || "Google User",
      reviewText: g.comment || "",
      generatedReply: g.reviewReply ? { status: "REPLIED", content: g.reviewReply } : null,
      replyStatus: g.replyStatus || "NEEDS_REPLY",
      hasLocalReply: !!g.reviewReply,
    })),
    ...items.map((f: any) => ({
      id: f.id,
      isGoogleReview: false,
      _orig: f,
      rating: f.rating,
      createdAt: f.createdAt,
      customerName: f.customerName || "Anonymous",
      reviewText: f.reviewDraft?.content || "",
      purchaseInfo: f.purchaseInfo,
      liked: f.liked,
      improvement: f.improvement,
      privateNote: f.privateNote,
      status: f.status,
      reviewDraft: f.reviewDraft,
      generatedReply: f.generatedReply,
      replyStatus: f.generatedReply?.status || "NEEDS_REPLY",
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const filtered = allItems.filter((item: any) => {
    if (filter === "all") return true
    if (filter === "needs_reply") return !item.generatedReply || item.generatedReply.status === "DRAFT"
    if (filter === "replied") return item.generatedReply?.status === "REPLIED"
    if (filter === "negative") return item.rating <= 3
    return true
  })

  const needsReplyCount = allItems.filter((item: any) => !item.generatedReply || item.generatedReply.status !== "REPLIED").length

  function buildReviewText(item: any): string {
    if (item.reviewText) return item.reviewText
    if (item.privateNote && item.status === "PRIVATE_FEEDBACK") return item.privateNote
    const parts: string[] = []
    if (item.purchaseInfo) parts.push(`Visited for: ${item.purchaseInfo}`)
    if (item.liked) parts.push(`Liked: ${item.liked}`)
    if (item.improvement) parts.push(`Improvement suggestion: ${item.improvement}`)
    return parts.join(". ") || ""
  }

  async function generateReply(item: any) {
    setLoadingId(item.id)
    try {
      const reviewText = buildReviewText(item)
      const tone = replyTones[item.id] || "professional"

      if (item.isGoogleReview) {
        // For Google reviews, we generate a reply via the same AI endpoint
        const res = await fetch(`/api/generate-reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewText: reviewText,
            rating: item.rating,
            businessName,
            tone,
          }),
        })
        const data = await res.json()
        if (data.reply) {
          setDrafts((d) => ({ ...d, [item.id]: data.reply }))
        } else {
          toast.error("Couldn't generate a reply.")
        }
      } else {
        const res = await api.ai.generateReply({
          feedbackId: item._orig.id,
          businessId,
          tone,
          content: reviewText.length >= 3 ? reviewText : undefined,
        })

        if (res.reply?.content) {
          setDrafts((d) => ({ ...d, [item.id]: res.reply.content }))
        } else {
          toast.error("Couldn't generate a reply.")
        }
      }
    } catch {
      toast.error("Reply generation failed.")
    } finally {
      setLoadingId(null)
    }
  }

  async function postReply(item: any) {
    const text = drafts[item.id] ?? item.generatedReply?.content ?? ""
    if (!text.trim()) return
    try {
      if (item.isGoogleReview) {
        // Post reply back to Google via the API
        await api.googleReviews.reply(item._orig.id, text.trim())
        setGoogleItems((prev: any[]) =>
          prev.map((g: any) =>
            g.id === item._orig.id
              ? { ...g, reviewReply: text, replyStatus: "REPLIED" }
              : g
          )
        )
      } else {
        const replyId = item._orig.generatedReply?.id
        if (replyId) {
          await api.ai.updateReply(replyId, text.trim())
        }
        setItems((prev: any[]) =>
          prev.map((f: any) =>
            f.id === item._orig.id
              ? { ...f, generatedReply: { ...f.generatedReply, content: text, status: "REPLIED" } }
              : f
          )
        )
      }
      setActiveId(null)
      toast.success("Reply saved")
    } catch {
      toast.error("Failed to save reply.")
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="size-4" />
          {needsReplyCount} review{needsReplyCount === 1 ? "" : "s"} awaiting a reply
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 shrink-0 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
                  <SelectItem value="all">All reviews</SelectItem>
              <SelectItem value="needs_reply">Needs reply</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="negative">Low ratings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((item: any) => {
          const isOpen = activeId === item.id
          const draft = drafts[item.id] ?? item.generatedReply?.content ?? ""
          const replyStatus = item.isGoogleReview
            ? (item._orig.replyStatus || "NEEDS_REPLY")
            : (item.generatedReply?.status || "NEEDS_REPLY")
          const reviewText = buildReviewText(item)
          return (
            <Card key={item.id} className="gap-0 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <Avatar className={`size-9 shrink-0 ${item.isGoogleReview ? "bg-blue-500/10 text-blue-600" : "bg-secondary text-secondary-foreground"}`}>
                    <AvatarFallback className={item.isGoogleReview ? "bg-blue-500/10 text-blue-600" : "bg-secondary text-secondary-foreground"}>
                      {item.isGoogleReview ? <Globe className="size-4" /> : getInitial(item.customerName || item.id)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="truncate font-medium text-foreground">{item.customerName || "Anonymous"}</span>
                      {item.isGoogleReview && (
                        <Badge variant="secondary" className="shrink-0 gap-1 text-xs border-blue-200 dark:border-blue-800">
                          <Globe className="size-3" />
                          <span className="hidden sm:inline">Google</span>
                        </Badge>
                      )}
                      {!item.isGoogleReview && item.reviewDraft && (
                        <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                          <Sparkles className="size-3" />
                          <span className="hidden sm:inline">Draft ready</span>
                          <span className="sm:hidden">Draft</span>
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <StarRating value={item.rating} readOnly size={14} />
                      <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <ReplyStatusBadge status={replyStatus} />
              </div>

              {/* ACTUAL REVIEW TEXT — shown prominently */}
              {reviewText && (
                <div className="mt-3 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-foreground">
                  <p className="whitespace-pre-wrap leading-relaxed">{reviewText}</p>
                </div>
              )}

              {/* Additional context for non-Google feedback */}
              {!item.isGoogleReview && !reviewText && (
                <div className="mt-3 space-y-1 text-sm text-foreground">
                  {item.purchaseInfo && <p><span className="text-muted-foreground">Visited for:</span> {item.purchaseInfo}</p>}
                  {item.liked && <p><span className="text-muted-foreground">Liked:</span> {item.liked}</p>}
                  {item.improvement && <p><span className="text-muted-foreground">Improvement:</span> {item.improvement}</p>}
                  {item.privateNote && item.status === "PRIVATE_FEEDBACK" && <p><span className="text-muted-foreground">Private note:</span> {item.privateNote}</p>}
                </div>
              )}

              {!isOpen ? (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant={replyStatus === "REPLIED" ? "outline" : "default"}
                    onClick={() => setActiveId(item.id)}
                  >
                    {replyStatus === "REPLIED" ? "Edit reply" : "Reply"}
                  </Button>
                  {replyStatus !== "REPLIED" && (
                    <Button size="sm" variant="ghost" onClick={() => (setActiveId(item.id), generateReply(item))}>
                      <Sparkles className="size-4" />
                      Draft with AI
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-foreground">Your reply</span>
                    <div className="flex items-center gap-2">
                      <Select value={replyTones[item.id] || "professional"} onValueChange={(v) => v && setReplyTones((prev) => ({ ...prev, [item.id]: v }))}>
                        <SelectTrigger className="h-8 w-full sm:w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => generateReply(item)}
                        disabled={loadingId === item.id}
                        className="shrink-0"
                      >
                        {loadingId === item.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-4" />
                        )}
                        <span className="hidden sm:inline">{draft ? "Regenerate" : "Generate"}</span>
                        <span className="sm:hidden">{draft ? "Re-gen" : "Generate"}</span>
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                    placeholder="Write a warm, specific reply..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    AI drafts a starting point — edit it to sound like you before posting.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => postReply(item)} disabled={!draft.trim()}>
                      <Check className="size-4" />
                      {item.isGoogleReview ? "Post to Google" : "Save reply"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard?.writeText(draft)
                        toast.success("Reply copied")
                      }}
                      disabled={!draft.trim()}
                    >
                      <Copy className="size-4" />
                      Copy
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setActiveId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-sm text-muted-foreground">No reviews match this filter.</p>
          </Card>
        )}
      </div>
    </div>
  )
}

function ReplyStatusBadge({ status }: { status: string }) {
  if (status === "REPLIED") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        <Check className="size-3" />
        Replied
      </span>
    )
  }
  if (status === "DRAFT") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
        Draft saved
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Clock className="size-3" />
      Needs reply
    </span>
  )
}
