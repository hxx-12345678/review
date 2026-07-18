"use client"

import { useState } from "react"
import { GripVertical, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, Tag } from "@/components/ui-bits"
import { customers as seedCustomers, agentById } from "@/lib/mock-data"
import type { Customer, PipelineStage } from "@/lib/types"
import { pipelineOrder, stageMeta, formatCurrency, relativeTime } from "@/lib/format"

export function PipelineBoard() {
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<PipelineStage | null>(null)

  function moveTo(stage: PipelineStage) {
    if (!dragId) return
    setCustomers((prev) =>
      prev.map((c) => (c.id === dragId ? { ...c, stage } : c)),
    )
    setDragId(null)
    setOverStage(null)
  }

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4 md:p-6">
      {pipelineOrder.map((stage) => {
        const items = customers.filter((c) => c.stage === stage)
        const totalUSD = items
          .filter((c) => c.currency === "USD")
          .reduce((s, c) => s + c.dealValue, 0)
        const totalINR = items
          .filter((c) => c.currency === "INR")
          .reduce((s, c) => s + c.dealValue, 0)
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault()
              setOverStage(stage)
            }}
            onDrop={() => moveTo(stage)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl border bg-card/50 transition-colors",
              overStage === stage
                ? "border-primary/60 bg-primary/5"
                : "border-border",
            )}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: stageMeta[stage].color }}
              />
              <span className="text-sm font-medium">{stageMeta[stage].label}</span>
              <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
              {totalINR > 0 && formatCurrency(totalINR, "INR")}
              {totalINR > 0 && totalUSD > 0 && " · "}
              {totalUSD > 0 && formatCurrency(totalUSD, "USD")}
              {totalINR === 0 && totalUSD === 0 && "—"}
            </div>

            <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2">
              {items.map((c) => {
                const owner = agentById(c.ownerId)
                return (
                  <article
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverStage(null)
                    }}
                    className={cn(
                      "group cursor-grab rounded-lg border border-border bg-card p-3 active:cursor-grabbing",
                      dragId === c.id && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        {c.company && (
                          <p className="truncate text-xs text-muted-foreground">
                            {c.company}
                          </p>
                        )}
                      </div>
                      <GripVertical className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>

                    <p className="mt-2 text-sm font-semibold tabular-nums">
                      {formatCurrency(c.dealValue, c.currency)}
                    </p>

                    {c.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.tags.slice(0, 2).map((t) => (
                          <Tag key={t} label={t} />
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MessageSquare className="size-3" />
                        {relativeTime(c.lastContactAt)}
                      </span>
                      {owner && (
                        <Avatar
                          initials={owner.initials}
                          color={owner.avatarColor}
                          size={20}
                        />
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
