# Restaurant GTM Strategy — Code Verification (10 Nov 2026)

This document checks the restaurant-first GTM research against the actual
repository. It is deliberately blunt: a feature is only "done" when the code
path, the owner/guest surface and an automated check exist.

## 1. The central thesis

> The product is not "more Google reviews". It is the loop:
> **guest feedback → recurring problem → manager action → recorded resolution →
> measured improvement.**

That loop is implemented end to end:

| Loop stage | Code path | Evidence |
| --- | --- | --- |
| Capture | `client/components/feedback/feedback-flow.tsx`, `POST /api/feedback/submit` | QR/link flow, English/Gujarati/Hindi, table/bill/packaging touchpoints |
| Categorise | `server/src/utils/task-classification.ts` | Deterministic food/service/speed/cleanliness/ordering/value/drinks buckets |
| Identify recurrence | `server/src/routes/feedback.ts` | Open issues merge by `issueKey`; third report escalates |
| Assign | `client/components/v2/tasks/review-tasks.tsx`, `PATCH /api/v2/tasks/tasks/:id` | Priority, due date, assignee, status |
| Resolve | same route | Classified issues cannot be closed without `resolutionNotes` |
| Measure improvement | `server/src/utils/issue-report.ts`, `GET /api/v2/tasks/report/:businessId` | Resolution rate, average time, recurring issues, recent resolutions |
| Measure whether the fix held | `ReviewTask.recurredAfterResolution` + `previousTaskId` | A repeat after a resolved task is flagged, counted and surfaced to the owner |

The last row is the strategy's "critical addition" and was added in this pass.

## 2. Release 1 module verification

| Release 1 requirement | Status | Where / why |
| --- | --- | --- |
| Business setup: outlet, manager and owner accounts | **Partial** | Outlets are separate `Business` rows under one owner with a switcher. There is no `BusinessMember`/RBAC model, so a manager cannot log in with limited access. This is the largest remaining P0 gap. |
| Touchpoints: table, billing, packaging QR | **Done** | `QrCode.touchpoint`, `QrCode.label`, `server/src/routes/qr.ts`, `client/components/dashboard/qr-generator.tsx` |
| Guest experience in Gujarati/Hindi/English | **Done** | `client/components/feedback/feedback-flow.tsx`, `client/lib/review-localization.ts` + tests |
| Configurable food/service categories | **Done** | `server/src/utils/review-options.ts`, `client/lib/industry-categories.ts`, bar opt-in rules |
| Multilingual themes and sentiment | **Done (AI, metered)** | `server/src/routes/ai.ts`, AI insights page; deterministic classification still works with zero AI credits |
| Feedback inbox: search, filters, outlet and touchpoint | **Done in this pass** | New `/dashboard/inbox` page + `client/components/dashboard/feedback-inbox.tsx`; API supports `search`, `minRating`, `maxRating`, `touchpoint`, pagination |
| Issue management: assignment, priority, resolution | **Done** | `server/src/features/review-tasks/review-tasks.routes.ts`, `/v2/tasks` |
| Owner reporting: trends, recurring complaints, resolved issues | **Done** | `client/components/dashboard/issue-resolution-report.tsx` with 7/30/90-day windows and post-resolution recurrence banner |
| Reputation: Google review link and permitted monitoring | **Done** | Google review link in flow; GBP sync + Pub/Sub webhook in `server/src/routes/google-reviews.ts` |
| Notifications: manager and owner alerts | **Partial** | Owner gets email for feedback, WhatsApp for ≤2★ / critical safety, and a one-time WhatsApp escalation when a recurring issue crosses the third report. The owner can also email the 7-day/30-day/90-day summary (`POST /api/v2/tasks/digest/:businessId`) and `npm run digest:send` exists for a weekly cron. No manager recipient model yet. |

## 3. WhatsApp, loyalty and POS decisions

| Strategy recommendation | Code state |
| --- | --- |
| Owner/manager notifications first | Owner alert exists. Escalation alert added. Manager routing blocked on team accounts. |
| Guest automated review requests later, with consent | **Not built** — correct for Release 1. No opt-in or template flow for outbound guest messaging. |
| Unlimited WhatsApp marketing package | **Not built** — correct. India marketing messages are ~₹0.86 each before tax/BSP fees. |
| Repeat-visit intelligence before points loyalty | **Not built** — correct for Release 1. No points/rewards liability. |
| Do not build POS or loyalty | **Not built** — correct. |
| POS integration is P1 | **Not built** — remains a later integration layer, not a POS. |

## 4. Trust and compliance controls

