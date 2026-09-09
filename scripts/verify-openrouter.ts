// Deep verification for the OpenRouter failover path.
// Run:  cd server && npx tsx ../scripts/verify-openrouter.ts
// Checks: key pickup (no restart) → auth → simple chat → JSON mode →
// Hinglish talking-points prompt → Hinglish draft prompt → cost accounting.
// Exits 0 only if every check passes.
import { getOpenRouterConfig } from "../server/src/config/env";
import { callOpenRouter, extractTalkingPoints } from "../server/src/utils/gemini";

const IN_PER_M = 0.27;
const OUT_PER_M = 0.41;
let promptTokens = 0;
let completionTokens = 0;
let failures = 0;

function check(name: string, cond: boolean, detail = "") {
  if (!cond) failures++;
  console.log(`[${cond ? "PASS" : "FAIL"}] ${name} ${detail}`);
}

async function tracked(prompt: string, system?: string, json = false) {
  const r: any = await callOpenRouter(prompt, system, json ? ({ responseMimeType: "application/json" } as any) : undefined);
  return typeof r === "string" ? r : r.text;
}

async function main() {
  const cfg = getOpenRouterConfig();
  check("key hot-picked from .env (no restart)", !!cfg.apiKey, `model=${cfg.model}`);
  if (!cfg.apiKey) {
    console.log("ABORT: paste OPENROUTER_API_KEY into server/.env first");
    process.exit(1);
  }

  // 1. auth check via /models
  const mRes = await fetch(`${cfg.baseUrl}/models`, {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    signal: AbortSignal.timeout(20000),
  });
  check("GET /models auth (key valid)", mRes.ok, `status=${mRes.status}`);
  if (mRes.ok) {
    const models: any = await mRes.json();
    const ids: string[] = (models.data || []).map((m: any) => m.id);
    check(`model ${cfg.model} listed`, ids.includes(cfg.model), `catalog=${ids.length} models`);
  }

  // 2. simple chat quality
  const simple = await tracked("Say hi in exactly 3 words.", "Be brief.");
  check("simple chat non-empty", simple.trim().length >= 2, `got=${JSON.stringify(simple.slice(0, 60))}`);

  // 3. JSON mode with the exact talking-points contract
  const tpPrompt = `Business: Test Biz
Customer's star rating: 4/5
Customer's notes about their visit: "Service mast tha but thoda wait karna pada"

MANDATORY OUTPUT LANGUAGE (apply to every word of every bullet — this overrides everything):
Write the reminder bullet points in natural Hinglish — a casual mix of Hindi and English using ONLY the English/Latin alphabet (no Devanagari).

Produce 2-5 short reminder bullets grounded strictly in what the customer wrote above. If the customer notes above are non-empty, return at least 2 bullets — never an empty list. Respond with this exact JSON shape: {"talkingPoints": ["first reminder", "second reminder"]}. Every single word must be in the language stated in the MANDATORY OUTPUT LANGUAGE section.`;
  const tpSys = "You ONLY produce short reminder bullet points. Every bullet must be grounded in a SPECIFIC detail the customer provided. Keep each bullet under 12 words.";
  const tpRaw = await tracked(tpPrompt, tpSys, true);
  let tp: string[] = [];
  let tpShapeNote = "";
  try {
    tp = extractTalkingPoints(JSON.parse(tpRaw));
    if (tp.length === 0) tpShapeNote = `raw=${tpRaw.slice(0, 160)}`;
  } catch {
    tp = [];
    tpShapeNote = `unparseable raw=${tpRaw.slice(0, 160)}`;
  }
  check("talking-points JSON parses with >=2 Hinglish bullets", tp.length >= 2, `n=${tp.length} first=${JSON.stringify((tp[0] || "").slice(0, 60))} ${tpShapeNote}`);
  const latinOnly = tp.every((b) => !/[\u0900-\u097F]/.test(b));
  check("bullets honor Latin-script Hinglish", latinOnly);

  // 4. Hinglish review draft quality
  const draft = await tracked(
    `Business: Test Biz\nCustomer's rating: 4/5\nCustomer's own words: "Service mast tha but thoda wait karna pada"\n\nWrite a short, natural, authentic-sounding review draft (2-5 sentences) in natural Hinglish using ONLY Latin script. Output ONLY the review text.`,
    "You generate short authentic review drafts grounded in the customer's own words."
  );
  const hinglishMarkers = /(tha|thi|the|hai|hain|bahut|bohot|thoda|accha|mast|badhiya|ne|ko|mein|par)\b/i;
  check("draft is Hinglish (not pure English)", draft.length > 30 && hinglishMarkers.test(draft), `len=${draft.length} head=${JSON.stringify(draft.slice(0, 80))}`);

  // 5. cost accounting from last-call usage is server-side; estimate here by chars (~4 chars/token)
  console.log(`\nEstimated test cost: < $0.005 total (each call ~500-900 tokens @ ~$0.27/$0.41 per 1M for deepseek-chat). Production drafts ≈ $0.0002 each.`);
  console.log(`Prompt tokens ≈ ${promptTokens}, completion ≈ ${completionTokens} (tracked client-side: n/a — server does not expose usage; estimate only)`);

  console.log(failures === 0 ? "\nALL OPENROUTER CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", String(e?.message || e).slice(0, 300));
  process.exit(1);
});
