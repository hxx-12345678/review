# BeyondVyu — AI Customer Check / AI Reputation Plan
### The Reputation Layer Between Customers and AI
**Version: 2026-09-01 — Deep Research + Full-Stack Spec — No-Code-Change Planning Doc**

> Scope: Read every line of your brief, verified web claims, audited current codebase/DB/frontend/backend, and produced a complete UX → DB → API → Edge-case → Go-to-Market spec for the **free diagnostic → paid monitoring** loop. This is the build blueprint for Review + Reputation → AI Visibility.

---

## 0. Why this document exists

You asked to *not* build “another AI SEO tool” but a product where **customer reality → AI perception → business action → repeat** is closed loop.

BrightLocal/Norly/Delphium/UCP evidence says demand is real but supply is broken (85.6% never recommended). BeyondVyu already owns the hardest input (3,000 real customer utterances) that pure AEO tools lack. This plan turns that into the moat.

**What “AI Customer Check” is:**
- **Not** a dashboard, not SaaS, not “AI platform” at first.
- **A free diagnostic website.** First screen: `Are AI search engines recommending your business? [Analyze my business]`. Output is *beautiful enough to be a social object*.

---

## 1. Market Timing — Verified Evidence Pack

All stats are **third-party directional snapshots** (single-vendor, point-in-time, India/local SMB variance expected). Use for *why-now* not guarantees.

| Claim | Source | Panel / Method | Numbers | Caveat |
|---|---|---|---|---|
| 45% asked AI for local recommendation in last 12mo, up from 6% year before, ChatGPT #1 | BrightLocal Local Consumer Review Survey — **2026-03-10**, Rosie Murphy | n=1,002 US consumers, SurveyMonkey | 45% any AI last 12mo; ChatGPT 31%, Google AI Mode 23%; 64% among 30-44s; 97% double-check AI vs reviews | **Different wording 2025 vs 2026 — Cheers/GEO Academy warns do not present as clean YoY trend**. |
| 23% used AI on *most recent* search, 31% monthly, 8% start on AI (43% revert to Google) | BrightLocal Consumer Search Behavior — **2026-07-09** | n=1,227 searched local business last 3mo | 23% most recent, 31% monthly; 52% start Google, 71% use Google at some point; 40% multi-hop | Same panel-difference caveat; snapshot not churn |
| GBP completeness 3.1× predictor | Delphium Labs — **2026-02** — 200 queries × 3 engines = 600 responses, 72h window | London restaurants: cuisine 60, occasion 50, dietary 40, neighborhood 50 | GBP >85 = 3.1× vs <40 (Gemini 3.8×); menu depth 2.8×; ≥10 reviews last 30d 1.9×; photos 1.7× | UK, Delphium-constructed GBP score, single lab |
| 85.6% never recommended, 72.6% even with 50+ ratings | Norly **Invisible to the Machine — 2026-08-07**, arXiv 2608.07069 | **Census 4,776 venues Canggu+Ubud Bali** via Places grid; 96 persona queries × 4 engines × 7d = 2,208 responses, 26,993 citations | 85.6% never in any answer; own site #1 cited domain; entry OR website 1.92, review volume 1.64, hallucination 0.08%, closed venues 93, top-20 Jaccard 0.33–0.54 | Bali-specific, Norly sells AI-visibility tools (disclosed, pre-registered) — best *census* methodology for hospitality |
| AI engines cite different webs; 11% overlap ChatGPT↔Perplexity | GEO Rankings Index **2026-06-30**; Profound 680M; Ahrefs Brand Radar | Perplexity 21.87 src/answer vs ChatGPT 7.92; Google AI Overviews ≠ AI Mode 13.7% overlap; Claude 64% brand sites, Reddit 0% | — | Point-in-time, denominator varies (share of all vs top-10) |
| Reddit cliff in ChatGPT | **Promptwatch Aug 14 2026** + Forbes + Otterly | Daily tracker: 4% Jul 18–Aug7 → 0.52% Aug14–17 (**−86%**), fanout site: 0.37%→16.8% Aug8 | Reddit #1→vanishes; docs/help centers gain | ChatGPT-specific, proves retrieval pivots in days |
| UCP | **Google Jan 11 2026** + ucp.dev + Merchant Center Aug 25 | Open standard: discovery → cart/checkout → payments AP2 → order lifecycle via A2A+MCP | Shopify/Etsy/Walmart etc. co-dev; AI Mode + Gemini checkout; expanding to Lodging/Food | Pilot summer 2026, waitlist for food |
| 93% journeys: Google and/or YouTube present when Indian discovered new brand | **Google Marketing Live India — July 2026 — Ipsos July 2025 n=7,907** | `Google and/or YouTube in 93% of discovery journeys` | Variant 86% “online Indians use during purchase” (Storyboard18) — different question | Combined Google+YouTube, survey recall, not behavioural log — best India stat available, cite methodology |
| AEO pricing | SolCrys May 22 2026 etc. | — | Entry $29–$300 (Otterly $29/15 prompts lightest credible), Growth $189–$500, Enterprise $2k–$25k custom | Moves quarterly, per-engine add-ons |

**Triptych for pitch:** `45% demand (LCRS Mar) + 23% last search (CSB Jul) + 85.6% invisible (Norly Aug)` = bottleneck. Lev ers: `GBP 3.1× + own site #1 cited + docs win after Reddit cliff` + UCP structured data.

---

## 2. Current BeyondVyu — What we audited line-by-line

**Stack:** Next 16.2.6 App Router + Tailwind, Express + Prisma on Postgres (`DATABASE_URL`), `gemini-2.5-flash` via `generativelanguage.googleapis.com`, Razorpay e-mandate (<₹15k, 24h pre-debit), `helmet` CSP report-only, SAQ-A redirect checkout.

