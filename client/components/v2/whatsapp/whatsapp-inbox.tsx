"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCheck, Clock, Loader2, MessageSquare, RefreshCw, Send, ShieldCheck, User } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

function formatTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
  const [search, setSearch] = useState("")

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.v2.whatsapp.conversations(businessId)
      const list = data.conversations || []
      setConversations(list)
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id)
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not load conversations")
    } finally {
      setLoading(false)
    }
  }, [businessId, selectedId])

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
        if (!cancelled) toast.error(err?.message || "Could not load this chat")
      })
      .finally(() => {
        if (!cancelled) setThreadLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessId, selectedId])

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId],
  )

  async function sendReply() {
    if (!selectedId || !reply.trim()) return
    setSending(true)
    try {
      await api.v2.whatsapp.reply({ businessId, contactId: selectedId, text: reply.trim() })
      setReply("")
      toast.success("Message sent")
      await loadConversations()
      const data = await api.v2.whatsapp.conversation(businessId, selectedId)
      setThread(data as any)
    } catch (err: any) {
      toast.error(err?.message || "Could not send reply")
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(
      (c) =>
        c.phone.includes(q) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.lastMessage?.bodyPreview && c.lastMessage.bodyPreview.toLowerCase().includes(q)),
    )
  }, [conversations, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[360px] gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-[#25D366]" />
        Loading chats…
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-xs grid lg:grid-cols-[320px_1fr] min-h-[560px]">
      {/* Left Column: WhatsApp Chats List */}
      <div className="border-r flex flex-col bg-muted/20">
        {/* Header & Search */}
        <div className="p-3 border-b bg-background space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="size-4 text-[#25D366]" />
              WhatsApp Chats
            </h4>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={loadConversations}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or phone…"
            className="h-8 text-xs rounded-lg"
          />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">No conversations yet</p>
              <p>Customers will appear here when they receive messages or reply.</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedId
              const displayName = conv.name || `+${conv.phone}`

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full p-3 text-left transition flex items-start gap-3 ${
                    isSelected
                      ? "bg-emerald-500/10 dark:bg-emerald-950/30 border-l-4 border-[#25D366]"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <div className="size-9 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                      {conv.lastMessage?.createdAt && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {conv.lastMessage?.bodyPreview || "No messages yet"}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5">
                      {conv.serviceWindowOpen ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-100/80 dark:bg-emerald-900/40 px-1.5 py-0.2 rounded-full">
                          24h window open
                        </span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">Standard</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right Column: WhatsApp Chat Pane */}
      <div className="flex flex-col h-full bg-[#EFEAE2] dark:bg-[#0B141A] relative">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-2xl">
              💬
            </div>
            <p className="text-sm font-semibold text-foreground">Select a conversation</p>
            <p className="text-xs">Choose a customer from the left to view messages and reply.</p>
          </div>
        ) : (
          <>
            {/* Chat Top Header */}
            <div className="bg-[#075E54] text-white px-4 py-2.5 flex items-center justify-between shadow-xs z-10">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0 text-white border border-white/30">
                  {(selected.name || selected.phone).slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">
                    {selected.name || `+${selected.phone}`}
                  </p>
                  <p className="text-[10px] text-emerald-200 font-mono">+{selected.phone}</p>
                </div>
              </div>

              <div>
                {thread?.serviceWindowOpen ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 text-slate-900 px-2.5 py-0.5 text-[10px] font-bold">
                    ✓ 24h Chat Open
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 text-white/90 px-2.5 py-0.5 text-[10px] font-medium">
                    Template mode
                  </span>
                )}
              </div>
            </div>

            {/* Chat Messages Feed with WhatsApp Bubbles */}
            <div
              className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col justify-end"
              style={{
                backgroundImage: "radial-gradient(#0000000a 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            >
              {threadLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-emerald-600" />
                </div>
              ) : !thread || thread.messages.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  <p className="bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full inline-block shadow-xs">
                    🔒 Messages are end-to-end encrypted with WhatsApp Cloud API.
                  </p>
                </div>
              ) : (
                thread.messages.map((msg) => {
                  const isInbound = msg.direction === "INBOUND"

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl p-2.5 shadow-xs text-xs relative ${
                          isInbound
                            ? "bg-white dark:bg-[#202C33] text-slate-900 dark:text-slate-100 rounded-tl-xs"
                            : "bg-[#D9FDD3] dark:bg-[#005C4B] text-slate-900 dark:text-slate-100 rounded-tr-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.bodyPreview || `[${msg.messageType}]`}
                        </p>

                        <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-500 dark:text-slate-400">
                          <span>{formatTime(msg.createdAt)}</span>
                          {!isInbound && <CheckCheck className="size-3 text-[#53BDEB]" />}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Bottom Message Input Bar */}
            <div className="p-3 bg-[#F0F2F5] dark:bg-[#202C33] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              {thread?.serviceWindowOpen ? (
                <>
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendReply()
                      }
                    }}
                    placeholder="Type a message to customer…"
                    className="flex-1 bg-white dark:bg-[#2A3942] rounded-full px-4 text-xs h-10 border-none shadow-xs"
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    className="size-10 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white shrink-0 shadow-xs"
                    disabled={sending || !reply.trim()}
                    onClick={sendReply}
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </>
              ) : (
                <div className="flex-1 bg-white/70 dark:bg-slate-800/70 p-2.5 rounded-xl text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    24h customer window is closed. Send an approved template from <strong>Send &amp; Broadcast</strong>.
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
