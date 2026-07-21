# AGENTS.md — BEYONDVYU Compliance & Ops Notes

## RBI Compliance

### E-Mandate Framework 2026 (RBI/2026-27/396)
- ✔ First payment AFA handled by Razorpay (OTP via issuer)
- ✔ Both plans under ₹15,000 — no AFA on recurring charges
- ✔ 24h pre-debit notification handled by issuer (Razorpay triggers)
- ✔ Disclosure on billing page: e-mandate registration, opt-out, validity, no-charge, grievance
- ✔ Contact page, Refund page, Terms page visible in footer

### Card Tokenization (CoFT)
- ✔ No raw PAN/CVV/expiry stored anywhere in our DB or logs
- ✔ Card data entered on Razorpay's hosted page (redirect, not iframe)
- ✔ Token lifecycle managed by Razorpay

### Data Localization (RBI April 2018 circular)
- ⚠ Development: PostgreSQL on localhost — no issue
- ⚠ **Production must use India-region DB** (AWS ap-south-1 / Mumbai, Azure Central India, or similar)
- Payment data stored in our DB includes: `Subscription.razorpaySubscriptionId`, `Subscription.razorpayCustomerId`, `Invoice.razorpayPaymentId`, `Invoice.amount`, `Invoice.currency`, `Invoice.status`, `Invoice.createdAt`
- Even though Razorpay IDs are opaque tokens, the RBI FAQ says "end-to-end transaction details" must stay in India
- Use `env.ts` to enforce India-region check on DB connection string in production
- Server logs must never log raw payment payload — verified clean (only metadata errors logged)

## PCI DSS v4.0.1

### Script Security (Req 6.4.3 & 11.6.1)
- We use redirect-based checkout (Razorpay hosted page) — SAQ A eligible, but CSP still enforced
- Script inventory (billing page): lucide-react, next/navigation, @/components/ui/*, @/lib/api, @/lib/auth-context, @/lib/utils
- CSP headers configured with report-only enforcement via helmet
- frame-src allows api.razorpay.com and *.razorpay.com for potential iframe fallback
- form-action allows razorpay.com for redirect-based payments

## Infrastructure

### Render PostgreSQL Migration

Two script pairs in `scripts/` for moving between PostgreSQL instances. Choose based on available tools.

#### Option A: Node.js + Prisma (recommended, zero external deps)

- **`scripts/export-db.js`** — Reads all data via Prisma into portable JSON
  ```bash
  cd server && node ../scripts/export-db.js "postgresql://user:pass@host:5432/db"
  ```
  - No external tools needed (uses `@prisma/client` already in project)
  - Output: `reviewos-backup-YYYY-MM-DD.json`
- **`scripts/import-db.js`** — Restores JSON into target DB via Prisma migrations
  ```bash
  cd server && node ../scripts/import-db.js ../reviewos-backup-2026-07-20.json "postgresql://user:pass@host:5432/newdb"
  ```
  - Drops existing schema, applies all Prisma migrations, inserts data in FK-safe order
  - Outputs verification table with row counts

#### Option B: pg_dump/pg_restore (advanced, needs PostgreSQL client tools)

- **`scripts/export-db.sh`** — Exports via `pg_dump -Fc --no-owner --no-acl`
  - Output: `reviewos-backup-YYYYMMDD.dump` (compressed custom format)
- **`scripts/import-db.sh`** — Restores via `pg_restore -j 4`
  - Drops existing `public` schema first, parallel restore, row count verification
- Requires: `pg_dump`, `pg_restore`, `psql`, `pg_isready`

#### Workflow (both options):
1. Run export pointing at old DB → get dump/JSON file
2. Transfer file to machine that can reach new DB
3. Run import with dump/JSON + new DB URL → restores all data
4. Update `DATABASE_URL` env var on Render, restart services
5. Verify app works, delete old DB

## Testing

### Payment flow test
```bash
# Start server
cd server && npx tsx src/index.ts

# Test plans endpoint (no auth required)
curl http://localhost:4000/api/payments/plans

# Test subscription creation (requires auth token)
TOKEN="<login-token>"
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"planId":"<starter-plan-id>"}' \
  http://localhost:4000/api/payments/create-subscription

# Test cancel (requires auth token)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/payments/cancel

# Test callback with invalid signature (should return error)
curl "http://localhost:4000/api/payments/subscription-callback?razorpay_payment_id=pay_test&razorpay_subscription_id=sub_test&razorpay_signature=invalid"

# Test webhook (requires valid signature)
curl -X POST -H "Content-Type: application/json" \
  -H "x-razorpay-signature: <hmac>" \
  -d '{"event":"subscription.charged","payload":{"subscription":{"entity":{"id":"sub_test"}},"payment":{"entity":{"id":"pay_test","amount":49900,"currency":"INR","status":"captured"}}}}' \
  http://localhost:4000/api/payments/webhook
```
