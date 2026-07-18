"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Send,
  Check,
  Globe,
  MessageSquare,
  AtSign,
  Smartphone,
  Mail,
  Loader2,
  Filter,
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

interface Message {
  id: string
  platform: string
  direction: string
  authorName: string | null
  content: string
  status: string
  replyText: string | null
  repliedAt: string | null
  createdAt: string
  conversationId: string | null
  externalId: string | null
}

interface Conversation {
  conversationId: string
  platform: string
  authorName: string
  messages: Message[]
  lastMessageAt: string
  unread: number
}

const platformMeta: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  google: { label: "Google", icon: Globe, color: "bg-blue-500/10 text-blue-600" },
  instagram: { label: "Instagram", icon: AtSign, color: "bg-pink-500/10 text-pink-600" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "bg-green-500/10 text-green-600" },
  sms: { label: "SMS", icon: Smartphone, color: "bg-purple-500/10 text-purple-600" },
  email: { label: "Email", icon: Mail, color: "bg-orange-500/10 text-orange-600" },
}

interface Props {
  businessId: string
}

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const meta = platformMeta[platform]
  if (!meta) return <MessageSquare className={className} />
  const Icon = meta.icon
  return <Icon className={className} />
}

export function UnifiedInbox({ businessId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  async function loadConversations() {
    try {
      const res = await api.v2.inbox.conversations(businessId)
      setConversations(res.conversations)
      if (res.conversations.length > 0 && !activeConvId) {
        setActiveConvId(res.conversations[0].conversationId)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadConversations() }, [businessId])

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filter === "all") return true
      if (filter === "unread") return c.unread > 0
      return c.platform === filter
    })
  }, [conversations, filter])

  const activeConv = conversations.find((c) => c.conversationId === activeConvId)
  const activeMessages = activeConv?.messages ?? []

  async function sendReply(convId: string) {
    const text = replyDrafts[convId]
    if (!text?.trim()) return
    setSendingId(convId)
    try {
      const outboundMsg = activeMessages.length > 0 ? activeMessages[activeMessages.length - 1] : null
      if (outboundMsg) {
        await api.v2.inbox.reply({ messageId: outboundMsg.id, replyText: text.trim() })
      }
      setReplyDrafts((d) => ({ ...d, [convId]: "" }))
      toast.success("Reply saved")
      loadConversations()
    } catch {
      toast.error("Failed to send reply")
    } finally {
      setSendingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 border border-border rounded-xl overflow-hidden">
      {/* Conversation list */}
      <div className="flex w-full shrink-0 flex-col border-r border-border md:w-72 lg:w-80">
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground shrink-0" />
            <Select value={filter} onValueChange={(v) => { if (v) setFilter(v); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((conv) => {
            const meta = platformMeta[conv.platform] || platformMeta.email
            const isActive = conv.conversationId === activeConvId
            const lastMsg = conv.messages[conv.messages.length - 1]
            return (
              <li key={conv.conversationId}>
                <button
                  onClick={() => setActiveConvId(conv.conversationId)}
                  className={`flex w-full gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors ${
                    isActive ? "bg-accent/60" : "hover:bg-accent/30"
                  }`}
                >
                  <Avatar className={`size-9 shrink-0 ${meta.color}`}>
                    <AvatarFallback className={meta.color}>
                      <PlatformIcon platform={conv.platform} className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{conv.authorName}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {lastMsg?.content || ""}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {meta.label}
                      </Badge>
                      {conv.unread > 0 && (
                        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Thread panel */}
      {activeConv ? (
        <div className="hidden min-w-0 flex-1 flex-col md:flex">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Avatar className={`size-9 ${platformMeta[activeConv.platform]?.color || ""}`}>
              <AvatarFallback>
                <PlatformIcon platform={activeConv.platform} className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{activeConv.authorName}</p>
              <p className="text-xs text-muted-foreground">{platformMeta[activeConv.platform]?.label}</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {activeConv.messages.length} messages
            </Badge>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-background/40 p-4">
            {activeMessages.map((msg) => {
              const isOutbound = msg.direction === "outbound"
              return (
                <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      isOutbound
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-card text-card-foreground border border-border"
                    }`}
                  >
                    {!isOutbound && msg.authorName && (
                      <p className="text-[10px] font-medium text-muted-foreground mb-1">{msg.authorName}</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <div className={`mt-1 flex items-center gap-1 text-[10px] ${isOutbound ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"}`}>
                      {timeAgo(msg.createdAt)}
                      {msg.status === "replied" && <Check className="size-3" />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Reply composer */}
          <div className="border-t border-border p-3">
            <Textarea
              value={replyDrafts[activeConv.conversationId] || ""}
              onChange={(e) => setReplyDrafts((d) => ({ ...d, [activeConv.conversationId]: e.target.value }))}
              placeholder={`Reply via ${platformMeta[activeConv.platform]?.label || "platform"}...`}
              rows={2}
              className="mb-2"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => sendReply(activeConv.conversationId)}
                disabled={sendingId === activeConv.conversationId || !replyDrafts[activeConv.conversationId]?.trim()}
              >
                {sendingId === activeConv.conversationId ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send reply
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <MessageSquare className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  )
}