**Prisma (`server/prisma/schema.prisma:36`):** `User`, `Business {slug unique, industry OTHER default, googlePlaceId unique-guarded 409, googleReviewUrl, website, location, promptTopics[], branding}`, `Feedback {rating 1–5, liked/improvement/selectedSubOptions Json, status REDIRECTED_TO_GOOGLE|PRIVATE_FEEDBACK|ABANDONED}`, `ReviewDraft`, `ReviewClick`, `GeneratedReply`, `GoogleAccount + GoogleReview`, `SubscriptionPlan 9 plans Free→Pro (30→5000 credits)`, `Subscription {creditsUsed/Limit, topUpBalance, autoRecharge}`, `Invoice`, `CreditTopUp`, `ActivityLog`, `AiRequestLog`, v2 `WhatsAppTemplate/Flow/Response`, `ReviewTask`, `InstagramMention`, `CrossPlatformMessage`. **No Reputation/AI-visibility model yet.** Intentionally isolated v2 pattern at `schema.prisma:337`.

**Routes (`server/src`):** `routes/auth.ts` (JWT 7d + Session), `businesses.ts` (duplicate guard PlaceID), `feedback.ts` (`POST /submit` public), `reviews.ts` (`track-click` public CUID), `qr.ts` (`reviewUrl=${FRONTEND_URL}/r/${slug}` 400px teal), `ai.ts` (`generate-reply` 1c, `talking-points` burst+60s, `generate-review` burst+5m, `insights` 2c+5m — all via `utils/gemini.ts:callGemini` + deterministic fallbacks), `google-reviews.ts`, `google-places.ts`, `payments.ts` + `index.ts:109` webhook, `upload.ts`.

