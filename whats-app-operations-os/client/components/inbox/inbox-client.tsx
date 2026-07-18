"use client"

import { useMemo, useState } from "react"
import {
  Send,
  StickyNote,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  Eye,
  ChevronDown,
  FileText,
  Phone,
  Mail,
  Building2,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, Pill, StatusDot, Tag } from "@/components/ui-bits"
import {
  conversations as seedConversations,
  messages as seedMessages,
  agents,
  currentAgent,
  customerById,
  agentById,
  followUpTasks,
} from "@/lib/mock-data"
import type { Conversation, Message, ConversationStatus } from "@/lib/types"
import {
  relativeTime,
  clockTime,
  conversationStatusMeta,
  stageMeta,
  formatCurrency,
  formatWindow,
  countryFlag,
} from "@/lib/format"

type Filter = "all" | "mine" | "unassigned" | ConversationStatus

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "Mine" },
  { key: "unassigned", label: "Unassigned" },
  { key: "open", label: "Open" },
  { key: "follow_up", label: "Follow-up" },
]

export function InboxClient() {
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations)
  const [allMessages, setAllMessages] = useState<Message[]>(seedMessages)
  const [activeId, setActiveId] = useState<string>(seedConversations[0].id)
  const [filter, setFilter] = useState<Filter>("all")
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply")
  const [draft, setDraft] = useState("")
  const [assignOpen, setAssignOpen] = useState(false)

  const filtered = useMemo(() => {
    return conversations
      .filter((c) => {
        if (filter === "all") return c.status !== "closed"
        if (filter === "mine") return c.assignedTo === currentAgent.id
        if (filter === "unassigned") return !c.assignedTo
        return c.status === filter
      })
      .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
  }, [conversations, filter])

  const active = conversations.find((c) => c.id === activeId)
  const activeCustomer = active ? customerById(active.customerId) : undefined
  const thread = allMessages
    .filter((m) => m.conversationId === activeId)
    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))

  const collidingAgents =
    active?.viewingAgentIds?.filter((id) => id !== currentAgent.id) ?? []

  function updateActive(patch: Partial<Conversation>) {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, ...patch } : c)),
    )
  }

  function send() {
    if (!draft.trim() || !active) return
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      conversationId: active.id,
      direction: composerMode === "note" ? "inbound" : "outbound",
      type: composerMode === "note" ? "note" : "text",
      authorId: currentAgent.id,
      status: composerMode === "note" ? undefined : "sent",
      body: draft.trim(),
      timestamp: new Date().toISOString(),
    }
    setAllMessages((prev) => [...prev, newMsg])
    if (composerMode === "reply") {
      updateActive({
        lastMessagePreview: draft.trim(),
        lastMessageAt: newMsg.timestamp,
        status: "waiting",
        assignedTo: active.assignedTo ?? currentAgent.id,
        unread: 0,
      })
    }
    setDraft("")
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Conversation list */}
      <div className="flex w-full shrink-0 flex-col border-r border-border md:w-80 lg:w-96">
        <div className="border-b border-border p-3">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {filters.map((f) => {
              const count = conversations.filter((c) => {
                if (f.key === "all") return c.status !== "closed"
                if (f.key === "mine") return c.assignedTo === currentAgent.id
                if (f.key === "unassigned") return !c.assignedTo
                return c.status === f.key
              }).length
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    filter === f.key
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                  <span className="tabular-nums opacity-60">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((conv) => {
            const customer = customerById(conv.customerId)!
            const agent = agentById(conv.assignedTo)
            const isActive = conv.id === activeId
            return (
              <li key={conv.id}>
                <button
                  onClick={() => setActiveId(conv.id)}
                  className={cn(
                    "flex w-full gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors",
                    isActive ? "bg-accent/60" : "hover:bg-accent/30",
                  )}
                >
                  <Avatar
                    initials={customer.name.slice(0, 2).toUpperCase()}
                    color={stageMeta[customer.stage].color}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{customer.name}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {relativeTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {conv.lastMessagePreview}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Pill
                        color={conversationStatusMeta[conv.status].color}
                        label={conversationStatusMeta[conv.status].label}
                      />
                      {!agent && (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
                          Unassigned
                        </span>
                      )}
                      {conv.unread > 0 && (
                        <span className="ml-auto flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
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

      {/* Thread */}
      {active && activeCustomer ? (
        <div className="hidden min-w-0 flex-1 flex-col md:flex">
          {/* Thread header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Avatar
              initials={activeCustomer.name.slice(0, 2).toUpperCase()}
              color={stageMeta[activeCustomer.stage].color}
              size={36}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{activeCustomer.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {countryFlag(activeCustomer.countryCode)} {activeCustomer.phone}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* Status switcher */}
              <select
                value={active.status}
                onChange={(e) =>
                  updateActive({ status: e.target.value as ConversationStatus })
                }
                className="rounded-md border border-border bg-card px-2 py-1.5 text-xs font-medium outline-none"
              >
                <option value="open">Open</option>
                <option value="waiting">Waiting</option>
                <option value="follow_up">Follow-up</option>
                <option value="closed">Closed</option>
              </select>

              {/* Assignment */}
              <div className="relative">
                <button
                  onClick={() => setAssignOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-medium"
                >
                  {agentById(active.assignedTo) ? (
                    <>
                      <Avatar
                        initials={agentById(active.assignedTo)!.initials}
                        color={agentById(active.assignedTo)!.avatarColor}
                        size={18}
                      />
                      <span className="hidden lg:inline">
                        {agentById(active.assignedTo)!.name.split(" ")[0]}
                      </span>
                    </>
                  ) : (
                    <span className="text-warning">Assign</span>
                  )}
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
                {assignOpen && (
                  <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-md border border-border bg-popover p-1 shadow-lg">
                    {agents.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          updateActive({ assignedTo: a.id })
                          setAssignOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                      >
                        <Avatar initials={a.initials} color={a.avatarColor} size={20} />
                        <span className="flex-1">{a.name}</span>
                        {active.assignedTo === a.id && (
                          <Check className="size-3.5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collision + window banners */}
          {collidingAgents.length > 0 && (
            <div className="flex items-center gap-2 border-b border-border bg-warning/10 px-4 py-2 text-xs text-warning">
              <Eye className="size-3.5" />
              {collidingAgents.map((id) => agentById(id)?.name.split(" ")[0]).join(", ")}{" "}
              {collidingAgents.length > 1 ? "are" : "is"} also viewing this conversation
            </div>
          )}

          {/* Messages */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-background/40 p-4">
            {thread.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3">
            <div className="mb-2 flex items-center gap-2">
              <button
                onClick={() => setComposerMode("reply")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                  composerMode === "reply"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Send className="size-3.5" /> Reply
              </button>
              <button
                onClick={() => setComposerMode("note")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                  composerMode === "note"
                    ? "bg-warning/15 text-warning"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <StickyNote className="size-3.5" /> Internal note
              </button>
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="size-3.5" />
                {formatWindow(active.windowMinutesLeft)}
              </div>
            </div>

            <div
              className={cn(
                "rounded-lg border bg-card p-2",
                composerMode === "note" ? "border-warning/40 bg-warning/5" : "border-border",
              )}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send()
                }}
                rows={2}
                placeholder={
                  composerMode === "note"
                    ? "Add an internal note for your team (not sent to customer)…"
                    : "Type a reply… (⌘+Enter to send)"
                }
                className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  <button className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
                    <Paperclip className="size-4" />
                  </button>
                  <button className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
                    <FileText className="size-4" />
                  </button>
                  <button className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-primary/10">
                    <Sparkles className="size-3.5" /> Draft with AI
                  </button>
                </div>
                <button
                  onClick={send}
                  disabled={!draft.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
                >
                  {composerMode === "note" ? "Save note" : "Send"}
                  <Send className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Customer context panel */}
      {active && activeCustomer ? (
        <aside className="hidden w-72 shrink-0 flex-col border-l border-border xl:flex">
          <div className="overflow-y-auto p-4">
            <div className="flex flex-col items-center text-center">
              <Avatar
                initials={activeCustomer.name.slice(0, 2).toUpperCase()}
                color={stageMeta[activeCustomer.stage].color}
                size={56}
              />
              <p className="mt-2 text-sm font-semibold">{activeCustomer.name}</p>
              {activeCustomer.company && (
                <p className="text-xs text-muted-foreground">
                  {activeCustomer.company}
                </p>
              )}
              <div className="mt-2">
                <Pill
                  color={stageMeta[activeCustomer.stage].color}
                  label={stageMeta[activeCustomer.stage].label}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <ContactRow icon={Phone} value={activeCustomer.phone} />
              {activeCustomer.email && (
                <ContactRow icon={Mail} value={activeCustomer.email} />
              )}
              <ContactRow
                icon={Building2}
                value={`${countryFlag(activeCustomer.countryCode)} ${activeCustomer.country}`}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric
                label="Deal value"
                value={formatCurrency(activeCustomer.dealValue, activeCustomer.currency)}
              />
              <Metric
                label="Lifetime"
                value={formatCurrency(activeCustomer.lifetimeValue, activeCustomer.currency)}
              />
            </div>

            {activeCustomer.tags.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeCustomer.tags.map((t) => (
                    <Tag key={t} label={t} />
                  ))}
                </div>
              </div>
            )}

            {activeCustomer.notes && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Account note
                </p>
                <p className="text-xs leading-relaxed">{activeCustomer.notes}</p>
              </div>
            )}

            {/* Open tasks for this customer */}
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Open follow-ups
              </p>
              <div className="space-y-1.5">
                {followUpTasks
                  .filter(
                    (t) =>
                      t.customerId === activeCustomer.id && t.status !== "done",
                  )
                  .map((t) => (
                    <div
                      key={t.id}
                      className="rounded-md border border-border bg-card p-2"
                    >
                      <p className="text-xs font-medium leading-snug">{t.title}</p>
                      <p
                        className={cn(
                          "mt-0.5 text-[10px]",
                          t.status === "overdue"
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {t.status === "overdue" ? "Overdue " : "Due "}
                        {relativeTime(t.dueAt)}
                      </p>
                    </div>
                  ))}
                {followUpTasks.filter(
                  (t) => t.customerId === activeCustomer.id && t.status !== "done",
                ).length === 0 && (
                  <p className="text-xs text-muted-foreground">No open tasks.</p>
                )}
              </div>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  if (message.type === "note") {
    const author = agentById(message.authorId)
    return (
      <div className="mx-auto w-full max-w-xl rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-warning">
          <StickyNote className="size-3" />
          Internal note · {author?.name ?? "Team"} · {clockTime(message.timestamp)}
        </div>
        <p className="text-xs leading-relaxed text-foreground">{message.body}</p>
      </div>
    )
  }

  const outbound = message.direction === "outbound"
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          outbound
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-card text-card-foreground",
        )}
      >
        {message.type === "document" ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded",
                outbound ? "bg-primary-foreground/20" : "bg-secondary",
              )}
            >
              <FileText className="size-4" />
            </span>
            <span className="font-medium">{message.body}</span>
          </div>
        ) : (
          <p>{message.body}</p>
        )}
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            outbound ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {clockTime(message.timestamp)}
          {outbound &&
            (message.status === "read" ? (
              <CheckCheck className="size-3.5 text-info" />
            ) : message.status === "delivered" ? (
              <CheckCheck className="size-3.5" />
            ) : (
              <Check className="size-3.5" />
            ))}
        </div>
      </div>
    </div>
  )
}

function ContactRow({
  icon: Icon,
  value,
}: {
  icon: React.ElementType
  value: string
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate text-foreground">{value}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}
