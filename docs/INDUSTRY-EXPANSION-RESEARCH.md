# Industry Expansion — Research, Design, and Verification

Status: implemented and verified on `main` (working tree). This document records
the evidence behind the profile taxonomy, what is deliberately **not** claimed,
and exactly what was tested against live Google APIs.

## 1. Why this exists

The original product was a restaurant-first feedback loop. The goal of this
expansion is **additive**: keep the restaurant experience byte-for-byte
equivalent, while giving other business types questions that match the work they
actually do. A repair shop must not receive a new-car-sales flow, a café must not
receive the full restaurant flow, and a hotel must not receive restaurant
questions.

Two rules constrain every decision:

1. **The owner confirms the business type.** Google data is evidence for a
   suggestion, never an irreversible fact. The owner can correct it in onboarding
   and later in dashboard settings; an admin can also correct it.
2. **No review manipulation.** Every customer gets the same neutral path to
   Google. There are no incentives, review gating, selective positive routing,
   staff quotas, leaderboards, prewritten claims, or staff-name solicitation.

## 2. Business-type inference

Implemented in `server/src/utils/business-type-inference.ts`, surfaced through
`GET /api/google-places/classify?placeId=...`, and consumed by the onboarding
wizard.

Evidence order:

1. Google Places `primaryType` (for example `coffee_shop`, `hotel`,
   `car_repair`).
2. Every entry in the Place `types` array.
3. Business-name signals when the Google type is generic (`store`, `service`,
   `point_of_interest`, `establishment`) or when it is ambiguous
   (`hardware_store`, `electronics_store`).
4. A safe fallback to `OTHER`.

The response includes `industry`, `label`, `confidence`, `evidence`,
`primaryType`, raw `types`, and `defaultCategoryIds`. Confidence is reduced when
only a generic type or only a name signal is available.

Generic Google types never override a concrete name signal. Examples:

- `hardware_store` + name "Sharma Electricals" → `ELECTRICAL_RETAIL`
- `hardware_store` + name "Sharma Hardware" → `RETAIL`
- `electronics_store` + name "Mobile Repair Hub" → `ELECTRONICS_REPAIR`
- `electronics_store` + name "Croma Electronics" → `ELECTRONICS`
- `car_repair` → `AUTO`; `car_dealer` → `AUTO_DEALER`

Google has no dedicated electronics-repair Place type. Repair inference
therefore depends on name evidence such as "Mobile Repair", "Laptop Service
Centre", or "Phone Repair", with `electronics_store` or a generic type as the
supporting signal.

## 3. Profile matrix

Top-level categories are shown below. Sub-options are the actual tap targets in
step 2. Restaurant defaults preserve the previously shipped restaurant flow.

| Profile | Default categories | Example industry-specific questions |
| --- | --- | --- |
| `RESTAURANT` | food, service, ambience, value, operations (drinks/bar opt-in) | Taste, freshness, portion size; service speed; noise/lighting; wait time; order accuracy |
| `CAFE` | beverages, food, service, space, value | Coffee/tea quality, milk alternatives, pastry freshness, seating/Wi-Fi, speed |
| `BAKERY` | products, service, hygiene, value | Freshness, custom-cake accuracy, packaging, display hygiene |
| `QUICK_SERVICE` | food, speed, accuracy, packaging, cleanliness, value | Order accuracy, wait time, spill-proof packaging, condiments |
| `HOTEL` | booking, room, staff, facilities, value | Room/bathroom cleanliness, check-in, AC/Wi-Fi, noise, breakfast, extra charges |
| `DENTAL` | treatment, staff, facility, scheduling, communication, value | Pain management, explanation of treatment, sterilisation, wait time, insurance |
| `MEDICAL` | provider, staff, facility, access, communication, value | Bedside manner, wait time, appointment access, explanation, billing clarity |
| `SALON` | service_quality, stylist, atmosphere, scheduling, value | Haircut/colour result, consultation, hygiene, booking, product pressure |
| `FITNESS` | equipment, classes, cleanliness, staff, atmosphere, value | Equipment condition, trainer attention, class crowding, changing-room cleanliness |
| `AUTO` | work_quality, staff, communication, timeliness, pricing, facility | Repair quality, quote vs final bill, diagnostics, repeat repair, loaner/waiting area |
| `AUTO_DEALER` | sales, selection, pricing, process, service | Test drive, sales pressure, variant availability, EMI/finance clarity, delivery, trade-in |
| `ELECTRONICS` | products, staff, repair, pricing, after_sales | Product authenticity, stock, demo/guidance, returns, warranty |
| `ELECTRONICS_REPAIR` | repair, quote, turnaround, data, warranty, service | Repair quality, repeat fault, data privacy, genuine parts, quote accuracy |
| `ELECTRICAL` | work, safety, reliability, pricing, cleanliness, warranty | Earthing, safety, certification, job completion, cleanup, quote accuracy |
| `ELECTRICAL_RETAIL` | products, advice, pricing, service, returns | ISI/authenticity, stock, load advice, bulk pricing, warranty/returns |
| `HOME_SERVICES` | work_quality, staff, communication, timeliness, pricing, cleanliness | Workmanship, punctuality, damage/cleanup, scope clarity, follow-up |
| `RETAIL` | products, store, staff, checkout, after_sales, value | Range, stock, staff help, checkout speed, exchange/return |
| `EDUCATION` | teaching, communication, safety, facilities, activities, admin | Teaching quality, parent communication, safety, facilities, admin responsiveness |
| `PET_CARE` | care, communication, facility, access, value | Handling, vet explanation, wait time, cleanliness, emergency access |
| `REAL_ESTATE` | service, expertise, process, outcome, value | Responsiveness, market knowledge, paperwork, negotiation, possession |
| `PROFESSIONAL_SERVICES` | expertise, communication, delivery, relationship, value | Expertise, responsiveness, clarity of scope, deadlines, billing |
| `OTHER` | staff, quality, experience, value, communication, convenience | Generic quality, service, value, communication |