| Strategy control | Code state |
| --- | --- |
| Same Google review opportunity for every genuine customer | **Done** — every rating reaches the review step; no rating gate. |
| No incentives, review-linked discounts, staff quotas or leaderboards | **Done** — no such code exists; marketing copy states the policy. |
| No staff-name solicitation | **Done** — option/QR parameters are placement labels, staff params are clamped and not echoed as a request. |
| Bar options opt-in / default hidden | **Done** — `server/src/utils/review-options.ts` + tests, including "alcohol word inside a dish is not a bar programme". |
| Resolution notes before closure | **Done** — server rejects `status: done` without notes for classified issues. |
| 4–5★ suggestions do not inflate/escalate complaints | **Done** — recurrence merge is limited to `rating <= 3` or critical safety. |
| Data deletion | **Done** — business deletion removes feedback, tasks, QRs, reviews and connections. |
| Data export | **Done in this pass** — `GET /api/businesses/:id/export` JSON download; settings has a download action. Excludes OAuth tokens, sessions and AI logs. |
| Role-based access | **Gap** — no membership/role model yet. |
| Documented third-party AI processing | **Partial** — privacy page/consent exists; per-provider processing documentation should be reviewed before enterprise sales. |
| India-region production database | **Guard exists, not proven** — `server/src/config/env.ts` logs a fatal warning unless `DATA_REGION_CONFIRMED=india` or the URL contains an India region token. Ops must confirm the actual Render region. |

## 5. Security fixes in this pass

- Google Business Profile OAuth `state` is now a signed, 10-minute JWT bound to
  `businessId` + `userId`; the callback verifies the signature and re-checks
  ownership before touching a business. A raw `businessId` in `state` could be
  forged to attach an attacker's Google account to another tenant.
- All committed scripts now require `TEST_EMAIL` / `TEST_PASSWORD`; the old
  hardcoded dev credential was removed from `scripts/test-e2e.js` as well.
- The leaked credential still exists in git history and must be rotated. Do not
  treat removal from the working tree as remediation.

## 6. What the strategy gets right (and what it overstates)

**Right, and now backed by code**

- A review QR alone cannot justify a subscription; the issue loop is the
  defensible product.
- Restaurants with good ratings still have unresolved operational problems.
- Waiting time / speed is a high-value restaurant signal; `speed` is a first-class
  issue bucket and appears in recurrence reporting.
- The product must not replace the POS. It runs beside billing and only needs
  placement QR/link data.
- Owner reporting must show whether fixes held, not just sentiment charts.
- WhatsApp should start as an owner/manager notification channel, not a bulk
  marketing engine.
- Loyalty is a later integration, not a Release 1 build.

**Overstated / unproven**

- There is no public evidence that Vadodara independents will pay ₹599/month.
  The repo should not change live pricing before the 15-owner / 8-design-partner
  experiment.
- The WOW! Momo WhatsApp result does not transfer to a single independent
  restaurant; it depends on transaction volume, opt-in audience and direct
  ordering.
- The 207-listing rating analysis is directory data, not a census, and should
  not be used as a market-size claim.
- The 15% revenue uplift from removing waiting is a simulation in one operating
  scenario, not a product promise.

## 7. Remaining engineering order

1. **Manager accounts / RBAC** — `BusinessMember(businessId, userId, role)`,
   owner/manager invitations, and a shared `assertBusinessAccess()` helper.
   This is required before selling "separate manager access" or multi-outlet
   packages. It touches ~99 ownership checks, so do it as its own migration.
2. **Scheduled owner digest** — the content and sender now exist
   (`server/src/scripts/send-owner-digests.ts`). Add the Render cron job and
   confirm SMTP before enabling it in production.
3. **Multi-outlet consolidated view** — group businesses by owner/group and
   aggregate recurring issues and resolution rates across outlets.
4. **POS/CSV/webhook integration layer** — import transactions/outlet context;
   do not build a POS.
5. **Pub/Sub authenticity** — verify Google Pub/Sub push tokens before syncing.
6. **India DB confirmation** — set `DATA_REGION_CONFIRMED=india` only after
   checking the managed database region.

## 8. Verification commands

```bash
# Server unit tests (includes issue-report + recurrence policy)
cd server && npm test

# Type checks
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit

# Production build
cd client && npm run build

# Live loop verification (server on :4000)
cd server && node ../scripts/test-issue-report-e2e.js

# Weekly owner digest (dry run prints the email body)
cd server && DIGEST_DRY_RUN=1 npm run digest:send
```

The live test creates a synthetic tenant, verifies classification, recurrence
merge/escalation, resolution-note enforcement, post-resolution recurrence,
feedback-inbox filters, data export and tenant isolation, then deletes the
synthetic tenant.
