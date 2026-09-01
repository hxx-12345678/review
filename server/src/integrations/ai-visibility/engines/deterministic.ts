import { EngineName, EngineResult } from "../types";

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

export function deterministicResults(businessName: string, queries: string[], hasWebsite: boolean, avgRating: number): EngineResult[] {
  const engines: EngineName[] = ["chatgpt", "gemini", "perplexity", "google_ai", "claude"];
  const out: EngineResult[] = [];
  for (const q of queries) {
    for (const e of engines.slice(0, 2)) { // free tier 2 engines
      const h = hash(`${businessName}|${q}|${e}`);
      const mentioned = (h % 10) < (hasWebsite ? 4 : 2) + (avgRating >= 4.5 ? 2 : 0); // 20-60%
      const cited = mentioned && (h % 3 === 0);
      out.push({ engine: e, query: q, mentioned, cited, rank: mentioned ? (h % 5) + 1 : undefined, snippet: mentioned ? `Recommended for ${q} — ${businessName} cited for strong reviews` : undefined, citations: cited ? [`https://${businessName.toLowerCase().replace(/\s+/g, "")}.com`] : [], latencyMs: 120 + (h % 80) });
    }
  }
  return out;
}
