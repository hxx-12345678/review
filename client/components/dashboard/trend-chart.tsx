"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { Card } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  requests: { label: "Requests sent", color: "var(--chart-2)" },
  reviews: { label: "Reviews posted", color: "var(--chart-1)" },
} satisfies ChartConfig

export function TrendChart({ data }: { data?: { day: string; requests: number; reviews: number }[] }) {
  const hasData = data && data.length > 0 && data.some((d) => d.requests > 0 || d.reviews > 0)
  const chartData = hasData ? data : generateEmptyTrend()

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground">Review activity</h2>
          <p className="text-sm text-muted-foreground">Last 30 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Legend color="var(--chart-2)" label="Requests sent" />
          <Legend color="var(--chart-1)" label="Reviews posted" />
        </div>
      </div>

      <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-[260px] w-full">
        <AreaChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
          <defs>
            <linearGradient id="fillRequests" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fillReviews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(v: string) => v.replace(/^\w+ /, "")}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Area
            dataKey="requests"
            type="natural"
            fill="url(#fillRequests)"
            stroke="var(--chart-2)"
            strokeWidth={2}
          />
          <Area
            dataKey="reviews"
            type="natural"
            fill="url(#fillReviews)"
            stroke="var(--chart-1)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </Card>
  )
}

function generateEmptyTrend() {
  const result: { day: string; requests: number; reviews: number }[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const month = d.toLocaleString("en-US", { month: "short" })
    const day = d.getDate()
    result.push({ day: `${month} ${day}`, requests: 0, reviews: 0 })
  }
  return result
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  )
}
