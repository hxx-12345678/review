"use client"

import { useState, useEffect } from "react"
import {
  MessageSquare,
  RefreshCw,
  Send,
  Loader2,
  ExternalLink,
  AtSign,
  Check,
  Clock,
} from "lucide-react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { timeAgo } from "@/lib/format"

interface Mention {
  id: string
  igMediaId: string
  igCommentId: string | null
  mentionerName: string
  commentText: string
  mediaType: string
  mediaUrl: string | null
  permalink: string | null
  isReply: boolean
  replied: boolean
  replyText: string | null
  repliedAt: string | null
  createdAt: string
  sentiment: string | null
}

interface Props {
  businessId: string
}

export function InstagramMentions({ businessId }: Props) {
  const [mentions, setMentions] = useState<Mention[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")

  async function loadMentions() {
    setLoading(true)
    try {
      const replied = filter === "unreplied" ? "false" : filter === "replied" ? "true" : undefined
      const res = await api.v2.instagram.mentions(businessId, replied)
      setMentions(res.mentions)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMentions() }, [businessId, filter])

  async function sync() {
    setSyncing(true)
    try {
      const res = await api.v2.instagram.sync(businessId)
      toast.success(`Synced ${res.synced} new mentions`)
      loadMentions()
    } catch {
      toast.error("Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  async function sendReply(mentionId: string) {
    const text = replyDrafts[mentionId]
    if (!text?.trim()) return
    setSendingId(mentionId)
    try {
      await api.v2.instagram.reply({ mentionId, replyText: text.trim() })
      setReplyDrafts((d) => ({ ...d, [mentionId]: "" }))
      toast.success("Reply posted to Instagram")
      loadMentions()
    } catch {
      toast.error("Failed to post reply")
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sync button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {["all", "unreplied", "replied"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
          <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
          Sync
        </Button>
      </div>

      {/* Mention list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {mentions.map((mention) => (
            <Card key={mention.id} className={`p-4 ${mention.replied ? "opacity-60" : "border-primary/30"}`}>
              <div className="flex items-start gap-3">
                <Avatar className="size-9 shrink-0 bg-pink-500/10 text-pink-600">
                  <AvatarFallback>{(mention.mentionerName || "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">@{mention.mentionerName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {mention.mediaType}
                    </Badge>
                    {mention.replied && <Badge className="text-[10px] bg-green-500/10 text-green-600">Replied</Badge>}
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{mention.commentText}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {timeAgo(mention.createdAt)}
                    </span>
                    {mention.permalink && (
                      <a
                        href={mention.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        View
                      </a>
                    )}
                  </div>

                  {/* Reply section */}
                  {!mention.replied && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        value={replyDrafts[mention.id] || ""}
                        onChange={(e) => setReplyDrafts((d) => ({ ...d, [mention.id]: e.target.value }))}
                        placeholder="Write a reply..."
                        rows={2}
                      />
                      <Button
                        size="sm"
                        onClick={() => sendReply(mention.id)}
                        disabled={sendingId === mention.id || !replyDrafts[mention.id]?.trim()}
                      >
                        {sendingId === mention.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        Reply on Instagram
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {mentions.length === 0 && (
            <Card className="py-12 text-center">
              <AtSign className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No @mentions found</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
