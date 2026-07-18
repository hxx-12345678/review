"use client"

import { useRef, useState } from "react"
import { Sparkles, Send, ShieldCheck, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { runOpsQuery, suggestedQueries } from "@/lib/ops-query"
import type { OpsQueryResult } from "@/lib/types"

type Turn =
  | { role: "user"; text: string }
  | { role: "assistant"; result: OpsQueryResult }

export function CopilotClient() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  function ask(text: string) {
    if (!text.trim()) return
    setTurns((prev) => [...prev, { role: "user", text }])
    setInput("")
    setThinking(true)
    // Simulate copilot latency; in production this is an AI SDK streamed call.
    setTimeout(() => {
      const result = runOpsQuery(text)
      setTurns((prev) => [...prev, { role: "assistant", result }])
      setThinking(false)
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        })
      })
    }, 500)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-3xl">
          {turns.length === 0 ? (
            <EmptyState onPick={ask} />
          ) : (
            <div className="space-y-4">
              {turns.map((turn, i) =>
                turn.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="flex items-start gap-2">
                      <div className="max-w-md rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                        {turn.text}
                      </div>
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <User className="size-4" />
                      </span>
                    </div>
                  </div>
                ) : (
                  <AssistantTurn key={i} result={turn.result} />
                ),
              )}
              {thinking && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/15">
                    <Sparkles className="size-4 text-primary" />
                  </span>
                  <span className="flex gap-1">
                    <Dot /> <Dot delay={150} /> <Dot delay={300} />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border p-4">
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2"
          >
            <Sparkles className="ml-1.5 size-4 shrink-0 text-primary" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about payments, leads, follow-ups, deals…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
            >
              Ask <Send className="size-3.5" />
            </button>
          </form>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3" />
            Task-specific business assistant — answers from your own data, with a
            human always in control.
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15">
        <Sparkles className="size-6 text-primary" />
      </span>
      <h2 className="mt-4 text-balance text-xl font-semibold tracking-tight">
        Ask anything about your operations
      </h2>
      <p className="mt-1 max-w-md text-pretty text-sm text-muted-foreground">
        The Ops Copilot reads your live inbox, pipeline, and tasks — and answers
        in plain language. No dashboards to dig through.
      </p>
      <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {suggestedQueries.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent/40"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function AssistantTurn({ result }: { result: OpsQueryResult }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Sparkles className="size-4 text-primary" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm leading-relaxed">{result.answer}</p>
        {result.rows && result.rows.length > 0 && result.columns && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card text-left text-xs text-muted-foreground">
                    {result.columns.map((col) => (
                      <th key={col} className="px-3 py-2 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.rows.map((row, ri) => (
                    <tr key={ri} className="bg-background">
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={cn(
                            "px-3 py-2",
                            ci === 0 && "font-medium capitalize",
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: `${delay}ms` }}
    />
  )
}
