"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Star, Clock, Lock, ArrowRight, Loader2, MapPin } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type Place = { placeId: string; name: string; address: string; rating: number | null; totalRatings: number | null };

function daysLabel(days: number | null) {
  if (days == null) return "No public signal";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function HealthCheckPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [check, setCheck] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");

  async function doSearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError("");
    setCheck(null);
    try {
      const res = await fetch(`${API_URL}/google-places/search-public?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results || []);
      if ((data.results || []).length === 0) setSearchError("No matching Google listings found. Try name + city.");
    } catch (e: any) {
      setSearchError(e.message || "Search failed. Please wait a minute and try again.");
    } finally {
      setSearching(false);
    }
  }

  async function runCheck(placeId: string) {
    setChecking(true);
    setCheckError("");
    try {
      const res = await fetch(`${API_URL}/google-places/health-check?placeId=${encodeURIComponent(placeId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Health check failed");
      setCheck(data);
      setResults([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setCheckError(e.message || "Health check failed. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  const gapColor = check?.gap === "High" ? "bg-red-500" : check?.gap === "Medium" ? "bg-amber-500" : check?.gap === "Low" ? "bg-emerald-500" : "bg-slate-400";

  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <MarketingHeader />
      <main className="flex-1 min-w-0 pt-16">
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Free tool · No account</p>
          <h1 className="speakable mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Free Google Review Health Check
          </h1>
          <p className="speakable mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Are AI search engines and customers finding your business — or your
            competitors? Enter your business below. Live Google data, no estimates.
          </p>

          {!check && (
            <div className="mt-8">
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="e.g. Brightsmile Dental, Mumbai"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doSearch()}
                  className="h-12"
                />
                <Button size="lg" onClick={doSearch} disabled={searching || query.trim().length < 2} className="shrink-0">
                  {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  Analyze my business
                </Button>
              </div>
              {searchError && <p className="mt-3 text-sm text-red-600">{searchError}</p>}
              {checking && (
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Checking live Google data…
                </div>
              )}
              {checkError && <p className="mt-3 text-sm text-red-600">{checkError}</p>}
              {results.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Select your business:</p>
                  {results.map((p) => (
                    <button
                      key={p.placeId}
                      onClick={() => runCheck(p.placeId)}
                      disabled={checking}
                      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-50"
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{p.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{p.address}</p>
                          {p.rating != null && (
                            <p className="mt-1 flex items-center gap-1 text-sm">
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-medium">{p.rating}</span>
                              <span className="text-muted-foreground">({p.totalRatings?.toLocaleString()} reviews)</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {check && (
            <div className="mt-8 space-y-4">
              <Card className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-lg">
                <div className="text-[11px] uppercase tracking-widest text-slate-300">Your result · live Google data</div>
                <div className="mt-1 text-xl font-bold">{check.place.name}</div>
                <div className="text-xs text-slate-400">{check.place.address}</div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white/10 p-3">
                    <div className="text-2xl font-black">{check.place.rating ?? "—"}</div>
                    <div className="text-[11px] text-slate-300">Rating</div>
                  </div>
                  <div className="rounded-lg bg-white/10 p-3">
                    <div className="text-2xl font-black">{check.place.totalRatings?.toLocaleString() ?? "—"}</div>
                    <div className="text-[11px] text-slate-300">Reviews</div>
                  </div>
                  <div className="rounded-lg bg-white/10 p-3">
                    <div className="text-2xl font-black">{check.place.daysSinceLastReview ?? "—"}</div>
                    <div className="text-[11px] text-slate-300">Days since review</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-300">
                  Recent activity: {check.place.lastReviewAt ? `last review ${daysLabel(check.place.daysSinceLastReview)}` : "no public recency signal"} ·
                  Gap vs competitors: <span className={`font-bold px-2 py-0.5 rounded-full text-white ${gapColor}`}>{check.gap}{check.gapDeficit ? ` · behind ${check.gapDeficit.toLocaleString()}` : ""}</span>
                </p>
                <div className="mt-3 text-[11px] uppercase tracking-widest text-slate-400">Nearby {check.competitorBasis || "businesses"}</div>
                {check.competitors?.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {check.competitors.map((c: any) => (
                      <div key={c.placeId} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2">
                        <span className="truncate font-medium">{c.name}</span>
                        <span className="shrink-0 text-slate-300">{c.rating} / {c.totalRatings?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold text-sm">Unlocks with a free account</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {check.locked.map((l: any) => (
                    <div key={l.id} className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs">
                      <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div><span className="font-medium">{l.label}</span><span className="block text-muted-foreground">{l.why}</span></div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{check.message}</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button render={<Link href="/signup" />} nativeButton={false} size="lg">
                    {check.cta}
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button render={<Link href="/contact" />} nativeButton={false} size="lg" variant="outline">
                    Talk to us
                  </Button>
                </div>
              </Card>

              <button onClick={() => { setCheck(null); setQuery(""); setResults([]); }} className="text-xs text-primary underline-offset-2 hover:underline">
                Check another business
              </button>
            </div>
          )}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
