import Link from "next/link"
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  TrendingUp,
  MessageSquare,
  IndianRupee,
  AlertTriangle,
} from "lucide-react"
import { AppTopbar } from "@/components/app-topbar"
import { VolumeChart } from "@/components/overview/volume-chart"
import { Avatar, Pill, StatusDot } from "@/components/ui-bits"
import {
  agents,
  conversations,
  customers,
  followUpTasks,
  customerById,
  agentById,
} from "@/lib/mock-data"
import {
  relativeTime,
  stageMeta,
  pipelineOrder,
  formatCurrency,
  conversationStatusMeta,
} from "@/lib/format"

const kpis = [
  {
    label: "Open conversations",
    value: "24",
    delta: "+12%",
    up: true,
    icon: MessageSquare,
    hint: "vs last week",
  },
  {
    label: "Avg. first response",
    value: "3m 41s",
    delta: "-18%",
    up: true,
    icon: Clock,
    hint: "faster than last week",
  },
  {
    label: "Pipeline value",
    value: "₹3.4L",
    delta: "+₹84k",
    up: true,
    icon: TrendingUp,
    hint: "across 6 active deals",
  },
  {
    label: "Overdue follow-ups",
    value: "2",
    delta: "needs action",
    up: false,
    icon: AlertTriangle,
    hint: "assigned across team",
  },
]

export default function OverviewPage() {
  const funnel = pipelineOrder
    .filter((s) => s !== "lost")
    .map((stage) => ({
      stage,
      count: customers.filter((c) => c.stage === stage).length,
      value: customers
        .filter((c) => c.stage === stage)
        .reduce((sum, c) => sum + c.dealValue, 0),
    }))
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1)

  const recent = [...conversations]
    .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
    .slice(0, 5)

  const overdue = followUpTasks.filter((t) => t.status !== "done").slice(0, 4)

  return (
    <>
      <AppTopbar
        title="Operations Overview"
        description="Everything happening across your WhatsApp business, in one command center."
        action={
          <Link
            href="/copilot"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ask the Ops Copilot
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon
            return (
              <div
                key={k.label}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                  {k.value}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <span
                    className={
                      k.up ? "text-primary" : "text-warning"
                    }
                  >
                    {k.up ? (
                      <ArrowUpRight className="inline size-3" />
                    ) : (
                      <ArrowDownRight className="inline size-3" />
                    )}
                    {k.delta}
                  </span>
                  <span className="text-muted-foreground">{k.hint}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Volume chart */}
          <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">Message volume</h2>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <StatusDot color="var(--chart-2)" /> Inbound
                </span>
                <span className="flex items-center gap-1.5">
                  <StatusDot color="var(--primary)" /> Outbound
                </span>
              </div>
            </div>
            <VolumeChart />
          </div>

          {/* Pipeline funnel */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Pipeline</h2>
              <Link
                href="/pipeline"
                className="text-xs text-primary hover:underline"
              >
                View board
              </Link>
            </div>
            <div className="space-y-3">
              {funnel.map((f) => (
                <div key={f.stage}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <StatusDot color={stageMeta[f.stage].color} />
                      {stageMeta[f.stage].label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {f.count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(f.count / maxFunnel) * 100}%`,
                        backgroundColor: stageMeta[f.stage].color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Recent conversations */}
          <div className="rounded-xl border border-border bg-card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">Recent conversations</h2>
              <Link
                href="/inbox"
                className="text-xs text-primary hover:underline"
              >
                Open inbox
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {recent.map((conv) => {
                const customer = customerById(conv.customerId)!
                const agent = agentById(conv.assignedTo)
                return (
                  <li key={conv.id}>
                    <Link
                      href="/inbox"
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                    >
                      <Avatar
                        initials={customer.name.slice(0, 2).toUpperCase()}
                        color={stageMeta[customer.stage].color}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {customer.name}
                          </p>
                          <Pill
                            color={conversationStatusMeta[conv.status].color}
                            label={conversationStatusMeta[conv.status].label}
                          />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {conv.lastMessagePreview}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] text-muted-foreground">
                          {relativeTime(conv.lastMessageAt)}
                        </span>
                        {agent ? (
                          <Avatar
                            initials={agent.initials}
                            color={agent.avatarColor}
                            size={20}
                          />
                        ) : (
                          <span className="text-[10px] font-medium text-warning">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Overdue follow-ups */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">Needs follow-up</h2>
              <Link
                href="/tasks"
                className="text-xs text-primary hover:underline"
              >
                All tasks
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {overdue.map((task) => {
                const customer = customerById(task.customerId)!
                const isOverdue = task.status === "overdue"
                return (
                  <li key={task.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1 size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: isOverdue
                            ? "var(--destructive)"
                            : "var(--info)",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">
                          {task.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {customer.name} ·{" "}
                          <span
                            className={
                              isOverdue ? "text-destructive" : undefined
                            }
                          >
                            {isOverdue ? "Overdue " : "Due "}
                            {relativeTime(task.dueAt)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* Team workload */}
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium">Team workload</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map((agent) => {
              const assigned = conversations.filter(
                (c) => c.assignedTo === agent.id && c.status !== "closed",
              ).length
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <Avatar initials={agent.initials} color={agent.avatarColor} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{agent.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {agent.role}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{assigned}</p>
                    <p className="text-[10px] text-muted-foreground">active</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
