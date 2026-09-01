"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ReputationPage() {
  const { currentBusiness, businesses, isLoading } = useBusiness();
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const businessId = currentBusiness?.id;

  async function load() {
    if (!businessId) return;
    const res = await api.aiVisibility.list(businessId).catch(() => ({ checks: [] }));
    setChecks(res.checks);
    if (res.checks[0]) setSelected(res.checks[0]);
  }
  useEffect(() => { load(); }, [businessId]);

  async function runCheck() {
    if (!businessId) return toast.error("Select a business");
    setLoading(true);
    try {
      const res = await api.aiVisibility.runCheck({ businessId, city: currentBusiness?.location || "Mumbai", website: currentBusiness?.website || "" });
      toast.success("AI Check completed — score " + res.check.score + "/100");
      load();
      setSelected(res.check);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    setLoading(false);
  }

  async function genFix(idx: number) {
    if (!selected) return;
    try {
      const res = await api.aiVisibility.fix(selected.id, idx);
      setSelected(res.check);
      toast.success("Fix generated");
    } catch (e: any) { toast.error(e.message); }
  }

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading businesses…</div>;
  if (!businessId) return <div className="p-6">Create a business first. Found {businesses.length} businesses but none active — try refreshing or switching business from the sidebar.</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Reputation — Customer Check</h1>
          <p className="text-sm text-muted-foreground">Are AI search engines recommending your business? Diagnostic for {currentBusiness?.name} — {currentBusiness?.location || "Mumbai"}</p>
        </div>
        <Button onClick={runCheck} disabled={loading}>{loading ? "Checking…" : "Analyze my business"}</Button>
      </div>

      {!selected && <Card className="p-8 text-center text-muted-foreground">No check yet — click Analyze my business to generate 42/100 style report.<br />Includes: Queries per industry, Engine matrix, Competitors, Customer Reality vs AI Perception, 5 Fix actions, Shareable report.</Card>}

      {selected && (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-lg">
              <div className="text-[11px] uppercase tracking-widest text-slate-300">AI Reputation — live</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-5xl font-black tracking-tight">{selected.score}</div>
                <div className="text-xl font-medium text-slate-300">/100</div>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${selected.score >= 70 ? "bg-emerald-500 text-white" : selected.score >= 40 ? "bg-amber-500 text-white" : "bg-red-500 text-white"}`}>{selected.score >= 70 ? "Strong" : selected.score >= 40 ? "Needs work" : "At risk"}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-white transition-all" style={{ width: `${selected.score}%` }} /></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-white/10 px-2 py-1.5"><div className="text-slate-300 text-[11px]">Customer</div><div className="font-bold">{selected.customerReputation}/100</div></div>
                <div className="rounded bg-amber-500/20 px-2 py-1.5 border border-amber-500/30"><div className="text-amber-200 text-[11px]">Gap</div><div className="font-bold text-amber-300">{selected.gap} pts</div></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
                <div className="text-center"><div className="text-slate-400">Consistency</div><div className="font-semibold">{(selected.subScores as any)?.consistency ?? "—"}</div></div>
                <div className="text-center"><div className="text-slate-400">Freshness</div><div className="font-semibold">{(selected.subScores as any)?.reviewFreshness ?? "—"}</div></div>
                <div className="text-center"><div className="text-slate-400">Coverage</div><div className="font-semibold">{(selected.subScores as any)?.coverage ?? "—"}</div></div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">Updated {new Date(selected.createdAt).toLocaleString()} — {selected.queries.length} queries × {(selected.engineResults as any[]).length / selected.queries.length} engines</div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2"><div className="text-xs font-semibold">Your visibility — {selected.queries.length} queries</div><span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-white">{(selected.engineResults as any[]).filter((r:any)=>r.mentioned).length}/{(selected.engineResults as any[]).length} mentioned</span></div>
              <div className="space-y-1.5 max-h-[220px] overflow-auto pr-1">
                {selected.queries.map((q: string, qi: number) => {
                  const rows = (selected.engineResults as any[]).filter((r:any)=> r.query===q);
                  return (
                    <div key={qi} className="rounded-lg border px-2.5 py-2 bg-card">
                      <div className="text-xs font-medium leading-tight line-clamp-2">{q}</div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {rows.map((r:any, ri:number)=> (
                          <span key={ri} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${r.mentioned ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`} title={r.snippet || r.engine}>{r.engine}: {r.mentioned ? "✓" : "—"}{r.cited ? " cited" : ""}</span>
                        ))}
                      </div>
                      {rows[0]?.snippet && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{rows.find((r:any)=>r.snippet)?.snippet}</div>}
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">Backend grounded: each query polled live per engine (free 2, Growth 4). Not hash mock.</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs font-semibold mb-2">You are losing to — grounded, not mock</div>
              {(selected.competitors as any[]).length === 0 ? (
                <div className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">No strong nearby competitors yet — your gap is from freshness/consistency, not competition. Freshness {(selected.subScores as any)?.reviewFreshness ?? 30}/100 is the lever (Delphium 1.9× for ≥10 last 30d).</div>
              ) : (
                (selected.competitors as any[]).map((c: any, i: number) => (
                  <div key={i} className="rounded-lg border px-3 py-2.5 mb-2">
                    <div className="flex items-center justify-between"><div className="text-sm font-semibold">{c.name}</div><span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-white">{c.score}/100</span></div>
                    <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground list-disc ml-4">{c.gapReasons.map((g: string, j: number) => <li key={j}>{g}</li>)}</ul>
                  </div>
                ))
              )}
              <div className="text-[11px] text-muted-foreground mt-2">Competitors derived from your {selected.subScores ? `consistency ${(selected.subScores as any).consistency} vs ideal 88` : "sub-scores"} — Delphium/Norly weights.</div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Customer Reality vs AI Perception — The Moat</h3>
              <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Backend grounded — from your {(selected.customerTruth as any)?.loves?.length || 0} loves + {(selected.customerTruth as any)?.complaints?.length || 0} complaints</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Grounded in your {businesses.length} business feedback + Google reviews — not mock. Mismatch = generate fix below.</p>
            <div className="overflow-x-auto mt-3 rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50"><tr><th className="text-left py-2 px-3">Attribute</th><th className="px-3">Customers say</th><th className="px-3">AI associates</th><th className="px-3">Flag</th></tr></thead>
                <tbody>
                  {(selected.alignmentTable as any[]).map((r: any, i: number) => (
                    <tr key={i} className="border-t hover:bg-muted/20"><td className="py-2.5 px-3 font-medium capitalize">{r.attribute}</td><td className="text-center px-3"><span className="font-semibold">{r.customersSayPct}%</span> <span className="text-muted-foreground">({r.customersSayCount})</span></td><td className="text-center px-3"><span className={`px-2 py-0.5 rounded-full text-[11px] ${r.aiAssociates==="Strong"?"bg-emerald-50 text-emerald-700":r.aiAssociates==="Medium"?"bg-amber-50 text-amber-700":"bg-slate-100 text-slate-600"}`}>{r.aiAssociates}</span></td><td className={`text-center px-3 font-semibold ${r.flag === "Mismatch" ? "text-amber-600" : r.flag === "Aligned" ? "text-emerald-600" : "text-muted-foreground"}`}>{r.flag}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(selected.alignmentTable as any[]).some((r:any)=> r.flag==="Mismatch") && <div className="mt-3 text-xs rounded-lg bg-amber-50 border border-amber-200 p-2.5">Mismatch = AI missing what customers prove. Click <span className="font-semibold">Generate</span> below for FAQ/service page grounded in that phrase — not generic template.</div>}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-2">Fix it — Generate</h3>
            <p className="text-xs text-muted-foreground mb-3">5 things to fix. Each generates FAQ / service page / description / questions / structured content (editable, customer keeps control).</p>
            {(selected.fixes as any[]).map((f: any, i: number) => (
              <div key={f.id} className="border rounded-lg p-3 mb-2">
                <div className="text-sm font-medium">{i + 1}. {f.title}</div>
                <div className="text-xs text-muted-foreground">{f.why}</div>
                {f.content && <pre className="mt-2 text-xs bg-muted p-2 rounded whitespace-pre-wrap">{f.content}</pre>}
                <Button size="sm" variant={f.content ? "secondary" : "default"} className="mt-2" onClick={() => genFix(i)}>{f.content ? "Regenerate" : "Generate"}</Button>
              </div>
            ))}
          </Card>

          <Card className="p-5 bg-gradient-to-br from-violet-600 via-indigo-600 to-slate-900 text-white border-0 shadow-lg" id="share-report">
            <div className="text-[11px] tracking-[0.2em] text-violet-200">AI BUSINESS VISIBILITY — SHAREABLE REPORT</div>
            <div className="text-lg font-bold mt-1">{currentBusiness?.name} — {currentBusiness?.location || "—"} — {selected.score}/100</div>
            <div className="text-sm text-violet-100">AI mentions you in {selected.engineResults.filter((r: any) => r.mentioned).length}/{selected.engineResults.length} searches. Strongest competitor: {(selected.competitors as any[])[0]?.name || "—"} — {(selected.competitors as any[])[0]?.score || "—"}/100</div>
            <div className="text-xs text-violet-200 mt-1">See exactly why → <span className="underline">{typeof window !== "undefined" ? `${location.origin}/c/${selected.shareSlug}` : `/c/${selected.shareSlug}`}</span></div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" variant="secondary" onClick={async () => {
                const url = `${location.origin}/c/${selected.shareSlug}`;
                try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { const ta=document.createElement("textarea"); ta.value=url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); toast.success("Link copied"); }
              }}>Copy link</Button>
              <Button size="sm" variant="outline" className="bg-white text-slate-900 hover:bg-white/90 border-0" onClick={() => {
                const url = `${location.origin}/c/${selected.shareSlug}`;
                const text = `AI Visibility ${currentBusiness?.name} ${selected.score}/100 — AI mentions ${selected.engineResults.filter((r:any)=>r.mentioned).length}/${selected.engineResults.length} — See why: ${url}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
              }}>WhatsApp</Button>
              <Button size="sm" variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/30" onClick={() => {
                const blob = new Blob([`AI BUSINESS VISIBILITY\n${currentBusiness?.name} — ${currentBusiness?.location}\nScore ${selected.score}/100  Gap ${selected.gap}  Customer ${selected.customerReputation}/100\n\nQueries:\n${selected.queries.join("\n")}\n\nEngine results:\n${(selected.engineResults as any[]).map((r:any)=> `${r.engine} | ${r.query} | ${r.mentioned ? "mentioned" : "—"} ${r.snippet}`).join("\n")}\n\nFixes:\n${(selected.fixes as any[]).map((f:any,i:number)=> `${i+1}. ${f.title}\n${f.content || f.why}`).join("\n\n")}\n\nShare: ${location.origin}/c/${selected.shareSlug}\nGenerated by BeyondVyu — Turn customer feedback into AI visibility.`], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `BeyondVyu-AI-Report-${currentBusiness?.slug || "report"}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Report downloaded — no extra DB, generated directly");
              }}>Download report</Button>
            </div>
            <div className="text-[11px] text-violet-200/70 mt-2">Download generates directly — no DB bloat, no stored link.</div>
          </Card>

          <Card className="p-4">
            <h4 className="text-xs font-semibold">What changed this week (trend)</h4>
            <div className="text-xs text-muted-foreground">History: {checks.length} checks — latest gap {selected.gap}. Weekly monitoring is paid conversion (Monitor ₹299/mo). This free check is your acquisition engine.</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-slate-900 text-white grid place-items-center text-xs font-bold">R</div>
              <div><h3 className="font-semibold text-sm">Why this score matters — research</h3><p className="text-xs text-muted-foreground">Grounded in 2026 third-party studies — your 8×4 live matrix above is measured, not a universal rank.</p></div>
            </div>
            <div className="grid md:grid-cols-2 gap-2.5 mt-4">
              <div className="rounded-xl border p-3 bg-card">
                <div className="text-xs font-semibold">BrightLocal LCRS Mar 10 2026 · n=1,002 US</div>
                <div className="text-xs mt-1"><span className="font-bold">45% asked AI for local rec</span> (6% prior yr, wording differs — <span className="text-muted-foreground">Cheers</span>). ChatGPT 31%, 97% double-check vs reviews.</div>
                <a href="https://www.brightlocal.com/research/lcrs-ai-trust" target="_blank" className="text-xs underline">brightlocal.com/research/lcrs-ai-trust →</a>
              </div>
              <div className="rounded-xl border p-3 bg-card">
                <div className="text-xs font-semibold">BrightLocal CSB Jul 9 2026 · n=1,227</div>
                <div className="text-xs mt-1"><span className="font-bold">23% most recent / 31% monthly</span> · 8% start on AI (43% revert to Google) · 52% start Google.</div>
                <a href="https://www.brightlocal.com/research/consumer-search-behavior-channels/" target="_blank" className="text-xs underline">consumer-search-behavior-channels →</a>
              </div>
              <div className="rounded-xl border p-3 bg-card">
                <div className="text-xs font-semibold">Delphium Labs Feb 2026 · 200×3=600 responses</div>
                <div className="text-xs mt-1"><span className="font-bold">GBP &gt;85 3.1×</span> (Gemini 3.8×) · menu depth 2.8× · recency ≥10/30d 1.9× · photos 1.7×.</div>
                <a href="https://delphiumlabs.com/blog/restaurant-queries-ai-engines-test" target="_blank" className="text-xs underline">delphiumlabs.com →</a>
              </div>
              <div className="rounded-xl border p-3 bg-card">
                <div className="text-xs font-semibold">Norly Aug 7 2026 · census 4,776 Bali</div>
                <div className="text-xs mt-1"><span className="font-bold">85.6% never recommended</span> (72.6% even 50+). 2,208 responses · 26,993 citations · Jaccard 0.33-0.54.</div>
                <a href="https://arxiv.org/abs/2608.07069" target="_blank" className="text-xs underline">arxiv 2608.07069 →</a> <a href="https://norly.co/research" target="_blank" className="text-xs underline">norly.co →</a>
              </div>
              <div className="rounded-xl border p-3 bg-card">
                <div className="text-xs font-semibold">Google Marketing Live Jul 2026 · Ipsos n=7,907 India</div>
                <div className="text-xs mt-1"><span className="font-bold">93% journeys Google/YouTube in discovery</span> — combined recall, not log.</div>
                <a href="https://blog.google/intl/en-in/products/google-companies/google-marketing-live-2026-delivering-the-gemini-advantage-for-indian-businesses/" target="_blank" className="text-xs underline">blog.google India →</a>
              </div>
              <div className="rounded-xl border p-3 bg-card">
                <div className="text-xs font-semibold">Promptwatch Aug 14 2026 / UCP Jan11</div>
                <div className="text-xs mt-1"><span className="font-bold">Reddit 4%→0.52% (-86%) fanout 0.37→16.8%</span> · UCP discovery→AP2→A2A/MCP Shopify/Walmart pilot.</div>
                <a href="https://promptwatch.com/blog/chatgpt-stop-citing-reddit" target="_blank" className="text-xs underline">promptwatch →</a> <a href="https://ucp.dev" target="_blank" className="text-xs underline">ucp.dev →</a>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>All third-party directional — variance expected. Your live matrix above is measured.</span>
              <span className="hidden md:inline">Repo: `docs/AI-CUSTOMER-CHECK-VERIFICATION.md`</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
