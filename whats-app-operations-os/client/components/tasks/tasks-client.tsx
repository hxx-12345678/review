"use client"

import { useState } from "react"
import {
  Check,
  IndianRupee,
  FileText,
  PhoneCall,
  Bell,
  CircleDot,
  Quote,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui-bits"
import {
  followUpTasks as seedTasks,
  customerById,
  agentById,
} from "@/lib/mock-data"
import type { FollowUpTask, TaskType } from "@/lib/types"
import { relativeTime, taskStatusMeta } from "@/lib/format"

const typeMeta: Record<TaskType, { label: string; icon: React.ElementType }> = {
  payment: { label: "Payment", icon: IndianRupee },
  quotation: { label: "Quotation", icon: FileText },
  callback: { label: "Callback", icon: PhoneCall },
  follow_up: { label: "Follow-up", icon: Bell },
  custom: { label: "Task", icon: CircleDot },
}

type View = "all" | "today" | "overdue" | "done"

export function TasksClient() {
  const [tasks, setTasks] = useState<FollowUpTask[]>(seedTasks)
  const [view, setView] = useState<View>("all")

  function toggleDone(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "done" ? "pending" : "done" }
          : t,
      ),
    )
  }

  const counts = {
    all: tasks.filter((t) => t.status !== "done").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
    today: tasks.filter((t) => {
      const due = new Date(t.dueAt)
      const today = new Date()
      return (
        t.status !== "done" &&
        due.toDateString() === today.toDateString()
      )
    }).length,
    done: tasks.filter((t) => t.status === "done").length,
  }

  const visible = tasks
    .filter((t) => {
      if (view === "all") return t.status !== "done"
      if (view === "done") return t.status === "done"
      if (view === "overdue") return t.status === "overdue"
      if (view === "today") {
        const due = new Date(t.dueAt)
        return (
          t.status !== "done" &&
          due.toDateString() === new Date().toDateString()
        )
      }
      return true
    })
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))

  const tabs: { key: View; label: string; count: number }[] = [
    { key: "all", label: "All open", count: counts.all },
    { key: "overdue", label: "Overdue", count: counts.overdue },
    { key: "today", label: "Due today", count: counts.today },
    { key: "done", label: "Completed", count: counts.done },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* Why it matters banner */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Bell className="mt-0.5 size-4 text-primary" />
        <div>
          <p className="text-sm font-medium">
            Relay remembers what your team forgets.
          </p>
          <p className="text-xs text-muted-foreground">
            Every promise a customer makes — &quot;I&apos;ll pay Friday&quot;,
            &quot;send the quote&quot; — becomes a tracked task with an owner and a
            due date.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === t.key
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                t.key === "overdue" && t.count > 0
                  ? "bg-destructive/15 text-destructive"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.map((task) => {
          const customer = customerById(task.customerId)!
          const agent = agentById(task.assignedTo)
          const Icon = typeMeta[task.type].icon
          const isDone = task.status === "done"
          const isOverdue = task.status === "overdue"
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors",
                isOverdue ? "border-destructive/30" : "border-border",
              )}
            >
              <button
                onClick={() => toggleDone(task.id)}
                aria-label={isDone ? "Mark as not done" : "Mark as done"}
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 hover:border-primary",
                )}
              >
                {isDone && <Check className="size-3" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <Icon className="size-3" />
                    {typeMeta[task.type].label}
                  </span>
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      isDone && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </p>
                </div>

                {task.sourceQuote && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs italic text-muted-foreground">
                    <Quote className="mt-0.5 size-3 shrink-0" />
                    {task.sourceQuote}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{customer.name}</span>
                  {agent && (
                    <span className="flex items-center gap-1.5">
                      <Avatar
                        initials={agent.initials}
                        color={agent.avatarColor}
                        size={16}
                      />
                      {agent.name.split(" ")[0]}
                    </span>
                  )}
                  <span
                    className={cn(
                      isOverdue && !isDone && "font-medium text-destructive",
                    )}
                  >
                    {isDone
                      ? "Completed"
                      : `${isOverdue ? "Overdue" : "Due"} ${relativeTime(task.dueAt)}`}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {visible.length === 0 && (
          <div className="rounded-xl border border-border bg-card py-12 text-center">
            <Check className="mx-auto size-6 text-primary" />
            <p className="mt-2 text-sm font-medium">All clear</p>
            <p className="text-xs text-muted-foreground">
              Nothing in this view right now.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
