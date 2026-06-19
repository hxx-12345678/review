"use client"

import { useState } from "react"
import { Sparkles, Check, Clock, MessageSquare, Filter, Loader2, Copy, Star } from "lucide-react"
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

export function ReviewInbox({ feedback, businessName, businessId }: { feedback: any[]; businessName: string; businessId: string }) {
  const [items, setItems] = useState(feedback)
  const [filter, setFilter] = useState<FilterKey>("all")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [replyTone, setReplyTone] = useState<string>("professional")

  const filtered = items.filter((f: any) => {
    if (filter === "all") return true
    if (filter === "needs_reply") return !f.generatedReply || f.generatedReply.status === "DRAFT"
    if (filter === "replied") return f.generatedReply?.status === "REPLIED"
    if (filter === "negative") return f.rating <= 3
    return true
  })

  const needsReplyCount = items.filter((f: any) => !f.generatedReply || f.generatedReply.status !== "REPLIED").length

  function buildReviewText(feedbackItem: any): string {
    const parts: string[] = []
    if (feedbackItem.purchaseInfo) parts.push(`Visited for: ${feedbackItem.purchaseInfo}`)
    if (feedbackItem.liked) parts.push(`Liked: ${feedbackItem.liked}`)
    if (feedbackItem.improvement) parts.push(`Improvement suggestion: ${feedbackItem.improvement}`)
    return parts.join(". ") || ""
  }

  async function generateReply(feedbackItem: any) {
    setLoadingId(feedbackItem.id)
    try {
      const reviewText = buildReviewText(feedbackItem)

      // Single AI call via backend route (which calls Gemini internally).
      // Previously two sequential Gemini calls were made here — this was
      // wasteful and cost 2x tokens per reply. Now one call handles both.
      const res = await api.ai.generateReply({
        feedbackId: feedbackItem.id,
        businessId,
        tone: replyTone,
        content: reviewText.length >= 3 ? reviewText : undefined,
      })

      if (res.reply?.content) {
        setDrafts((d) => ({ ...d, [feedbackItem.id]: res.reply.content }))
      } else {
        toast.error("Couldn't generate a reply.")
      }
    } catch {
      toast.error("Reply generation failed.")
    } finally {
      setLoadingId(null)
    }
  }

  async function postReply(feedbackItem: any) {
    const text = drafts[feedbackItem.id] ?? feedbackItem.generatedReply?.content ?? ""
    if (!text.trim()) return
    try {
      const replyId = feedbackItem.generatedReply?.id
      if (replyId) {
        await api.ai.updateReply(replyId, text.trim())
      }
      setItems((prev: any[]) =>
        prev.map((f: any) =>
          f.id === feedbackItem.id
            ? { ...f, generatedReply: { ...f.generatedReply, content: text, status: "REPLIED" } }
            : f
        )
      )
      setActiveId(null)
      toast.success("Reply saved")
    } catch {
      toast.error("Failed to save reply to server.")
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="size-4" />
          {needsReplyCount} feedback{needsReplyCount === 1 ? "" : "s"} awaiting a reply
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All feedback</SelectItem>
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
          const replyStatus = item.generatedReply?.status || "NEEDS_REPLY"
          return (
            <Card key={item.id} className="gap-0 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getInitial(item.customerName || item.id)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{item.customerName || "Anonymous"}</span>
                      {item.reviewDraft && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Sparkles className="size-3" />
                          Draft ready
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

              <div className="mt-3 space-y-1 text-sm text-foreground">
                {item.purchaseInfo && <p><span className="text-muted-foreground">Visited for:</span> {item.purchaseInfo}</p>}
                {item.liked && <p><span className="text-muted-foreground">Liked:</span> {item.liked}</p>}
                {item.improvement && <p><span className="text-muted-foreground">Improvement:</span> {item.improvement}</p>}
              </div>

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
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Your reply</span>
                    <div className="flex items-center gap-2">
                      <Select value={replyTone} onValueChange={(v) => setReplyTone(v)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
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
                      >
                        {loadingId === item.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-4" />
                        )}
                        {draft ? "Regenerate" : "Generate"}
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
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => postReply(item)} disabled={!draft.trim()}>
                      <Check className="size-4" />
                      Save reply
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
            <p className="text-sm text-muted-foreground">No feedback matches this filter.</p>
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
