"use client"

import { useMemo, useState } from "react"
import { Search, ArrowUpDown } from "lucide-react"
import { Avatar, Pill, Tag } from "@/components/ui-bits"
import { customers, agentById } from "@/lib/mock-data"
import {
  stageMeta,
  pipelineOrder,
  formatCurrency,
  relativeTime,
  countryFlag,
} from "@/lib/format"
import type { PipelineStage } from "@/lib/types"
import { cn } from "@/lib/utils"

type StageFilter = "all" | PipelineStage

export function CustomersTable() {
  const [query, setQuery] = useState("")
  const [stage, setStage] = useState<StageFilter>("all")
  const [sortDesc, setSortDesc] = useState(true)

  const rows = useMemo(() => {
    return customers
      .filter((c) => {
        const q = query.toLowerCase()
        const matchesQuery =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.phone.includes(q)
        const matchesStage = stage === "all" || c.stage === stage
        return matchesQuery && matchesStage
      })
      .sort((a, b) =>
        sortDesc ? b.dealValue - a.dealValue : a.dealValue - b.dealValue,
      )
  }, [query, stage, sortDesc])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company, phone…"
            className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none focus:border-ring"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", ...pipelineOrder] as StageFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                stage === s
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "all" ? "All" : stageMeta[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">
                  <button
                    onClick={() => setSortDesc((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Deal value <ArrowUpDown className="size-3" />
                  </button>
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Lifetime
                </th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Owner</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Last contact
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => {
                const owner = agentById(c.ownerId)
                return (
                  <tr key={c.id} className="bg-background transition-colors hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          initials={c.name.slice(0, 2).toUpperCase()}
                          color={stageMeta[c.stage].color}
                          size={34}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {countryFlag(c.countryCode)} {c.company ?? c.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Pill
                        color={stageMeta[c.stage].color}
                        label={stageMeta[c.stage].label}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {formatCurrency(c.dealValue, c.currency)}
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-muted-foreground md:table-cell">
                      {formatCurrency(c.lifetimeValue, c.currency)}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {owner ? (
                        <span className="flex items-center gap-2">
                          <Avatar
                            initials={owner.initials}
                            color={owner.avatarColor}
                            size={22}
                          />
                          <span className="text-xs">{owner.name.split(" ")[0]}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-warning">Unassigned</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                      {relativeTime(c.lastContactAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="bg-background px-4 py-10 text-center text-sm text-muted-foreground">
            No customers match your filters.
          </p>
        )}
      </div>
    </div>
  )
}
