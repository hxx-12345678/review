// Domain types for Relay — the WhatsApp Operations OS.
// These intentionally mirror the shape of the WhatsApp Business Cloud API
// (e.g. wa_id, message direction/status, template categories) so that the
// mock data layer can be replaced by real API + Postgres later with minimal churn.

export type AgentRole = "owner" | "admin" | "agent"

export interface Agent {
  id: string
  name: string
  email: string
  role: AgentRole
  avatarColor: string
  initials: string
  online: boolean
}

export type ConversationStatus = "open" | "waiting" | "follow_up" | "closed"
export type ConversationPriority = "low" | "normal" | "high"

// Mirrors WhatsApp Cloud API message status lifecycle.
export type MessageStatus = "sent" | "delivered" | "read" | "failed"
export type MessageDirection = "inbound" | "outbound"
export type MessageType = "text" | "image" | "document" | "template" | "note"

export interface Message {
  id: string
  conversationId: string
  direction: MessageDirection
  type: MessageType
  body: string
  // For internal notes: which agent wrote it. For outbound: which agent sent it.
  authorId?: string
  status?: MessageStatus
  // ISO timestamp
  timestamp: string
  // For document/image
  attachmentName?: string
}

export interface Conversation {
  id: string
  customerId: string
  status: ConversationStatus
  priority: ConversationPriority
  assignedTo?: string // agent id
  lastMessagePreview: string
  lastMessageAt: string
  unread: number
  // Whether the 24h customer service window is currently open (free-form replies allowed).
  windowOpen: boolean
  // Minutes remaining in the 24h service window (if open).
  windowMinutesLeft?: number
  labels: string[]
  // Agents currently viewing/typing — powers collision detection.
  viewingAgentIds?: string[]
}

export type PipelineStage =
  | "new"
  | "contacted"
  | "quotation"
  | "negotiation"
  | "won"
  | "lost"

export interface Customer {
  id: string
  name: string
  // WhatsApp id / phone in E.164 form.
  waId: string
  phone: string
  email?: string
  company?: string
  country: string
  countryCode: string
  tags: string[]
  lifetimeValue: number
  currency: "INR" | "USD"
  stage: PipelineStage
  dealValue: number
  ownerId?: string
  createdAt: string
  lastContactAt: string
  notes?: string
}

export type TaskType = "follow_up" | "payment" | "quotation" | "callback" | "custom"
export type TaskStatus = "pending" | "done" | "overdue"

export interface FollowUpTask {
  id: string
  title: string
  type: TaskType
  customerId: string
  conversationId?: string
  assignedTo: string
  dueAt: string
  status: TaskStatus
  // Original message that triggered this task (the thing humans forget).
  sourceQuote?: string
}

export interface OpsQueryResult {
  query: string
  answer: string
  // Optional structured rows to render as a table.
  columns?: string[]
  rows?: (string | number)[][]
}
