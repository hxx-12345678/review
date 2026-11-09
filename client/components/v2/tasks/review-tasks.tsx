"use client"

import { useState, useEffect } from "react"
import {
  Check,
  Star,
  Loader2,
  Sparkles,
  Trash2,
  User,
  Flame,
  Save,
  ClipboardCheck,
} from "lucide-react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { timeAgo } from "@/lib/format"

interface TaskFeedback {
  id: string
  rating: number
  liked: string | null
  improvement: string | null
  privateNote: string | null
  customerName: string | null
  purchaseInfo: string | null
  touchpoint: string | null
  createdAt: string
}

interface Task {
  id: string
  title: string
  description: string | null
  taskType: string
  priority: string
  status: string
  source: string | null
  referenceId: string | null
  category: string | null
  issueKey: string | null
  occurrenceCount: number
  resolutionNotes: string | null
  escalatedAt: string | null
  dueAt: string | null
  assignedTo: string | null
  completedAt: string | null
  createdAt: string
  feedback?: TaskFeedback | null
}

const typeMeta: Record<string, { label: string; color: string }> = {
  follow_up: { label: "Follow-up", color: "bg-blue-500/10 text-blue-600" },
  reply: { label: "Reply", color: "bg-green-500/10 text-green-600" },
  review_request: { label: "Review Request", color: "bg-purple-500/10 text-purple-600" },
}

const categoryLabels: Record<string, string> = {
  safety: "Safety / allergen",
  food_quality: "Food quality",
  service: "Service",
  cleanliness: "Cleanliness",
  speed: "Speed / wait",
  takeaway: "Takeaway & packaging",
  ordering: "Ordering & billing",
  ambience: "Ambience",
  value: "Value for money",
  drinks: "Drinks & bar",
  other: "Other",
}

const touchpointLabels: Record<string, string> = {
  table: "Table stand",
  bill: "Bill / checkout",
  packaging: "Packaging",
  reception: "Reception",
  takeaway: "Takeaway counter",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  link: "Shared link",
  other: "Other",
}

const statusMeta: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "In progress", color: "bg-blue-500/10 text-blue-600" },
  overdue: { label: "Overdue", color: "bg-destructive/10 text-destructive" },
  escalated: { label: "Escalated", color: "bg-destructive/15 text-destructive" },
  done: { label: "Resolved", color: "bg-green-500/10 text-green-600" },
}

const categoryColor = (category: string | null) => {
  if (category === "safety") return "bg-destructive/10 text-destructive"
  if (category === "food_quality" || category === "cleanliness") return "bg-amber-500/10 text-amber-700 dark:text-amber-300"
  if (category === "service" || category === "speed") return "bg-blue-500/10 text-blue-600"
  return "bg-secondary text-muted-foreground"
}

type View = "open" | "escalated" | "overdue" | "in_progress" | "pending" | "done"

interface Props {
  businessId: string
}

