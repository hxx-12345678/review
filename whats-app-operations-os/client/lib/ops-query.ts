import {
  customers,
  conversations,
  followUpTasks,
  agentById,
  customerById,
} from "./mock-data"
import { formatCurrency, relativeTime } from "./format"
import type { OpsQueryResult } from "./types"

// A lightweight, deterministic natural-language ops engine over the mock data.
// In production this becomes an LLM (Vercel AI SDK) with tool-calls that run
// the same scoped DB queries — task-specific and human-readable, which keeps it
// inside Meta's allowed "business assistant" category rather than a banned
// general-purpose chatbot.

function intentMatch(q: string, keywords: string[]) {
  const lower = q.toLowerCase()
  return keywords.some((k) => lower.includes(k))
}

export function runOpsQuery(query: string): OpsQueryResult {
  const q = query.trim()

  // Pending payments
  if (intentMatch(q, ["payment", "pay", "balance", "owe", "due money"])) {
    const tasks = followUpTasks.filter(
      (t) => t.type === "payment" && t.status !== "done",
    )
    return {
      query: q,
      answer:
        tasks.length === 0
          ? "No pending payments right now."
          : `You have ${tasks.length} pending payment${tasks.length > 1 ? "s" : ""} to chase.`,
      columns: ["Customer", "Task", "Due"],
      rows: tasks.map((t) => {
        const c = customerById(t.customerId)!
        return [c.name, t.title, relativeTime(t.dueAt)]
      }),
    }
  }

  // New / today's leads
  if (intentMatch(q, ["new lead", "today", "new customer", "fresh", "leads"])) {
    const news = customers.filter((c) => c.stage === "new")
    return {
      query: q,
      answer: `${news.length} new lead${news.length !== 1 ? "s" : ""} waiting to be qualified.`,
      columns: ["Lead", "Country", "Est. value"],
      rows: news.map((c) => [
        c.name,
        c.country,
        formatCurrency(c.dealValue, c.currency),
      ]),
    }
  }

  // Unassigned conversations
  if (intentMatch(q, ["unassigned", "no owner", "nobody", "who owns"])) {
    const unassigned = conversations.filter(
      (c) => !c.assignedTo && c.status !== "closed",
    )
    return {
      query: q,
      answer: `${unassigned.length} open conversation${unassigned.length !== 1 ? "s have" : " has"} no owner. Assign them to avoid dropped leads.`,
      columns: ["Customer", "Last message", "Waiting"],
      rows: unassigned.map((c) => {
        const cust = customerById(c.customerId)!
        return [cust.name, c.lastMessagePreview, relativeTime(c.lastMessageAt)]
      }),
    }
  }

  // Overdue follow-ups
  if (intentMatch(q, ["overdue", "missed", "late", "forgot", "behind"])) {
    const overdue = followUpTasks.filter((t) => t.status === "overdue")
    return {
      query: q,
      answer: `${overdue.length} follow-up${overdue.length !== 1 ? "s are" : " is"} overdue and need attention now.`,
      columns: ["Task", "Customer", "Owner"],
      rows: overdue.map((t) => {
        const c = customerById(t.customerId)!
        const a = agentById(t.assignedTo)
        return [t.title, c.name, a?.name.split(" ")[0] ?? "—"]
      }),
    }
  }

  // Top / biggest deals
  if (intentMatch(q, ["top", "biggest", "highest", "best deal", "largest", "value"])) {
    const top = [...customers]
      .filter((c) => c.stage !== "lost")
      .sort((a, b) => b.dealValue - a.dealValue)
      .slice(0, 5)
    return {
      query: q,
      answer: "Your highest-value active deals:",
      columns: ["Customer", "Stage", "Value"],
      rows: top.map((c) => [
        c.name,
        c.stage,
        formatCurrency(c.dealValue, c.currency),
      ]),
    }
  }

  // Won deals / revenue
  if (intentMatch(q, ["won", "closed deal", "revenue", "sales", "this week"])) {
    const won = customers.filter((c) => c.stage === "won")
    const totalINR = won
      .filter((c) => c.currency === "INR")
      .reduce((s, c) => s + c.dealValue, 0)
    const totalUSD = won
      .filter((c) => c.currency === "USD")
      .reduce((s, c) => s + c.dealValue, 0)
    return {
      query: q,
      answer: `${won.length} deal${won.length !== 1 ? "s" : ""} won — ${formatCurrency(totalINR, "INR")}${totalUSD ? ` + ${formatCurrency(totalUSD, "USD")}` : ""} in closed value.`,
      columns: ["Customer", "Value"],
      rows: won.map((c) => [c.name, formatCurrency(c.dealValue, c.currency)]),
    }
  }

  // Fallback summary
  const openConvos = conversations.filter((c) => c.status !== "closed").length
  const overdue = followUpTasks.filter((t) => t.status === "overdue").length
  return {
    query: q,
    answer: `Here's a quick snapshot: ${openConvos} open conversations, ${overdue} overdue follow-ups, and ${customers.filter((c) => c.stage === "new").length} new leads. Try asking about pending payments, unassigned chats, or your top deals.`,
  }
}

export const suggestedQueries = [
  "Who has pending payments?",
  "Show me new leads today",
  "Which conversations are unassigned?",
  "What follow-ups are overdue?",
  "What are my top deals?",
  "How much did we win this week?",
]
