"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, Flame, Mail } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { timeAgo } from "@/lib/format"

interface Report {
  windowDays: number
  totalIssues: number
  openIssues: number
  resolvedIssues: number
  overdueIssues: number
  escalatedIssues: number
  highPriorityOpen: number
  recurringIssuesOpen: number
  postResolutionRecurrences: number
  resolutionRate: number
  avgResolutionHours: number | null
  recurringIssues: {
    issueKey: string
    category: string
    label: string
    taskCount: number
    occurrences: number
    openCount: number
    resolvedCount: number
    recurredAfterResolutionCount: number
    lastSeenAt: string
  }[]
  recentResolutions: {
    id: string
    title: string
    label: string
    resolutionNotes: string
    assignedTo: string | null
    completedAt: string
  }[]
  needsAttention: {
    id: string
    title: string
    label: string
    status: string
    priority: string
    dueAt: string | null
    occurrenceCount: number
    recurredAfterResolution: boolean
  }[]
}

const statusCopy: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  overdue: "Overdue",
  escalated: "Escalated",
}

const RANGES = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
]

function dueLabel(iso: string): string {
  const remaining = new Date(iso).getTime() - Date.now()
  if (remaining <= 0) return `Overdue · ${timeAgo(iso)}`
  const hours = Math.ceil(remaining / 3_600_000)
  if (hours < 24) return `Due in ${hours}h`
  return `Due in ${Math.ceil(hours / 24)}d`
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

export function IssueResolutionReport({ businessId }: { businessId: string }) {
  const [report, setReport] = useState<Report | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [sendingDigest, setSendingDigest] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    api.v2.tasks
      .report(businessId, days)
      .then((res) => {
        if (!cancelled) setReport(res.report)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessId, days])

  const hasActivity = Boolean(
    report &&
      (report.totalIssues > 0 ||
        report.recurringIssues.length > 0 ||
        report.needsAttention.length > 0 ||
        report.recentResolutions.length > 0)
  )

  async function emailDigest() {
    setSendingDigest(true)
    try {
      await api.v2.tasks.digest(businessId, days)
      toast.success("Summary emailed to the owner account")
    } catch (err: any) {
      if (err?.status === 503) {
        toast.error("Email is not configured yet. The summary is still available here.")
      } else {
        toast.error(err?.message || "Could not send the summary")
      }
    } finally {
      setSendingDigest(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-medium text-foreground">
            <Activity className="size-4 text-primary" />
            Issue resolution &amp; recurring problems
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {report
              ? `Last ${report.windowDays} days · ${report.totalIssues} guest issue${report.totalIssues === 1 ? "" : "s"} · ${report.resolutionRate}% resolved`
              : "How guest complaints are being resolved and what keeps coming back."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={emailDigest}
            disabled={sendingDigest || !report}
            title="Email this summary to the owner account"
          >
            <Mail className="size-3.5" />
            <span className="hidden sm:inline">{sendingDigest ? "Sending…" : "Email summary"}</span>
          </Button>
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5 text-[11px]">
            {RANGES.map((range) => (
              <button
                key={range.days}
                onClick={() => setDays(range.days)}
                className={`rounded-md px-2 py-1 font-medium transition-colors ${
                  days === range.days
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={days === range.days}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Link
            href="/v2/tasks"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Open manager queue
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[66px] animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : failed ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Could not load the issue report right now. The manager queue is still available.
        </p>
      ) : !hasActivity ? (
        <div className="mt-4 rounded-lg border border-dashed border-border p-4">
          <p className="text-sm font-medium text-foreground">No guest issues recorded yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Negative feedback becomes a classified issue with an owner and a resolution note. Once guests start
            reporting, this card shows what is recurring and what was actually fixed.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Open now" value={String(report!.openIssues)} />
            <Metric label="Resolved this period" value={String(report!.resolvedIssues)} />
            <Metric
              label="Avg resolution"
              value={
                report!.avgResolutionHours === null
                  ? "—"
                  : report!.avgResolutionHours < 24
                    ? `${report!.avgResolutionHours}h`
                    : `${Math.round((report!.avgResolutionHours / 24) * 10) / 10}d`
              }
            />
            <Metric label="Recurring open" value={String(report!.recurringIssuesOpen)} />
          </div>

          {(report!.overdueIssues > 0 || report!.escalatedIssues > 0 || report!.highPriorityOpen > 0) && (
            <div className="flex flex-wrap gap-2 text-[11px] font-medium">
              {report!.escalatedIssues > 0 && (
                <span className="rounded bg-destructive/10 px-2 py-1 text-destructive">
                  {report!.escalatedIssues} escalated
                </span>
              )}
              {report!.overdueIssues > 0 && (
                <span className="rounded bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                  {report!.overdueIssues} overdue
                </span>
              )}
              {report!.highPriorityOpen > 0 && (
                <span className="rounded bg-secondary px-2 py-1 text-muted-foreground">
                  {report!.highPriorityOpen} high priority
                </span>
              )}
            </div>
          )}

          {report!.postResolutionRecurrences > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs">
              <Flame className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-foreground">
                <span className="font-semibold text-destructive">
                  {report!.postResolutionRecurrences} issue
                  {report!.postResolutionRecurrences === 1 ? "" : "s"} came back after being marked resolved.
                </span>{" "}
                The recorded fix did not hold — check the resolution note and the current process.
              </p>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Flame className="size-3.5 text-destructive" />
                Recurring problems
              </h3>
              {report!.recurringIssues.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No repeated issues in this period.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {report!.recurringIssues.map((issue) => (
                    <li
                      key={issue.issueKey}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{issue.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {issue.occurrences} guest report{issue.occurrences === 1 ? "" : "s"} · last seen{" "}
                          {timeAgo(issue.lastSeenAt)}
                          {issue.recurredAfterResolutionCount > 0
                            ? ` · ${issue.recurredAfterResolutionCount} after a fix`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          issue.openCount > 0
                            ? "bg-destructive/10 text-destructive"
                            : "bg-green-500/10 text-green-700 dark:text-green-400"
                        }`}
                      >
                        {issue.openCount > 0 ? `${issue.openCount} open` : "Resolved"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <AlertTriangle className="size-3.5 text-amber-600" />
                Needs attention
              </h3>
              {report!.needsAttention.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nothing overdue or high priority. The queue is under control.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {report!.needsAttention.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{item.title}</p>
                        {item.dueAt && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {dueLabel(item.dueAt)}
                            {item.occurrenceCount > 1 ? ` · ×${item.occurrenceCount}` : ""}
                          </p>
                        )}
                        {item.recurredAfterResolution && (
                          <p className="mt-0.5 text-[11px] font-medium text-destructive">
                            Recurred after a previous fix
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          item.status === "escalated" || item.status === "overdue"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {statusCopy[item.status] || item.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {report!.recentResolutions.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-green-600" />
                Recently resolved
              </h3>
              <ul className="mt-2 space-y-2">
                {report!.recentResolutions.slice(0, 3).map((item) => (
                  <li key={item.id} className="rounded-lg bg-green-500/5 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {timeAgo(item.completedAt)}
                      </span>
                      {item.assignedTo && <span>· {item.assignedTo}</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-foreground">{item.resolutionNotes}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
