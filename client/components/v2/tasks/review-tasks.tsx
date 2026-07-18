"use client"

import { useState, useEffect } from "react"
import {
  Check,
  Clock,
  AlertCircle,
  MessageSquare,
  Star,
  Bell,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { timeAgo } from "@/lib/format"

interface Task {
  id: string
  title: string
  description: string | null
  taskType: string
  priority: string
  status: string
  source: string | null
  referenceId: string | null
  dueAt: string | null
  assignedTo: string | null
  completedAt: string | null
  createdAt: string
}

const typeMeta: Record<string, { label: string; color: string }> = {
  follow_up: { label: "Follow-up", color: "bg-blue-500/10 text-blue-600" },
  reply: { label: "Reply", color: "bg-green-500/10 text-green-600" },
  review_request: { label: "Review Request", color: "bg-purple-500/10 text-purple-600" },
}

type View = "all" | "pending" | "overdue" | "done"

interface Props {
  businessId: string
}

export function ReviewTasks({ businessId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<View>("all")
  const [loading, setLoading] = useState(true)
  const [autoGenerating, setAutoGenerating] = useState(false)

  async function loadTasks() {
    setLoading(true)
    try {
      const statusMap: Record<string, string | undefined> = {
        all: undefined,
        pending: "pending",
        overdue: "overdue",
        done: "done",
      }
      const res = await api.v2.tasks.list(businessId, { status: statusMap[view] })
      setTasks(res.tasks)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTasks() }, [businessId, view])

  async function toggleDone(task: Task) {
    try {
      const newStatus = task.status === "done" ? "pending" : "done"
      await api.v2.tasks.update(task.id, { status: newStatus })
      loadTasks()
    } catch {
      toast.error("Failed to update task")
    }
  }

  async function deleteTask(taskId: string) {
    try {
      await api.v2.tasks.delete(taskId)
      toast.success("Task deleted")
      loadTasks()
    } catch {
      toast.error("Failed to delete task")
    }
  }

  async function autoGenerate() {
    setAutoGenerating(true)
    try {
      const res = await api.v2.tasks.autoGenerate(businessId)
      toast.success(`Created ${res.created} new tasks`)
      loadTasks()
    } catch {
      toast.error("Failed to auto-generate tasks")
    } finally {
      setAutoGenerating(false)
    }
  }

  const counts = {
    all: tasks.filter((t) => t.status !== "done").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    done: tasks.filter((t) => t.status === "done").length,
  }

  const tabs: { key: View; label: string; count: number }[] = [
    { key: "all", label: "All open", count: counts.all },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "overdue", label: "Overdue", count: counts.overdue },
    { key: "done", label: "Completed", count: counts.done },
  ]

  const priorityColor = (p: string) => {
    if (p === "high") return "border-l-destructive"
    if (p === "normal") return "border-l-primary"
    return "border-l-muted-foreground"
  }

  return (
    <div className="space-y-4">
      {/* Auto-generate banner */}
      <Card className="p-4 flex items-start gap-3 border-primary/30 bg-primary/5">
        <Sparkles className="mt-0.5 size-5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Auto-generate tasks from reviews</p>
          <p className="text-xs text-muted-foreground mt-1">
            Automatically create follow-up tasks for negative reviews, pending Google replies, and other action items.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={autoGenerate} disabled={autoGenerating}>
          {autoGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate
        </Button>
      </Card>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === t.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                t.key === "overdue" && t.count > 0
                  ? "bg-destructive/15 text-destructive"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isDone = task.status === "done"
            const isOverdue = task.status === "overdue"
            const meta = typeMeta[task.taskType] || typeMeta.follow_up
            return (
              <Card
                key={task.id}
                className={`flex items-start gap-3 p-4 border-l-4 ${priorityColor(task.priority)} ${
                  isOverdue ? "border-destructive/30" : ""
                } ${isDone ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => toggleDone(task)}
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 hover:border-primary"
                  }`}
                >
                  {isDone && <Check className="size-3" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {meta.label}
                    </span>
                    <p className={`truncate text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                      {task.title}
                    </p>
                  </div>

                  {task.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {task.assignedTo && (
                      <span className="flex items-center gap-1">
                        <span className="size-3 rounded-full bg-secondary inline-block" />
                        {task.assignedTo}
                      </span>
                    )}
                    {task.dueAt && (
                      <span className={isOverdue && !isDone ? "font-medium text-destructive" : ""}>
                        {isDone ? "Completed" : `${isOverdue ? "Overdue" : "Due"} ${timeAgo(task.dueAt)}`}
                      </span>
                    )}
                    {task.source && (
                      <span className="text-[10px] text-muted-foreground/60">via {task.source}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </Card>
            )
          })}

          {tasks.length === 0 && (
            <Card className="py-12 text-center">
              <Check className="mx-auto size-6 text-primary" />
              <p className="mt-2 text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground">No tasks in this view.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