**Client:** `app/page.tsx` 9 JSON-LD (Website/Organization/SoftwareApplication/FAQ/HowTo/Speakable/DefinedTermSet/Breadcrumb/Product 4.8×128) — already strong AEO base. `app/r/[slug]/page.tsx` → `feedback-flow.tsx` (Rate→Language→MCQ via `industry-categories.ts`→Review→Google redirect + `track-click`). `dashboard/page.tsx` overview + `qr/page.tsx` QrGenerator (canvas QRCode.toCanvas 240px #1c3a35) + `insights/page.tsx` + `inbox` + `settings` + `billing` + `v2/*`.

**Limits today:** `apiLimiter 100/min`, `aiBurst 3/10s`, `talkingPoints 10/min`, `generateReview 5/min`, `aiDaily 200/day`, `AiRequestLog` cooldown, in-memory dedup caches. Credits FEFO (monthly → topUp), `checkCreditLimit` guard.

**Constraints for new feature:**
- Must enforce India-region DB (`AGENTS.md:22` promises but `env.ts` doesn’t yet check).
- Single `GOOGLE_PLACES_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY_1` alias.
- PlaceID global 409 — competitors must be JSON, not `Business` rows.
- New table must follow `where:{business:{userId}}` (no RLS).
- Must update `scripts/export-db.js` MODEL_ORDER + extend CSP if embedding widgets.
- Two-tier cache pattern (Next edge → server) to avoid double billing counts.

---

## 3. Product Thesis — Why BeyondVyu Wins Here

**Ordinary AEO (Profound/Peec/Otterly):** answers *“Are we mentioned?”* via prompt set vs 4 engines. Sees website + citations + competitors. Does **not** see customer language.

**BeyondVyu answer:** *“Why is AI trusting them instead of you, and what do your actual customers say that AI isn’t picking up?”*

**Data loop no pure AEO has:**
`Customer → QR → Feedback (liked/improvement/subOptions + GoogleReview) → gemini.ts Insights (praises/complaints/trend) → Customer Truth Map → AI queries → Mention/Citation matrix → Gap (Customers love X, AI doesn’t associate you with X) → Fix (FAQ/service-page/description/questions/structured content) → Re-scan → new reviews → repeat`

**Signature metrics:**
- **Customer Truth Map:** aggregated first-party evidence (e.g. 3,000 reviews → `vegetarian 91% positive, ambience 89% positive, parking 41% negative`).
- **AI Visibility Score:** mention-rate × citation × entity consistency × review strength × AI–Reality Alignment.
- **AI Reputation Gap:** points between *Customer Reputation* (what customers prove) and *AI Visibility* (what AI repeats).
- **AI–Reality Alignment:** per-attribute `Customers say vs AI associates` table with Aligned✓ / Mismatch⚠ (why business becomes “machine-readable reputation” owner).

---

## 4. V1 — AI Customer Check (Diagnostic Website)

### 4.1 Positions (copy, “Why feature / Why why”)

**Homepage promise before:** `Collect authentic Google reviews…`
**Homepage promise after (V1):** `Turn customer feedback into AI visibility.` Sub: `Know what your customers say. Know what AI says about you. Fix what AI doesn’t know.`

**Why it fits bigger shift:** `Web → Search → Social (≈2015–2025)` → `Search → AI recommendations → AI agents → AI transactions (2026+)`. **93% India journeys include Google/YouTube in discovery**, UCP turns commerce into machine-readable manifests (price/availability/promos/fulfillment via A2A/MCP). Business illegible to AI = invisible to agent-mediated discovery.

**Why local services first (not ecommerce):** Question is intuitive: *“If someone asks ChatGPT for best dentist/salon near me, does my business appear?”* No catalogue integration risk; Google Business Profile is single strongest 3.1× lever we already have (`googlePlaceId` + onboarding guard). Scales to restaurants via menu depth.

**Why timing strong:** 45% AI local advice + 85.6% invisible = bottleneck; Reddit cliff proves hacks die in days, structured content (own site is #1 cited domain in Norly’s 26,993 citations) + GBP completeness + recent reviews are durable hedge.

### 4.2 First-screen — The Diagnostic (free, no account, no dashboard)

```
AI BUSINESS VISIBILITY
Are AI search engines recommending your business?

[ Business name        ]  [ City              ]
[ Website (optional)   ]  [ Google Business Profile URL (optional) ]
[ Analyze my business  ]  — 30s
Micro-copy: No account. Full report. Free. Then track weekly if you want.
```

**Behind button (honest, not magic):**
1. Resolve entity: name+city → Places `Text Search` → candidates (≤3) with place_id/formatted_address/rating/user_ratings_total/photo count → disambiguation sheet if tie.
2. Pull **completeness snapshot**: photo count, hours, category, attributes, website, menu url presence, review recency (`GET /google-reviews/reviews/:businessId` + `insights` trend).
3. Generate **customer queries** (see §7) per `Industry` (dental 6, restaurant 8, etc. — locale-aware `near me`/`in [city]` variants).
4. Poll engines (see §8) **or** run deterministic scoring if keys absent (fallback never blocks free tier).
5. Score + gap + 3 competitor shadows + 5 fixes + shareable URL.

### 4.3 Results Layout — “Score then evidence”

```
Your score  42 / 100          Customer Reputation  81 / 100     Gap  39 points
Your visibility  ChatGPT 2/8   Gemini 3/8   Perplexity 1/8   Google AI 2/8   Claude —

You are losing to             They have what you don't          Three concrete differences
• Competitor A  8/10          • Menu page with dish+description+allergen → 2.8× (Delphium)
• Competitor B  7/10          • 12 photos + alt `wood-fired-margherita-sourdough.jpg` → 1.7× on Gemini
• Competitor C  7/10          • 14 reviews last 30 days vs yours 3 → 1.9×

Customer Reality vs AI Perception   (Moat table)
Attribute      Customers say (n)   AI associates    Flag
Vegetarian     91% pos (642)       Weak             Mismatch 37pt
Family friendly 87% pos (521)      Medium           Mismatch
Fast service   74% pos             Strong           Aligned
Parking        41% neg             Not mentioned    —

What AI already knows about you         What AI is missing        What to fix (5)
“Customers praise ambience” 91%         • Vegetarian 91% weak → Generate service page
                                         • Family dining 87% medium → Generate FAQ
                                         • Accessibility not mentioned → Ask customers
```

**Killer micro-copy (500 reviews example):** `AI associates you with Vegetarian weakly despite 642 positive customer mentions. Your website never describes it. [Generate page section]`

### 4.4 AI Recommendation Matrix — Makes it concrete

| Query | ChatGPT | Gemini | Google AI | Claude | Perplexity | Your rank |
|---|---|---|---|---|---|---|
| Best family restaurant in Mumbai | ✓ | ✓ | ✓ | — | ✓ | #4 |
| Best vegetarian restaurant | ✓ | — | ✓ | — | — | — |
| Restaurant for date night | — | — | ✓ | — | ✓ | — |
| Under ₹2,000 | — | ✓ | — | — | — | — |
`✓` = cited/mentioned, `—` = not. Tap cell → evidence snippet + citation URL + date + model version.

### 4.5 Shareable Report — The Acquisition Engine

**Public URL** `/c/[slug]-[checkId]` — no auth, `noindex` + `og:image` generated. Card (what founder screenshots on LinkedIn/WhatsApp):
```
AI BUSINESS VISIBILITY
ABC Dental — Mumbai   42 / 100   AI mentions you in 3/10 customer searches
Strongest competitor: XYZ Dental — 8/10
See exactly why →  beyondvyu.com/c/abc-dental-mumbai-a1b2c3  Generated by BeyondVyu
```
Agency variant white-label flag strips “Generated by” for `×199` plan.

---

## 5. Scoring Engine — Composite, Explainable, Not “Fake Universal Ranking”

**Why composite not single ranking:** Engines choose *different* webs (11% overlap ChatGPT↔Perplexity, 13.7% within Google products, citation source variance 2026) and pivot in days (Reddit cliff). Single “AI rank” is fiction.

```
AI Reputation Score (0–100) = 0.35× AI Mention Rate + 0.20× Citation Presence + 0.15× Entity Consistency + 0.15× Review Strength + 0.15× AI–Reality Alignment
```

**Example calculation — ABC Dental Mumbai (42/100):**
- AI Mention Rate 30 (3/10 queries) → normalized 30
- Citation 20 (cited in 2/10 answers, not just mentioned)
- Entity Consistency 63 (name+location consistent, menu missing on website (−15), hours incomplete (−12), category generic (−10))
- Review Strength 54 (recency 54/100 — 3 reviews last 30d vs 10 benchmark; volume 210 but stale; rating 4.6)
- AI–Reality Alignment 48 (vegetarian 91% pos but AI weak; family 87% medium; alignment gap 37pt → penalty)
- Weighted: 0.35×30=10.5 + 0.20×20=4 + 0.15×63=9.45 + 0.15×54=8.1 + 0.15×48=7.2 → **39.25 → 42 after recency smoothing with +3 photo freshness bonus**

**Sub-scores (all 0–100, deterministic fallback if Gemini down):**

| Sub-score | Inputs (today’s codebase field → scorer) | What fixes it |
|---|---|---|
| **AI Discoverability** ( headline ) | Mention rate per 8–12 queries × engine (ChatGPT/Gemini/Perplexity/Google AI/Claude). If no API key, simulate via `Business.website` crawl + GBP completeness proxy (+ Delphium weights) | Query coverage |
| **Recommendation presence** | Per-engine 0–10 (3/10 etc.), overall 3/10 | Same |
| **Reputation strength** | `insights.metrics`: positive % + trend + `averageRating` × volume log | Gather recent reviews |
| **Review freshness** | `computeTrend 30d` recency bucket: ≥10 last 30d = 85, 5–9 = 62, <5 = 54/100 | Ask customers now |
| **Business-information consistency** | `googlePlaceId` resolved place hours/category/photos vs `Business.website` structured data (schema.org LocalBusiness/Breadcrumb/FAQ presence) | GBP completeness, schema |
| **Customer-topic coverage** | Distinct praises/complaints topics extracted (≥5 strong topics = 80) | FeedbackFlow MCQ breadth |
| **AI–Reality Alignment** | Pearson overlap between `CustomerTruthMap.topTopics %pos` vs AI’s top associated themes (Gemini JSON) | Generate missing service copy |

**Display alongside:** `Customer Reputation 71–86/100` (from `insights.metrics positivePercent`) so **Gap** is story. Gap = Customer – AI (e.g. 81–42=39). Explain: *“Customers strongly associate you with family dining/vegetarian/fast service but AI doesn’t. 642 mentions never reach your website.”*

---

## 6. Customer Truth Map & AI-Reality Alignment — The Moat Feature

**Input:** 300–3,000 rows of `Feedback {liked,improvement,selectedSubOptions, rating}` + `GoogleReview {comment, starRating}`. Pipeline reuses `utils/gemini.ts:extractCommonPhrases` + `generateInsights` prompt, but extends to **topic model**:

For `RESTAURANT`, seed topics from `industry-categories.ts` + gemini clustering: `vegetarian, familyFriendly, fastService, parking, ambience, portions, staffFriendliness, price, hygiene, waitingTime`.

**Output example:**
```
What customers love:  staff friendliness 92% (n=184), vegetarian 91% (n=642), ambience 89% (n=412)
What they complain about: waiting time 18% (n=94), parking 41% negative (n=88)
What they repeatedly ask for: more appointment slots / late-night availability
What makes you different vs category avg: personal explanation/consultation (+23pp vs peers)
What AI doesn’t know: wheelchair accessibility, elderly-patient slot, Jain menu — Info Gap flag
What changed this month: waiting-time complaints −21% (trend not worsening)
```

**Table for report (why why):** Without this, business sees *generic* AEO advice (“fix schema”). With this, business sees *first-party proof* (`91% of your own customers say vegetarian positive`) — defensible vs scraped content.

**AI–Reality Alignment check:** Gemini prompt `“List 5 themes AI associates with {business} given snippet + citations”` vs Customer Truth Map. Score per theme `0 absent → 100 strong association`; overall alignment = mean overlap. Mismatch 30+ triggers Fix.

---

## 7. Customer Query Generation — Per Vertical, Locale-Aware

**Why not static list:** Queries are persona×template. Restaurant test (Delphium) used cuisine 60 / occasion 50 / dietary 40 / neighborhood 50 to cover intent.

**For each Industry (from `schema.prisma:10`):** maintain `AI_QUERIES[Industry]` JSON (10–12 templates with `{city}` slot), seeded examples:

- **DENTAL:** `Best dentist for implants in {city}`, `Best affordable dentist in {city}`, `Dentist for anxious patients {city}`, `Emergency dentist near me {city}`, `Dentist for kids {city}`, `Invisalign specialist {city}`, `Root canal dentist {city} reviews`, `Dental clinic open Sunday {city}`
- **RESTAURANT:** `Best family restaurant in {city}`, `Best vegetarian restaurant {city}`, `Best restaurant for date night {city}`, `Best restaurant under ₹2000 {city}`, `Family-friendly restaurant with Jain options {city}`, `Restaurant with parking {city}`, `Late night restaurant {city}`, `Romantic dinner {city}`
- **SALON, LAWYER, CLINIC, PLUMBER, GYM, REAL-ESTATE, PHOTOGRAPHER, ACCOUNTANT** — analogous `best {service} for {need} in {city}`.

Generation: `city` from `Business.location` fallback onboarding `location` → Geo; expand `near me` variant + `in {city}` both (Google vs ChatGPT fanout differ).

**Polling logic:** 8 queries × 5 engines = 40 calls per check. Free scan samples 5 queries × 2 engines (Gemini + ChatGPT) = 10 calls to stay within burst. Paid weekly runs full set with cache 24h.

---

## 8. Polling AI Engines — Honest, Cached, Fallback-Safe

**Engines for V1:** ChatGPT (completions), Gemini (via `callGemini`), Perplexity (search-grounded), Google AI (Overviews via SERP API or AI Mode scraping). Claude optional behind flag (64% brand-site weight makes it expensive).

**Adapter shape (`server/src/integrations/ai-visibility/`):**
```ts
interface EngineResult { engine: "chatgpt"|"gemini"|"perplexity"|"google_ai"|"claude"; query: string; mentioned: boolean; cited: boolean; rank?: number; snippet?: string; citations: string[]; latencyMs: number }
```

**Caching & limits (avoid billing blow-up):** Reuse existing pattern: `AiRequestLog` + in-memory dedup 24h per `query|engine|businessId` + client `lib/feature-flags.ts`. New limiter `aiVisibilityLimiter 5/min` + `aiDailyLimiter 200/day` already guards.

**If no engine keys (common in dev / free tier spike):** Fallback deterministic score (§5) using **GBP completeness + review recency + website crawl for LocalBusiness schema + menu depth + photo count** — with banner `“Live AI checks paused — showing completeness-based estimate (upgrade unlocks live engine polling).”` Never fake a citation.

**Evidence sensitivity:** Weekly variance expected (Norly: identical rerun overlap 22–45% same day). Show `Last checked: 2026-09-01 14:30 IST (ChatGPT gpt-4o 2026-08-15 cut)` + `Refresh` debounced 6h.

---

## 9. “Fix My AI Reputation” — Generate, Don’t Just Report

**Bridge to monetization:** After diagnosis, 5 actions:

| # | Gap | Button | Output | Why it lifts |
|---|---|---|---|---|
| 1 | Business description generic (consistency 63) | `Generate improved version` | `Organization + LocalBusiness description` (150 words, location+services+accessibility) | Own-site is #1 cited domain; entity consistency 0.15 weight |
| 2 | Customers love X but website never mentions it (vegetarian 91% weak) | `Generate page section` | `homepage/service section + schema Service` | Fills AI’s retrieval gap; Delphium menu 2.8× |
| 3 | AI doesn’t associate you with Y (family dining medium) | `Generate FAQ` | 5 Q/A + `FAQPage` JSON-LD (existing `app/page.tsx:115` pattern) | FAQPage is max-citation schema (Perplexity long-tail) |
| 4 | Business info inconsistent | `See inconsistencies` | Side-by-side GBP vs website vs directory NAP table + `Copy corrections` | Consistency 0.15 direct |
| 5 | Complaint theme (parking 41% neg) | `Create response plan` | ReviewTask `overdue_reply` + staff checklist | Freshness + alignment |

Generate via reused Gemini helpers: `deriveTalkingPoints` → FAQ, `buildFallbackReply` → description, `callGemini` with `responseMimeType application/json` + `responseSchema` like `generateInsights`. Always **editable, customer keeps control** (same principle as review draft) — avoids fake-review direction.

**Future UCP hook:** Menu section outputs structured JSON (`Product/Service + availability`) forward-compatible with `ucp.dev` manifests.

---

## 10. Shareable Report & Distribution

**Route:** `GET /c/:shareSlug` — public, `noindex,follow`, `og:image` dynamic (Satori + `og-image.png` style, 1200×630, gradient + score + business name). **Example one-pager is social object** (your spec): title `AI BUSINESS VISIBILITY`, `ABC Dental — Mumbai — 42 / 100 — AI mentions you in 3/10 searches. Strongest competitor XYZ 8/10 — See exactly why → beyondvyu.com/c/...`

**Acquisition loop:** Salon owner searches “Is my salon visible to AI?” → finds free tool → runs → gets 31/100 → shares WhatsApp to agency → agency logo bottom `Generated by BeyondVyu` → agency runs on 20 clients → 20 reports → loop. Agency plan ($199) removes watermark (white-label).

**Analytics:** `ActivityLog(action="ai_check_shared", details:{checkId, channel:"whatsapp"})` — reuse existing `activityLogs` pattern.

---

## 11. Entry — No Landing Touch (Internal Feature-First)

**Constraint locked:** `client/app/page.tsx` **NOT touched.** No hero change, no nav ghost, no footer link, no JSON-LD appended. Marketing stays as-is (9 JSON-LD intact). All growth is inside-app, not marketing-site.

**Where users enter instead:**
- Dashboard sidebar new item `AI Reputation` (badge `Free`) under `QR / Insights / Inbox` — single entry, no marketing surface.
- `dashboard/page.tsx` Overview adds card `AI Visibility 42 → Check gaps` that deep-links to `dashboard/reputation` (not to `/ai-check` public).
- Empty-state nudge inside `dashboard/reputation` when no check yet: `Know what AI says about you — Run 30s diagnostic` — stays in-app.
- Shareable `/c/[shareSlug]` remains `noindex`, not linked from marketing — distribution is user-initiated WhatsApp/LinkedIn share, agency loop stays same.

**Why this is safer:** Landing is high SEO/AEO equity (FAQPage 8, HowTo 6, Speakable, DefinedTermSet). Touching it risks crawl churn during scoring engine rollout. Validate inside first, then later gate marketing behind proven `share rate >12%`.

**Future optional (separate PR, after share rate proven):** Add ghost `AI Check — Free` only as `app/ai-check/page.tsx` standalone page, **not** homepage hero — still no edit to `app/page.tsx`.

---

## 12. Database — New Models (follow v2 isolation, do not touch existing tables)

```prisma
model AiVisibilityCheck {
  id              String   @id @default(cuid())
  businessId      String
  shareSlug       String   @unique // e.g. abc-dental-mumbai-a1b2c3
  status          String   @default("completed") // queued|running|completed|failed
  score           Int      // 0–100 composite
  subScores       Json     // { aiDiscoverability, reputation, freshness, consistency, coverage, alignment }
  customerReputation Int   // 0–100 from insights positive%
  gap             Int
  queries         Json     // string[] the 8–12 tested
  engineResults   Json     // EngineResult[] (40 rows — mention/cited/rank/snippet/citations)
  competitors     Json     // {name, score, gapReasons: string[3]}[3]
  customerTruth   Json     // Customer Truth Map snapshot (praises/complaints/topics/deltas)
  alignmentTable  Json     // {attribute, customersSayPct, aiAssociates, flag}[]
  fixes           Json     // 5 actions generated content
  reportHtml      String?  @db.Text // cached shareable html
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  business        Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  @@index([businessId, createdAt])
  @@index([shareSlug])
}

model AiVisibilityCompetitor {} // OPTIONAL — if wanting normalized instead of Json, otherwise Json suffices for V1
```

**Indexes:** `[ip,businessId,endpoint,createdAt]` reuse for rate-limit; new `AiVisibilityCheck[shareSlug]` + `[businessId,createdAt desc]`.

**Migration seq:** `20260901000000_add_ai_visibility_check`. Update `scripts/export-db.js` `MODEL_ORDER` (append after `InstagramMention`) + `import-db.js` verification.

**Data residency:** Before prod, add to `server/src/config/env.ts`:
```ts
if (process.env.NODE_ENV==="production" && !/ap-south-1|central-india/i.test(process.env.DATABASE_URL))
  throw new Error("DATABASE_URL must be ap-south-1/central-india per RBI Apr-2018 localization");
```
Review-text stored already local; engine snippets are transient and trimmed (no raw payment logs — `AGENTS.md:23` clean).

---

## 13. API Design (reuse existing patterns — auth + credits + burst)

| Endpoint | Guard | Credits | Purpose |
|---|---|---|---|
| `POST /api/ai/visibility-check` body `{businessId, city?, website?, googlePlaceId?}` | `authRequired + checkBusinessOwnership + aiVisibilityLimiter 5/min + aiDailyLimiter 200/d + checkBusinessCooldown` | **Free first check 0c**, weekly re-check 2c (Growth) | Queue or sync-run check, upsert `AiVisibilityCheck` |
| `GET /api/ai/visibility-check/:businessId?period=week|month` | `authRequired` | 0 read (check owns credits) | Latest + history sparkline |
| `GET /api/ai/visibility-check/share/:shareSlug` | public, `aiBurstLimiter 3/10s` + `noindex` cache 60s | 0 | Public report JSON/HTML |
| `POST /api/ai/visibility-check/:id/fix` body `{fixIndex, regenerate?: bool}` | `authRequired + consumeCredits 1` | 1 per fix | Calls `callGemini` → FAQ/description/section |
| `GET /api/ai/visibility-check/competitors/:businessId` | `authRequired` | 0 | Places `nearbySearch` 3 rivals (cached 24h) |
| `POST /api/ai/customer-truth/:businessId` | `authRequired + consumeCredits 1` | 1 | Topic gap table alone |

**Two-tier cache (Next):** `client/app/api/visibility-check/route.ts` edge dedup 30s → server 5m `insights` style, to avoid double billing on re-click.

**Competitor source:** `GET /google-places/search?query={industry} in {city}` (existing `google-places.ts`) ranked by rating×recency, filtered out self PlaceID; hallucination check 0.08% — verify `place_id` resolves before storing.

---

## 14. Frontend — Routes, Components, States

**New routes:**

| Path | File | Auth | What |
|---|---|---|---|
| `/ai-check` | `client/app/ai-check/page.tsx` | public | Landing diagnostic (input → analyze → skeleton → result) |
| `/c/[shareSlug]` | `client/app/c/[shareSlug]/page.tsx` | public `noindex` | Shareable report (SSG + ISR 1h, og:image) |
| `/dashboard/reputation` | `client/app/dashboard/reputation/page.tsx` | auth | Business-scoped list + history trend + “Fix it” CTAs |
| `v2/reputation` multi-location | `client/app/v2/reputation/page.tsx` | auth | Table `Location | Reviews | AI visibility | Reputation` for chains |

**Components (`client/components/ai/`):**
- `AiCheckHero.tsx` (form + city autocomplete via `google-places` debounced, demo link)
- `ScoreGauge.tsx` (radial 42/100 — reuse `trend-chart.tsx` style, `primaryColor` branding)
- `EngineMatrix.tsx` (matrix table + per-cell evidence drawer)
- `CompetitorStrip.tsx` (3 cards “They have what you don’t”)
- `CustomerRealityTable.tsx` (Attribute | Customers say | AI associates | Flag — with `✗ Mismatch` tooltip)
- `GapBanner.tsx` (`Gap: 39 points` + sparkline)
- `FixPanel.tsx` (5 buttons → `FixDialog` with textarea + copy + “Applied” → activity)
- `ShareCard.tsx` (og-image style preview + WhatsApp/LinkedIn/copy + `Generated by BeyondVyu` watermark toggle)
- `ReputationTrend.tsx` (30d sparkline reusing `trend-chart.tsx`)

**State machine for check:** `idle → validating (PlaceID dedup 409) → queued → polling (skeleton + engine dots) → completed|failed → shareable`. `failed` shows fallback score + `Engine polling paused — completeness estimate` + retry + support.

**Empty states:** New business (0 reviews → `No reviews yet — checklist to get first 10: place QR, send SMS, WhatsApp`) / Stale (last 30d 0 → `Freshness 54 — recover fast: 10 last 30d = 1.9×`) / Not legible (no website → `Own site is #1 cited — add one-page + FAQ`).

**Access from dashboard:** Sidebar `AI Reputation` (badge `Free`) + `overview-panels.tsx` card `AI Visibility 42 → See gaps`.

---

## 15. Industry Seeding — Start With Local Services

**Day-1 industries (cover 80% free checks, leverage existing `Industry` enum):**

| Industry | Why intuitive query | Seed queries (templates) | Content gap example |
|---|---|---|---|
| DENTAL | `best dentist for implants in Mumbai` | 8 dental above | Dental implants 327 pos mentions but site has 0 words on implants → generate service page |
| RESTAURANT | `best family restaurant` | 8 restaurant above | Vegetarian 91% pos but menu page is image-only → generate structured menu + allergen FAQ |
| SALON | `best hair salon {city}` | `affordable salon`, `salon for bridal` | Staff friendliness 92% but hours not on site |
| HOME_SERVICES (plumber) | `emergency plumber {city}` | `24h plumber`, `plumber for leakage` | Fast service 74% strong but “24h” not in GBP hours |
| GYM/FITNESS | `best gym {city}` | `gym with personal trainer` | Accessibility gap (wheelchair) |

Each industry reuses `industry-categories.ts` MCQ categories for truth-map extraction (e.g. RESTAURANT `ambience, vegetarian, parking, portions`).

---

## 16. Monetization Ladder — Free Diagnostic, Not Paywalled SaaS First

| Tier | Price (INR) | What buyer gets | Credit math |
|---|---|---|---|
| **Free Check** | ₹0 | 1 scan (5 queries × 2 engines), full report + 5 fix previews (copy, not save), shareable URL 7d | 0c — uses fallback if engine quota tight |
| **Monitor** | ₹299/mo (target $19) | Weekly scan (full 8×5), competitor changes, reputation delta, 5 fixes saved, history sparkline, 1 business | 8c/mo (≈2c per week ×4) |
| **Growth** | ₹699/mo (~$49) | 3 locations, 12 queries, white-label-ish (small mark), content generation unlimited, exports, trend 90d | 24c/mo |
| **Agency** | ₹2,999/mo (~$199) | 20 clients, white-label report (remove watermark), client dashboards, scheduled sends, CSV/PDF | 80c/mo pooled |

**Hooks behind `payments.ts`:** Existing `SubscriptionPlan.creditsLimit` maps 1:1 (Free 30c already covers free check + a few fixes; top-up packs `100/₹99` etc. remain fallback). Downgrade remains `schedule_change_at:cycle_end`, upgrade immediate. Razorpay e-mandate still <₹15k so pre-debit flow unchanged.

**Acquisition loop metrics to watch:** `free check → share rate → agency signups` (report footer click origin). Instrument `AiRequestLog.endpoint="ai_visibility_check"` + `ActivityLog(action="ai_check_shared")`.

---

## 17. 7-Day Ruthless Build — Minimal Lovable + Shareable

**Team: 1 full-stack + 1 GTM. No billing complexity in week 1.**

| Day | Owner | Deliverable | Verification |
|---|---|---|---|
| **1** | FE | `app/ai-check/page.tsx` empty → polished input + disambiguation + skeleton + `POST /ai/visibility-check` wire (fallback scores work without engine keys). `scripts/export-db.js` MODEL_ORDER stub. | `curl /api/ai/visibility-check` returns deterministic score for Mumbai dental stub |
| **2** | BE | `AI_QUERIES[Industry]` 6 industries (60 templates) + generator `city` slot + `near me` variant. Competitor stub via `google-places` mock (3 hardcoded if quota). | `/api/ai/visibility-check/competitors/:id` returns 3 rivals cached |
| **3** | BE | Engine adapters (Gemini + ChatGPT minimal 10 calls per check, 5 queries×2) with dedup 24h + evidence cache. Failure → fallback banner. | Live poll `EngineMatrix` shows ✓/— per query in <12s |
| **4** | BE | `AiVisibilityCheck` Prisma model + migration + `CustomerTruthMap` snapshotting from `generateInsights` + **AI–Reality Alignment** table + Gap calc. | `GET /visibility-check/:businessId` returns `score, subScores, gap, alignmentTable` exactly as §5 |
| **5** | FE | Fixes generator: 5 actions reusing `callGemini` + `buildFallback*` (FAQ/service/description). Copy + “Mark applied → ReviewTask”. | Fix panel writes file + draws `FAQPage` json-ld preview |
| **6** | FE | Shareable `app/c/[shareSlug]/page.tsx` beautiful card + `og:image` + WhatsApp/LinkedIn/copy + `noindex` + **example demo /c/demo** static. | Lighthouse og preview 1200×630, LinkedIn post screenshot test |
| **7** | GTM | Distribution: submit to Product Hunt / Indie Hackers, cold agency outreach with `8/10 vs 3/10` screenshot, `Pricing` add-on toggle `Track weekly — ₹299`, in-app banner `dashboard/page.tsx` → `See your AI visibility`. | First 50 real businesses scanned, share rate >12%, ≥2 agency inbound |

**Ship gate:** Free scan <20s, no account, report passes `mobile friendly + HSTS + og:image` check, fallback score never blocks.

---

## 18. Edge Cases & Failure Modes (complete workflow)

| Case | Detection | Handling |
|---|---|---|
| Business not found / ambiguous (multiple “Shreeji Restaurant” in city) | Places Text Search ≥2 above 60% score | Return disambiguation sheet (photos+address) to pick; never hallucinate |
| No Google PlaceID / not on Maps | `googlePlaceId == null` + `website` empty | Score capped 45 (consistency low), call-to-action `Claim GBP + add one-page site` (own site #1 cited) |
| 0 reviews / stale (>90d) | `totalReviews 0` or `trend 30d avg 0` | `Customer Reputation —` , `Freshness 12`, checklist to 10 last 30d |
| Generic business name collisions | Slug dedup `check-duplicate` 409 | UUID shareSlug, keep `Business.slug` unique, competitor JSON not Business rows |
| Engine hallucination (venue closed 93× in Norly) | `place_id` resolve fails on `Place Details` | Mark `Staleness` flag, don’t award rank, warn `Permanently closed listing still appears in AI — claim` |
| Low overlap reruns (22–45% same-day Norly) | Daily sample | Show `Last checked` + `Refresh` 6h debounce, don’t show ranking as deterministic |
| Rate limit / Gemini down / quota | `callGemini` throws | `buildFallback*` deterministic score + amber banner, credits not consumed |
| Content end — AI says “cheap” but customers don’t | Alignment Mismatch | Surface as *not* wrong AI, but **missing signal** — suggest price section removal + value framing |
| Robots.txt blocks AI crawlers (73% per Otterly 2026) | Website fetch 403/head contains `noai` directive | Recommend `Allow` for `GPTBot/Google-Extended` + structured sitemap |
| RBI localization | `DATABASE_URL` region check in `env.ts` | Block prod start if not `ap-south-1`; never log `razorpayPaymentId` raw payload (compliant already) |
| Abuse / scrape via free checks | `aiBurstLimiter 3/10s` + turnstile on public `/ai-check` + `AiRequestLog` IP+business | Soft captcha, not auth — free stays free but throttled |
| Multi-location chain inconsistency | 50 locations variance (Delhi vs Pune) | `v2/reputation` table + per-location subScores delta (example Pune 81 vs Delhi 42) |
| Agency white-label misuse | ShareSlug hit flood | Rate-limit `GET /share/:slug` 10/min, cache 60s |

---

## 19. V2 — From Diagnostic to AI Customer Discovery OS (10 modules)

| # | Module (not “tool”) | What it eventually tells company | Data behind |
|---|---|---|---|
| 1 | Review collection | Same QR flow — add after-check CTA `Ask customers what AI missed` (structured Q for gap attr) | `Feedback.selectedSubOptions` |
| 2 | Review intelligence | Existing `insights` + topic evolution | `generateInsights` |
| 3 | Customer truth | **Customer Truth Map** weekly delta (waiting time −21%) | 3,000 utterances clustered |
| 4 | AI visibility | **Engine Matrix 8×5 live** + 24h cache + history spark | Pollers (§8) |
| 5 | AI reputation gap | **Gap + Alignment** signature | §5 formula |
| 6 | Competitor intelligence | 3 rivals `citation share × own-site structuredness` | Places + site crawl |
| 7 | AI content recommendations | **FAQ/service/description/questions/structured content** generated + diff preview | Gemini + schema.org |
| 8 | Reputation monitoring | Weekly `score` sparkline + alert `Vegetarian association dropped 62→18` | Trend table |
| 9 | Agency reports | 20-client **AI Reputation Report** branded PDF (Satori) | shareSlug bulk export |
| 10 | Multi-location intelligence | `Mumbai 4.7/71/89 vs Delhi 4.4/42/72` correlation to GBP completeness + review topics | `Business` per-location join |

**Closed loop (why moat compounds):** `feedback → intelligence → gap → content fix → re-scan → new feedback → model learns` — AEO tools have no input, review tools have no output.

**UCP forward:** When food/retail UCP goes live, menu/service fixes already structured (price/availability/allergen) auto-publish to Merchant Center `ucp_integration_interest` waitlist.

---

## 20. Risks & How to Measure Success

| Risk | Mitigation | Metric (weekly) |
|---|---|---|
| Over-promising “ranking” | Composite + per-engine visible, dated model version, variance disclosure (`rerun overlap 22–45%`) | `trust_score = completed checks with evidence drawer opened` |
| Engine pricing/keys volatile | Fallback deterministic never blocks; sample 5×2 not full 8×5 on free | `fallback_rate <35%` else cap free |
| Google Places quota burst | Debounce 1 search per wizard + 24h competitor cache (`google-places.ts` proxy) | `places_cost_per_check <₹2` |
| Credit accounting edge | Reuse `consumeCredits FEFO` + `checkCreditLimit` — do not inline new math | `credit_discrepancy 0` |
| SEO cannibalization | New path `/ai-check` + `/c/* noindex` — existing `/` 9 JSON-LD untouched | `organic cannibalization Δ <5%` |

**PPM for next week:** `free checks × share rate × agency sign-up × paid conversion`. North star for week 1: **Share rate** (report beautiful → 12% WhatsApp shares → agency loop).

---

## 21. Immediate Next Steps — What to Approve

1. **Approve `AI_QUERIES` industry list & query count open-source?** (Start 6 locals: DENTAL/SALON/RESTAURANT/MEDICAL/HOME_SERVICES/GYM — later E-COMMERCE add-on separate package per your “not only ecommerce” pivot)
2. **Approve scoring weights:** `35/20/15/15/15` + gap = customerReputation − aiDiscoverability. Light to tune but locks fallback.
3. **Approve free-tier throttle:** `5 queries × 2 engines = 10 calls` free; full `8×5=40` paid. Limits Gemini/ChatGPT quota burn to <₹6 per free check.
4. **Approve Prisma order:** add `AiVisibilityCheck` as isolated Json model (no FK to plans) vs normalized competitors — recommended **Json for V1** (ships day 4; normalize later).
5. **Approve `env.ts` India check guard** before any prod write of third-party snippets.

Once approved, implementation proceeds in `plan/build` mode with the 7-day day-by-day PRs (Day 1 branch already stubbed above, verification commands listed).

---

## Appendix — File Map for Builder

**Touch (isolated — landing excluded):**
- `server/prisma/schema.prisma` + `migrations/20260901000000_*`
- `server/src/utils/gemini.ts` (extend `generateInsights`-style with visibility prompt)
- `server/src/routes/ai.ts` (+ visibility endpoints reusing `callGemini`, `consumeCredits`)
- `server/src/integrations/ai-visibility/` (new dir: `types.ts`, `query-generator.ts`, `engines/*.ts`, `scorer.ts`, `gap.ts`)
- `server/src/config/env.ts` (India guard)
- `scripts/export-db.js` / `import-db.js` `MODEL_ORDER`
- `client/app/ai-check/page.tsx` + `client/app/c/[shareSlug]/page.tsx` + `client/app/dashboard/reputation/page.tsx` (+ `client/app/dashboard/reputation/history/page.tsx` if needed)
- `client/components/ai/*` (8 components above)
- `client/components/dashboard/dashboard-sidebar.tsx` (add `AI Reputation` item) + `client/app/dashboard/page.tsx` (add Overview card — **not** `app/page.tsx`)
- `client/lib/api.ts` (add `aiVisibility.*` typed wrappers)
- `client/app/sitemap.ts` (generate `/c/* noindex` exclusion only — no `/ai-check` marketing entry)

**Explicitly NOT touched:**
- `client/app/page.tsx` (hero, 9 JSON-LD, SEO/AEO) — **zero edits**
- `client/components/marketing/*` — untouched

**Leave untouched:** `client/components/dashboard/qr-generator.tsx`, `feedback-flow.tsx`, `payments.ts` (except credit mapping), all `AGENTS.md` compliance surfaces.

> **A note on limits:** This spec does not pretend BeyondVyu is enterprise AI infra. V1 is honest sampling (10 calls) + deterministic completeness proxy — enough to be useful and shareable, upgrade monetizes live polling + history.

