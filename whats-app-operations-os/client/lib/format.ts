import type { PipelineStage, ConversationStatus, TaskStatus } from "./types"

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const abs = Math.abs(diff)
  const future = diff < 0
  const mins = Math.round(abs / 60_000)
  if (mins < 1) return future ? "now" : "just now"
  if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return future ? `in ${days}d` : `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatCurrency(amount: number, currency: "INR" | "USD"): string {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatWindow(minutes?: number): string {
  if (!minutes || minutes <= 0) return "Window closed"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h >= 1) return `${h}h ${m}m left`
  return `${m}m left`
}

export const stageMeta: Record<
  PipelineStage,
  { label: string; color: string }
> = {
  new: { label: "New", color: "var(--info)" },
  contacted: { label: "Contacted", color: "var(--chart-2)" },
  quotation: { label: "Quotation", color: "var(--warning)" },
  negotiation: { label: "Negotiation", color: "var(--chart-3)" },
  won: { label: "Won", color: "var(--success)" },
  lost: { label: "Lost", color: "var(--destructive)" },
}

export const pipelineOrder: PipelineStage[] = [
  "new",
  "contacted",
  "quotation",
  "negotiation",
  "won",
  "lost",
]

export const conversationStatusMeta: Record<
  ConversationStatus,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "var(--success)" },
  waiting: { label: "Waiting", color: "var(--warning)" },
  follow_up: { label: "Follow-up", color: "var(--info)" },
  closed: { label: "Closed", color: "var(--muted-foreground)" },
}

export const taskStatusMeta: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "var(--info)" },
  done: { label: "Done", color: "var(--success)" },
  overdue: { label: "Overdue", color: "var(--destructive)" },
}

export function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}
