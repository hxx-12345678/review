"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

export const CHART_COLORS = {
  amber: "#f59e0b",
  emerald: "#10b981",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  zinc: "#52525b",
}

const axisTick = { fill: "#71717a", fontSize: 11 }
const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: 8,
  fontSize: 12,
  color: "#e4e4e7",
}
const tooltipLabelStyle = { color: "#a1a1aa", marginBottom: 4 }
const gridStroke = "#27272a"

export function ChartCard({
  title,
  subtitle,
  children,
  height = 220,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  height?: number
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-zinc-100">{title}</h3>
        {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

export function AreaTrend({
  data,
  dataKey,
  color = CHART_COLORS.amber,
  label,
  formatter,
}: {
  data: { day?: string; month?: string; value: number }[]
  dataKey?: string
  color?: string
  label: string
  formatter?: (v: number) => string
}) {
  const key = dataKey || "value"
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id={`fill-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey={dataKey || "day"} tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} tickFormatter={(v) => (formatter ? formatter(v) : String(v))} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} formatter={(value: any, name: any) => [formatter ? formatter(Number(value)) : Number(value).toLocaleString(), name]} />
        <Area type="monotone" dataKey={key} stroke={color} strokeWidth={2} fill={`url(#fill-${label})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function BarTrend({
  data,
  dataKey,
  color = CHART_COLORS.blue,
  label,
  formatter,
}: {
  data: { day?: string; month?: string; value: number }[]
  dataKey?: string
  color?: string
  label: string
  formatter?: (v: number) => string
}) {
  const key = dataKey || "value"
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey={dataKey || "day"} tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} tickFormatter={(v) => (formatter ? formatter(v) : String(v))} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: "#3f3f46", opacity: 0.15 }} formatter={(value: any, name: any) => [formatter ? formatter(Number(value)) : Number(value).toLocaleString(), name]} />
        <Bar dataKey={key} fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LineTrend({
  data,
  dataKey,
  color = CHART_COLORS.violet,
  label,
}: {
  data: { month?: string; day?: string; value: number }[]
  dataKey?: string
  color?: string
  label: string
}) {
  const key = dataKey || "value"
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey={dataKey || "day"} tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} formatter={(value: any, name: any) => [Number(value).toLocaleString(), name]} />
        <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={{ r: 2, fill: color }} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function DualLineTrend({
  data,
  series,
}: {
  data: any[]
  series: { key: string; name: string; color: string }[]
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(value: any, name: any) => [`${value}%`, name]}
        />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 2, fill: s.color }} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function FunnelBars({
  steps,
}: {
  steps: { key: string; label: string; value: number; pctOfPrev: number | null }[]
}) {
  const max = Math.max(1, ...steps.map((s) => s.value))
  const colors = [CHART_COLORS.amber, CHART_COLORS.blue, CHART_COLORS.violet, CHART_COLORS.emerald, CHART_COLORS.cyan]
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const pct = Math.round((s.value / max) * 100)
        return (
          <div key={s.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-200">
                <span className="mr-2 inline-block w-4 text-right text-zinc-500">{i + 1}.</span>
                {s.label}
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                <span className="font-bold text-zinc-100">{s.value}</span>
                <span className="text-xs text-zinc-500">
                  {s.pctOfPrev !== null ? `${s.pctOfPrev}% of prev` : "baseline"}
                </span>
              </span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded-md bg-zinc-800">
              <div
                className="h-full rounded-md transition-all"
                style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: colors[i % colors.length] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DonutChart({
  data,
}: {
  data: { name: string; value: number; color: string }[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
        <span className="text-2xl font-bold text-zinc-100">{total}</span>
        <span className="text-xs text-zinc-500">total</span>
      </div>
    </div>
  )
}
