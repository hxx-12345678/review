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