Industry-aware comma-separated custom-topic placeholders are provided by
`getCustomTopicExampleForIndustry` (client) and the mirrored server taxonomy.
The old generic "Jain options" placeholder was replaced with examples that fit
the selected profile.

### Restaurant preservation

- `RESTAURANT` is still the default profile for legacy rows and the create/update
  API when no industry is supplied.
- Restaurant category IDs, labels, option IDs, task categories, and output labels
  are unchanged.
- The `food_quality` task label remains exactly `"Food quality"` so existing
  reports and tests stay stable.
- Drinks/bar categories remain opt-in and default-hidden. Alcohol words inside
  dish names do not enable them.
- The restaurant classification branch is checked before new profile rules.

## 4. Google Reviews: verified behavior

Two independent paths exist in `server/src/services/google-business-api.ts` and
`server/src/routes/google-reviews.ts`.

### Method 1 — Business Profile OAuth (full review history)

- OAuth URL generation is correct locally: it includes
  `https://www.googleapis.com/auth/business.manage`, a signed `state`, and the
  configured redirect URI.
- Review listing uses the documented
  `GET /v4/accounts/{accountId}/locations/{locationId}/reviews` endpoint with
  pagination and `orderBy=createTime desc`.
- This path needs a real owner Google account, a verified Business Profile
  location, and an approved Google Business Profile API project. Those are
  external approvals and cannot be completed by a local test.
- Do not describe this path as "connected" when the account is only a Places API
  stub (`googleAccountId` starting with `places-`). The status endpoint already
  distinguishes `connected` from `oauthConnected`.

### Method 2 — Places API import (up to five public reviews)

Live verification on the configured `GOOGLE_PLACES_API_KEY`:

- Text Search and Place Details return HTTP 200.
- The key returns real `displayName`, `rating`, `userRatingCount`, `primaryType`,
  and `types`.
- The response **omits the `reviews` field entirely**, even with
  `X-Goog-FieldMask: *`, for every listing tested (Googleplex, Google Sydney,
  Taj Mahal Palace, Lemon Tree, Blue Tokai).
- Example: Blue Tokai returned `rating: 4.4`, `userRatingCount: 1484`,
  `reviewsFieldReturned: false`, and `synced: 0`.
- The legacy Places API is not enabled for the project (`REQUEST_DENIED`), so it
  cannot be used as a fallback.
- Official Places API (New) documentation still lists `reviews` as a supported
  field. The observed behavior therefore points to project/API entitlement,
  billing, or review-content access rather than a field-mask bug.

What the product does now:

- The sync response includes `source`, `rating`, `userRatingCount`,
  `reviewsFieldReturned`, and an explicit `warning` when Google returned a rating
  count but no review text.
- The settings UI reports that honestly: "Google returned your listing's rating
  and review count, but no review text. Try again later, or connect your Google
  Business Profile above for full review history."
- It no longer implies the business has no public reviews or blames "quieter
  profiles".
- Places review IDs are derived from reviewer + publish time, so repeated syncs
  update instead of duplicating when Google changes the order of its five
  returned reviews.

### What must be fixed outside this repo

To make Method 2 return text, the Google Cloud project that owns the key needs
review-content access: billing enabled, Places API (New) enabled, and any
applicable review-content entitlement/allowlisting approved. If Google still
omits review text after that, Method 1 is the supported full-history path.

## 5. Voice feedback

Verified behavior:

- Language mapping: `en-US`, `en-IN`, `es-US`, `hi-IN`, `gu-IN`, `mr-IN`.
- Continuous interim transcripts are appended without duplicating finalized
  sentences.
- The review draft is not auto-regenerated while the guest is dictating.
- Permission, network, and missing-microphone errors are explicit.
- Mobile sessions that end after a pause now restart automatically while the
  guest still has the microphone active, without repeating the "Listening"
  toast.
- A stale aborted session cannot restart on top of a newer session.
- Voice remains an input method only: the guest's own words are the source, and
  AI is limited to grammar/translation/summarisation.

