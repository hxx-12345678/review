"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const data = [
  { day: "Mon", inbound: 142, outbound: 168 },
  { day: "Tue", inbound: 168, outbound: 191 },
  { day: "Wed", inbound: 121, outbound: 150 },
  { day: "Thu", inbound: 198, outbound: 224 },
  { day: "Fri", inbound: 231, outbound: 268 },
  { day: "Sat", inbound: 176, outbound: 159 },
  { day: "Sun", inbound: 98, outbound: 84 },
]

export function VolumeChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="g-in" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-out" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
          labelStyle={{ color: "var(--muted-foreground)" }}
        />
        <Area
          type="monotone"
          dataKey="inbound"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="url(#g-in)"
        />
        <Area
          type="monotone"
          dataKey="outbound"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#g-out)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
