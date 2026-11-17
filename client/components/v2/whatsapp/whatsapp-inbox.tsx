"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, MessageSquare, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Conversation {
  id: string
  name: string | null
  phone: string
  consentStatus: string
  marketingOptIn: boolean
  marketingOptOut: boolean
  lastInboundAt: string | null
  lastOutboundAt: string | null
  serviceWindowOpen: boolean
  needsReply: boolean
  lastMessage: {
    id: string
    direction: string
    status: string
    bodyPreview: string | null
    createdAt: string
  } | null
}

interface Message {
  id: string
  direction: string
  messageType: string
  templateName: string | null
  status: string
  bodyPreview: string | null
  errorMessage: string | null
  createdAt: string
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function WhatsAppInbox({ businessId }: { businessId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [thread, setThread] = useState<{
    contact: Conversation
    messages: Message[]
    serviceWindowOpen: boolean
  } | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.v2.whatsapp.conversations(businessId)
      setConversations(data.conversations || [])
    } catch (err: any) {
      toast.error(err?.message || "Could not load conversations")
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!selectedId) {
      setThread(null)
      return
    }
    let cancelled = false
    setThreadLoading(true)
    api.v2.whatsapp
      .conversation(businessId, selectedId)
      .then((data) => {
        if (!cancelled) setThread(data as any)
      })
      .catch((err: any) => {
        if (!cancelled) toast.error(err?.message || "Could not load this conversation")
      })
      .finally(() => {
        if (!cancelled) setThreadLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessId, selectedId])

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId],
  )

  async function sendReply() {
    if (!selectedId || !reply.trim()) return
    setSending(true)
    try {
      await api.v2.whatsapp.reply({ businessId, contactId: selectedId, text: reply.trim() })
      setReply("")
      toast.success("Reply sent")
      await loadConversations()
      const data = await api.v2.whatsapp.conversation(businessId, selectedId)
      setThread(data as any)
    } catch (err: any) {
      toast.error(err?.message || "Could not send reply")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading conversations…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              <CardTitle>Customer inbox</CardTitle>
            </div>
            <CardDescription>
              Replies are free-form only inside the 24-hour window that opens when a customer messages
              you. Outside that window, use an approved template.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadConversations}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No conversations yet. Messages appear here after a customer replies or opts in through a
            template.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="max-h-[520px] space-y-1 overflow-y-auto rounded-lg border p-1">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full rounded-md p-3 text-left transition ${
                    selectedId === conversation.id ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {conversation.name || `+${conversation.phone}`}
                    </p>
                    {conversation.needsReply && (
                      <span className="size-2 shrink-0 rounded-full bg-emerald-500" title="Needs reply" />
                    )}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {conversation.lastMessage?.bodyPreview || "No messages yet"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {conversation.serviceWindowOpen && (
                      <Badge variant="secondary" className="text-[10px]">window open</Badge>
                    )}
                    {conversation.marketingOptOut && (
                      <Badge variant="outline" className="text-[10px]">marketing stopped</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex min-h-[420px] flex-col rounded-lg border">
              {!selected || !thread ? (
                <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                  {threadLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Choose a conversation"
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {thread.contact.name || `+${thread.contact.phone}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Last inbound: {formatDate(thread.contact.lastInboundAt)}
                      </p>
                    </div>
                    <Badge variant={thread.serviceWindowOpen ? "default" : "outline"}>
                      {thread.serviceWindowOpen ? "24h window open" : "window closed"}
                    </Badge>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {thread.messages.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground">No messages yet.</p>
                    ) : (
                      thread.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.direction === "INBOUND" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                              message.direction === "INBOUND"
                                ? "bg-muted text-foreground"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.bodyPreview || `[${message.messageType.toLowerCase()}]`}</p>
                            <p
                              className={`mt-1 text-[10px] ${
                                message.direction === "INBOUND"
                                  ? "text-muted-foreground"
                                  : "text-primary-foreground/70"
                              }`}
                            >
                              {formatDate(message.createdAt)} · {message.status.toLowerCase()}
                              {message.templateName ? ` · ${message.templateName}` : ""}
                            </p>
                            {message.errorMessage && (
                              <p className="mt-1 text-[10px] text-red-200">{message.errorMessage}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t p-3">
                    {thread.serviceWindowOpen ? (
                      <div className="flex gap-2">
                        <Input
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault()
                              sendReply()
                            }
                          }}
                          placeholder="Write a reply…"
                          disabled={sending}
                        />
                        <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        The 24-hour service window is closed. Send an approved template from the Send tab
                        instead of free-form text.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