Limitations that remain browser-owned:

- The Web Speech API decides accuracy. It has no custom vocabulary or accent
  tuning.
- "Hinglish"/"Gujlish" are mapped to `hi-IN`/`gu-IN`; some browsers return
  Devanagari/Gujarati script rather than Roman transliteration.
- Safari/iOS support depends on the OS version and installed speech services.

## 6. Owner notifications: what they do and what else they are good for

Current behavior:

- Every submitted feedback item sends an owner email with rating, comment,
  customer name (if given), and visit context.
- A rating of 2 or below, or a safety issue, also attempts an urgent WhatsApp
  alert to the business phone.
- Weekly/period owner digests summarise trends and unresolved tasks.
- Review-request email and SMS paths exist for multi-platform outreach.
- Google Pub/Sub review events sync the review and alert the owner with the
  **actual** newest review rating (previously this incorrectly sent a 0-star
  alert).

Policy-safe value beyond "send the owner a report":

1. **Safety and low-rating escalation** — email + WhatsApp template, with the
   task due in 2 hours for safety and 24 hours for other negatives.
2. **Unresolved-task nudges** — remind the owner about tasks approaching or past
   SLA, not just a weekly summary.
3. **Recovery confirmation** — ask the owner to record a resolution note, then
   close the loop with the customer where contact details exist.
4. **Recurrence escalation** — the third occurrence of the same `issueKey` is
   escalated, while 4–5★ suggestions never escalate an existing complaint.
5. **Digest with "what changed"** — new issues, resolved issues, repeat issues,
   and response-time trend, not only star averages.
6. **Review-request delivery** — send the neutral review link after a genuine
   visit, from the customer's own device, with no incentive and no positive-only
   routing.

WhatsApp implementation rule: owner alerts require the business's own connected
WhatsApp account, an approved Utility template, and an owner opt-in record.
There is no global owner-alert template variable; each business selects an
approved template after connecting its own number. Free-form text is only valid
inside a 24-hour customer-service window, so owner alerts fail closed instead of
sending a policy violation. The email path remains independent and works without
WhatsApp. See `docs/WHATSAPP-AUTOMATION.md` for the multi-tenant model and the
separate Meta-versus-BEYONDVYU billing rules.

## 7. Honesty rules applied

- Removed unverified "Localo" retention numbers and the invented "2–5/week safe
  ceiling". Google publishes no numeric safe review rate; the UI now reports the
  observed pace and recommends steady, genuine invitations.
- Removed "common for quieter profiles" when Google omits review text. The
  limitation is stated as a Google/API limitation.
- No fake testimonials, ratings, metrics, or customer claims on the landing page.
  Sample review content is labelled as an illustrative product preview.
- No live pricing changes in this work.

## 8. Verification performed

- Server unit suites: billing, review options, business-type inference, task
  classification, issue report, recurrence, owner digest.
- Client taxonomy and review-localization tests.
- Server and client `tsc --noEmit`.
- Next.js production build.
- Live restaurant end-to-end suite (positive, silent negative, actionable
  suggestion, safety escalation, duplicate retry, cross-tenant isolation).
- Live industry end-to-end suite for café, hotel, electronics repair,
  electrician, and retail: business creation, public payload, task creation, and
  category separation.
- Live Google Places classification: Blue Tokai → `CAFE` (`coffee_shop`), hotel
  Place ID → `HOTEL` (`hotel`).
- Live Places review sync: HTTP 200 with explicit no-review-text warning and
  stable diagnostics.
- Live OAuth URL generation: `business.manage` scope, state, and redirect present.
- Voice simulation suite: 17/17 assertions across language mapping, transcript
  stitching, and error messages.

## 9. Sources reviewed

Platform and policy:

- Google Places API (New) — Place Details:
  <https://developers.google.com/maps/documentation/places/web-service/place-details>
- Google Places API (New) — Place types:
  <https://developers.google.com/maps/documentation/places/web-service/place-types>
- Google Business Profile — Work with review data:
  <https://developers.google.com/my-business/content/review-data>
- Google Business Profile — Prerequisites:
  <https://developers.google.com/my-business/content/prereqs>
- Google Business Profile — Prohibited and restricted content:
  <https://support.google.com/business/answer/7400114>
- Google Business Profile — Fake engagement restrictions:
  <https://support.google.com/business/answer/14114287>
- Google Business Profile — Tips for getting reviews:
  <https://support.google.com/business/answer/3474122>
- Meta WhatsApp — Template categorization:
  <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization>
- Meta WhatsApp — Customer service window / message types:
  <https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages>

Vertical question themes were derived from publicly visible review categories
and service expectations for each sector, then reduced to questions an owner can
act on operationally. They are not presented as regulatory requirements or as
claims about every business in a sector. Regulated domains (medical, dental,
education, real estate, financial/professional advice) deliberately ask about
communication, access, safety, and process — not clinical or legal outcomes.