export function ReviewTasks({ businessId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<View>("open")
  const [loading, setLoading] = useState(true)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    assignedTo: "",
    resolutionNotes: "",
    status: "pending",
  })

  async function loadTasks() {
    setLoading(true)
    try {
      // Fetch all tasks once; filtering client-side keeps tab counts accurate.
      const res = await api.v2.tasks.list(businessId)
      setTasks(res.tasks)
    } catch {
      // Keep the previous list on transient failures.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [businessId])

  function openDetails(task: Task) {
    if (expandedId === task.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(task.id)
    setForm({
      assignedTo: task.assignedTo || "",
      resolutionNotes: task.resolutionNotes || "",
      status: task.status,
    })
  }

  async function saveDetails(task: Task) {
    if (form.status === "done" && !form.resolutionNotes.trim()) {
      toast.error("Add a short resolution note before closing the issue")
      return
    }
    setSaving(true)
    try {
      await api.v2.tasks.update(task.id, {
        assignedTo: form.assignedTo.trim() || null,
        resolutionNotes: form.resolutionNotes.trim() || null,
        status: form.status,
      })
      toast.success(form.status === "done" ? "Issue resolved" : "Task updated")
      setExpandedId(null)
      loadTasks()
    } catch {
      toast.error("Failed to update task")
    } finally {
      setSaving(false)
    }
  }

  async function quickStatus(task: Task, status: string) {
    if (status === "done") {
      // Collect resolution notes instead of silently closing the loop.
      setExpandedId(task.id)
      setForm({
        assignedTo: task.assignedTo || "",
        resolutionNotes: task.resolutionNotes || "",
        status: "done",
      })
      return
    }
    try {
      await api.v2.tasks.update(task.id, { status })
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
    open: tasks.filter((t) => t.status !== "done").length,
    escalated: tasks.filter((t) => t.status === "escalated").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    done: tasks.filter((t) => t.status === "done").length,
  }

  const tabs: { key: View; label: string; count: number }[] = [
    { key: "open", label: "Open", count: counts.open },
    { key: "escalated", label: "Escalated", count: counts.escalated },
    { key: "overdue", label: "Overdue", count: counts.overdue },
    { key: "in_progress", label: "In progress", count: counts.in_progress },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "done", label: "Resolved", count: counts.done },
  ]

  const visibleTasks = tasks.filter((task) => {
    if (view === "open") return task.status !== "done"
    return task.status === view
  })

  const priorityColor = (task: Task) => {
    if (task.status === "escalated" || task.priority === "high") return "border-l-destructive"
    if (task.status === "overdue") return "border-l-amber-500"
    if (task.priority === "normal") return "border-l-primary"
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
            Negative feedback becomes a classified follow-up. Repeated issues in the same category merge
            into one task and escalate after the third report.
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
                (t.key === "overdue" || t.key === "escalated") && t.count > 0
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
          {visibleTasks.map((task) => {
            const isDone = task.status === "done"
            const isOverdue = task.status === "overdue"
            const isEscalated = task.status === "escalated"
            const meta = typeMeta[task.taskType] || typeMeta.follow_up
            const status = statusMeta[task.status] || statusMeta.pending
            const recurring = (task.occurrenceCount || 1) > 1
            const expanded = expandedId === task.id

            return (
              <Card
                key={task.id}
                className={`p-4 border-l-4 ${priorityColor(task)} ${
                  isOverdue || isEscalated ? "border-destructive/30" : ""
                } ${isDone ? "opacity-70" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => quickStatus(task, isDone ? "pending" : "done")}
                    aria-label={isDone ? "Reopen task" : "Resolve task"}
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 hover:border-primary"
                    }`}
                  >
                    {isDone && <Check className="size-3" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {meta.label}
                      </span>
                      {task.category && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${categoryColor(task.category)}`}>
                          {categoryLabels[task.category] || task.category}
                        </span>
                      )}
                      {recurring && (
                        <span className="flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                          <Flame className="size-3" />
                          Recurring ×{task.occurrenceCount}
                        </span>
                      )}
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      {task.priority === "high" && !isEscalated && (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                          High priority
                        </span>
                      )}
                    </div>

                    <p className={`mt-1.5 text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                      {task.title}
                    </p>

                    {task.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                    )}

                    {task.feedback && (
                      <div className="mt-2 rounded-lg border border-border/70 bg-muted/30 p-2.5 text-xs space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {task.feedback.customerName || "Guest"}
                          </span>
                          <span className="flex items-center gap-0.5 font-semibold text-amber-600">
                            <Star className="size-3 fill-current" />
                            {task.feedback.rating}
                          </span>
                          {task.feedback.touchpoint && (
                            <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground border">
                              via {touchpointLabels[task.feedback.touchpoint] || task.feedback.touchpoint}
                            </span>
                          )}
                          {task.feedback.purchaseInfo && (
                            <span className="text-[10px] text-muted-foreground">
                              {task.feedback.purchaseInfo}
                            </span>
                          )}
                        </div>
                        {task.feedback.improvement && (
                          <p className="text-muted-foreground line-clamp-2">
                            <span className="font-medium text-foreground">Suggestion:</span>{" "}
                            {task.feedback.improvement}
                          </p>
                        )}
                        {!task.feedback.improvement && task.feedback.liked && (
                          <p className="text-muted-foreground line-clamp-2">
                            <span className="font-medium text-foreground">Liked:</span> {task.feedback.liked}
                          </p>
                        )}
                        {task.feedback.privateNote && (
                          <p className="italic text-muted-foreground line-clamp-2">
                            “{task.feedback.privateNote}”
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {task.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
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

                    {isDone && task.resolutionNotes && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-md bg-green-500/5 px-2.5 py-1.5 text-xs text-green-700 dark:text-green-400">
                        <ClipboardCheck className="mt-0.5 size-3 shrink-0" />
                        <span>
                          <span className="font-medium">Resolution:</span> {task.resolutionNotes}
                        </span>
                      </div>
                    )}

                    {!isDone && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {task.status !== "in_progress" && (
                          <button
                            onClick={() => quickStatus(task, "in_progress")}
                            className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                          >
                            Start
                          </button>
                        )}
                        {task.status !== "escalated" && (
                          <button
                            onClick={() => quickStatus(task, "escalated")}
                            className="rounded-md border border-destructive/30 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/5"
                          >
                            Escalate
                          </button>
                        )}
                        <button
                          onClick={() => openDetails(task)}
                          className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                        >
                          {expanded ? "Hide details" : "Assign / resolve"}
                        </button>
                      </div>
                    )}

                    {expanded && (
                      <div className="mt-3 space-y-3 rounded-lg border border-border bg-card p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1 text-xs font-medium text-muted-foreground">
                            Assign to
                            <input
                              value={form.assignedTo}
                              onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                              placeholder="Manager / staff name"
                              maxLength={100}
                              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                            />
                          </label>
                          <label className="space-y-1 text-xs font-medium text-muted-foreground">
                            Status
                            <select
                              value={form.status}
                              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In progress</option>
                              <option value="overdue">Overdue</option>
                              <option value="escalated">Escalated</option>
                              <option value="done">Resolved</option>
                            </select>
                          </label>
                        </div>
                        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                          Resolution notes {form.status === "done" && <span className="text-destructive">*</span>}
                          <textarea
                            value={form.resolutionNotes}
                            onChange={(e) => setForm((f) => ({ ...f, resolutionNotes: e.target.value }))}
                            placeholder="What was fixed? e.g. Spoke to the floor manager, replaced the dish, coached the kitchen team."
                            maxLength={2000}
                            rows={3}
                            className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                          />
                        </label>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {form.status === "done"
                              ? "Resolution notes keep the loop auditable."
                              : "Assign an owner and move the issue forward."}
                          </span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setExpandedId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => saveDetails(task)} disabled={saving}>
                              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                    className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            )
          })}

          {visibleTasks.length === 0 && (
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
