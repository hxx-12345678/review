# WhatsApp automation — architecture, policy, and setup

Last verified: **18 November 2026**

This document records the official Meta rules used to design the multi-tenant
WhatsApp feature, what the code now does, and the exact setup still required
outside this repository.

## 1. Ownership and billing model

The old implementation used one global `WHATSAPP_PHONE_NUMBER_ID` and
`WHATSAPP_API_TOKEN`. That cannot work for multiple client businesses: every
message would come from BEYONDVYU's number, customers could not tell which
business was messaging them, and the wrong party would be billed.

The model now is deliberately two separate bills:

| Bill | Who charges it | Where the owner pays | What it covers |
| --- | --- | --- | --- |
| Meta WhatsApp usage | Meta, on the business's own Messaging account | Meta Billing Hub / WhatsApp Manager | Delivered business-initiated messages (Marketing, Utility, Authentication, Service) |
| BEYONDVYU subscription | BEYONDVYU via Razorpay | BEYONDVYU billing portal | The dashboard, automation, templates, inbox, and reports |

- Each business owns its own WhatsApp Business Account / Messaging account and
  business phone number.
- The business connects through **Meta Embedded Signup v4**.
- BEYONDVYU is a **Tech Provider** with delegated access. It is not the sender
  of the business's customer messages and does not become the merchant of
  record for Meta usage.
- The business adds **its own** payment method to its own Messaging account.
- **Meta bills the business directly** for delivered business-initiated
  messages. BEYONDVYU does not collect, bundle, resell, or mark up Meta message
  fees.
- BEYONDVYU does **not** share a BEYONDVYU line of credit with the business.
  Sharing a credit line would make BEYONDVYU liable to Meta for the client's
  usage, which is not this design.

India-specific billing facts that the UI reflects:

- Meta supports **UPI prepaid billing** in India. Adding funds by UPI puts the
  account on prepaid billing.
- Saving a card puts the account on **invoiced billing**.
- The choice is made the first time the Messaging account sets up a payment
  method and **cannot be changed afterwards**; a different mode requires a new
  Messaging account.
- There is **no API to add funds or read the current balance**. The source of
  truth is Meta Billing Hub.
- India billing localization requires eligible accounts to move to INR by
  **31 December 2026**.
- Meta charges only for **delivered** business-to-user messages. User-to-business
  messages are free.
- Since **1 October 2026**, each business phone number receives **1,000 free
  delivered service messages per month**, reset monthly.

The dashboard therefore shows an **estimate** of this month's Meta spend from
delivery webhooks, labelled as an estimate, and links to Meta Billing Hub for
the real invoice. It never claims to be Meta's balance or invoice.

## 2. What the code does

### Per-business connection

`server/src/features/whatsapp/whatsapp.meta.ts`

- Exchanges the 30-second Embedded Signup `code` via
  `GET /oauth/access_token`.
- Reads the business phone number and Messaging account.
- Resolves the phone number from `GET /{WABA_ID}/phone_numbers` when
  coexistence returns only `waba_id`.
- Subscribes the Meta app with `POST /{WABA_ID}/subscribed_apps`.
- Optionally registers the number with `POST /{PHONE_NUMBER_ID}/register` and a
  6-digit PIN. The PIN is never stored.
- Skips registration for a coexistence number, because Meta has already
  registered it.
- Requests the business's existing WhatsApp Business app contacts with
  `POST /{PHONE_NUMBER_ID}/smb_app_data` (`sync_type:
  smb_app_state_sync`). Imported contacts start as `UNKNOWN` consent, never
  `OPTED_IN`.
- Lists, creates, and edits message templates.
- Sends template messages and 24-hour service-window text replies.

`server/src/features/whatsapp/whatsapp.service.ts`

- Stores the business token encrypted with AES-256-GCM
  (`TOKEN_ENCRYPTION_KEY`). Raw tokens are never logged or returned to the
  browser.
- Keeps contacts and consent scoped to one business.
- Enforces opt-in before every template send.
- Enforces approved-template status.
- Enforces separate marketing consent for Marketing templates.
- Re-checks consent and approval when a scheduled message becomes due.
- Records inbound/outbound messages and delivery pricing copied from Meta.
- Handles Meta error **131042** (payment eligibility) on both the send call and
  the status webhook, stores a clear connection alert, and pauses the owner's
  attention on Meta Billing instead of failing silently.
- Estimates the current month's Meta spend from delivered messages. The
  estimate is not used for charging and is not presented as an invoice.

### Webhook

- URL: `POST /api/v2/whatsapp/webhook`
- Verification challenge: `GET /api/v2/whatsapp/webhook`
- The POST route is registered **before** `express.json()` and uses
  `express.raw()` so the exact bytes are available.
- Every POST must include a valid `X-Hub-Signature-256` HMAC computed with
  `WHATSAPP_APP_SECRET`. Unsigned or invalid webhooks are rejected.
- Handles:
  - inbound messages
  - sent/delivered/read/failed statuses, including prepaid `131042` failures
  - delivery pricing
  - `message_template_status_update`
  - `user_preferences` marketing stop/resume
  - coexistence `account_update`, `smb_app_state_sync`, and
    `smb_message_echoes`
- Duplicate WAMIDs are ignored through the unique `metaMessageId`.

### Consent and contact capture

Every message still requires opt-in. The product gives the owner several ways to
collect it without typing numbers one by one:

1. **Public sign-up link / QR** — `/w/{business-slug}`. The customer enters their
   own number, sees the business name, and chooses service consent and optional
   marketing consent.
2. **After feedback** — the thank-you step offers an optional WhatsApp card. The
   customer can skip it; leaving a review never requires a phone number.
3. **Click-to-chat link** — `https://wa.me/<business-number>?text=...`. The
   customer starts the conversation; the inbound webhook creates the contact
   automatically. The business can reply inside the 24-hour service window.
4. **WhatsApp Business app coexistence sync** — when the owner connects an
   existing WhatsApp Business app number, Meta streams their existing contacts.
   These are stored as `UNKNOWN` consent so the owner has a ready contact book,
   but no business-initiated message is sent until the contact opts in.
5. **Inbound messages** — anyone who messages the business is added as a
   contact and their number is captured.
6. **Bulk import with attestation** — the owner can paste up to 1,000 numbers
   from their own consented customer list. The UI requires an explicit
   confirmation that the list is not purchased, scraped, or shared.

Consent rules enforced in code:

- Consent is recorded per business with an append-only audit event.
- Inbound `STOP`, `STOP ALL`, `UNSUBSCRIBE`, `OPT OUT`, `OPTOUT` set the contact
  to `OPTED_OUT`.
- Inbound `START`, `UNSTOP`, `RESUME`, `OPT IN`, `OPTIN` record a new service
  opt-in. They do **not** silently grant marketing consent.
- Meta's `user_preferences` marketing stop/resume sets a separate
  `marketingOptOut` flag, so a marketing stop does not automatically block a
  necessary Utility message.
- Scheduled sends are skipped if the customer opted out before send time.
- An owner-attested add or bulk import **cannot** re-opt-in a contact who is
  already `OPTED_OUT`. Only the customer can reverse a STOP through the public
  sign-up page, the feedback form, or by sending `START`.
- A marketing stop does not block a necessary service/Utility message, and a
  service opt-in does not imply marketing consent.

### Policy guards

- Only `APPROVED` templates can be sent.
- Review-request templates cannot contain discounts, coupons, vouchers,
  cashback, incentives, rewards, gifts, freebies, five-star wording, or
  "only if you had a good experience" wording.
- Offers must use the Marketing category.
- Review requests, payment reminders, feedback requests, and owner reports must
  use Utility and must be non-promotional.
- Utility review/feedback templates require at least one variable so the message
  is specific to a visit/order.
- Free-form text is allowed only when the last inbound message is less than
  24 hours old.
- Review requests are not gated or selectively routed by rating.

### Coexistence (keep using WhatsApp Business app on the phone)

Official Meta behaviour used here:

- Coexistence is enabled with `featureType:
  "whatsapp_business_app_onboarding"` and `sessionInfoVersion: "3"` in the
  Embedded Signup `extras`.
- The business must use WhatsApp Business app **2.24.17 or higher**.
- Meta converts the existing WhatsApp Business account into a
  backward-compatible Messaging account and keeps the same ID in `waba_id`.
- The number is already registered; the partner must **skip** the phone
  registration step.
- Messages sent from the WhatsApp Business app stay free and do not create or
  extend a Cloud API customer service window.
- Coexistence numbers have a fixed throughput of **20 messages per second**.
- The partner has **24 hours** after onboarding to synchronize contacts and
  history. This app requests contacts only; it does not request chat history.
- The app subscribes to `account_update`, `history`,
  `smb_app_state_sync`, and `smb_message_echoes`. `history` is accepted but not
  persisted; contacts and echoes are persisted.

## 3. Environment variables

Set these on the server. Never commit real values.

```env
WHATSAPP_APP_ID=""
WHATSAPP_APP_SECRET=""
WHATSAPP_ES_CONFIG_ID=""
WHATSAPP_ES_VERSION="v4"
WHATSAPP_ES_FEATURE_TYPE="whatsapp_business_app_onboarding"
WHATSAPP_API_VERSION="v25.0"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="set-a-long-random-string"
WHATSAPP_BILLING_URL="https://business.facebook.com/billing_hub/accounts/"
WHATSAPP_MANAGER_URL="https://business.facebook.com/wa/manage/home/"
WHATSAPP_CRON_SECRET=""
```

`WHATSAPP_CRON_SECRET` is optional. When the Meta app is configured, the server
also runs an in-process due-message job every minute. An external scheduler can
call `POST /api/v2/whatsapp/process-due` with `x-cron-secret`.

`META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_API_VERSION`,
`META_EMBEDDED_SIGNUP_CONFIG_ID`, and `META_WEBHOOK_VERIFY_TOKEN` are accepted
as aliases for beginners copying names from Meta tutorials. The `WHATSAPP_*`
name wins when both are present.

Do **not** add a global client token. The old `WHATSAPP_API_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, and
`WHATSAPP_ALERT_TEMPLATE_NAME` variables are intentionally removed. Client
tokens are created by Embedded Signup and stored encrypted per business.

Instagram uses `INSTAGRAM_ACCESS_TOKEN` instead of reusing a WhatsApp token.

## 4. Beginner setup: getting each key from Meta

This is the exact external setup. It cannot be done from this repository.

### A. Create the Meta app

1. Open <https://developers.facebook.com/apps/>.
2. Create an app of type **Business**.
3. Add the **WhatsApp** product.
4. Complete Business Verification in Meta Business Suite if Meta asks for it.
5. Request **Tech Provider** access for WhatsApp Business Platform.

### B. Copy the app ID and app secret

1. App Dashboard → **App settings → Basic**.
2. Copy **App ID** into `WHATSAPP_APP_ID`.
3. Click **Show** on **App secret** and copy it into `WHATSAPP_APP_SECRET`.
4. This is the app secret used to verify webhooks. It is not a client token and
   not a partner system-user token.

### C. Create the Embedded Signup configuration

1. App Dashboard → **Facebook Login for Business → Configurations**.
2. Create a configuration with login variation **Embedded Signup**.
3. Select **Cloud API**.
4. If you want owners to keep using the WhatsApp Business app, also enable
   **WhatsApp Business app user onboarding / coexistence**.
5. Select the permissions Meta requires for the products you chose. For Cloud
   API this normally includes:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
6. Copy the **Configuration ID** into `WHATSAPP_ES_CONFIG_ID`.
7. Add every HTTPS host that launches the popup to **Allowed domains** and
   **Valid OAuth redirect URIs**. `http://localhost` cannot complete the full
   flow; use an HTTPS tunnel or staging domain.
8. Set **Login with the JavaScript SDK** to **Yes**, and add the frontend
   domains to **Allowed Domains for the JavaScript SDK**.
9. Set **Deauthorize Callback URL** to
   `https://<api-host>/api/meta/deauthorize` and **Data Deletion Request URL**
   to `https://<api-host>/api/meta/data-deletion`.
10. Complete any App Review / Advanced Access Meta requires before real clients
    use the app.

Exact field-by-field values are in
[`docs/META-APP-SETUP.md`](./META-APP-SETUP.md).

### D. Configure the webhook

1. App Dashboard → **WhatsApp → Configuration**.
2. Callback URL:
   `https://<your-api-host>/api/v2/whatsapp/webhook`
3. Verify token: the exact value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
4. Subscribe to at least:
   - `messages`
   - `message_template_status_update`
   - `message_template_quality_update`
   - `user_preferences`
5. For coexistence, also subscribe to:
   - `account_update`
   - `history`
   - `smb_app_state_sync`
   - `smb_message_echoes`
6. Use a valid publicly trusted TLS certificate. Self-signed certificates are
   rejected by Meta.

### E. Per-business onboarding

1. The owner opens **Dashboard → WhatsApp Marketing** and clicks **Connect
   WhatsApp**.
2. They sign in to Meta and choose their business portfolio.
3. They either connect an existing WhatsApp Business app number (coexistence)
   or add a new business number.
4. For a new Cloud API number, they may need to enter the 6-digit two-step PIN
   in the dashboard to register the number. Coexistence numbers skip this.
5. They open **Meta Billing Hub** and add their own payment method:
   - UPI → prepaid balance in India.
   - Card → invoiced billing.
   The mode is fixed after the first setup.
6. They create or edit a template and wait for Meta approval.
7. They share the sign-up link/QR or click-to-chat link, or import consented
   numbers, then run automations and campaigns.

## 5. Official pricing used in the UI

Source: Meta's official WhatsApp pricing page and the INR list-rates workbook,
effective **1 October 2026**, verified **18 November 2026**.

| Category | INR per delivered message |
| --- | ---: |
| Marketing | ₹0.8631 |
| Utility | ₹0.1150 |
| Authentication | ₹0.1150 |
| Service | ₹0.1150 |
| Authentication-international | ₹2.4971 |

- Meta charges per **delivered** business-to-user message.
- User-to-business messages are free.
- Since **1 October 2026**, each business phone number gets **1,000 delivered
  service messages per month** at no charge.
- Service messages are free-form only inside the 24-hour customer service
  window. Outside it, use an approved template.
- Meta may change rates on the published quarterly pricing calendar. The UI
  links to the official rate card and does not claim these are permanent.

## 6. Data model

- `WhatsAppConnection` — one per business; encrypted token, WABA ID, phone
  number ID, webhook/registration/payment checklist state.
- `WhatsAppContact` — phone, consent status, consent source, marketing opt-out,
  last inbound/outbound timestamps.
- `WhatsAppConsentEvent` — append-only audit trail.
- `WhatsAppMessage` — inbound and outbound messages, status, error, pricing.
- `WhatsAppTemplate` — Meta template ID, status, category, use case, components,
  variable counts, rejection reason.
- `WhatsAppAutomation` — scheduled template sends with variables and status.
- `WhatsAppAutomationRule` — event-triggered template rules
  (`FEEDBACK_RECEIVED`, `OPT_IN_RECEIVED`) with token/fixed-text mappings.

Migration: `server/prisma/migrations/20261117000000_whatsapp_multitenant`.

## 7. API endpoints

All business endpoints require the existing bearer auth and verify that the
business belongs to the user.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v2/whatsapp/overview/:businessId` | Connection, templates, contacts, messages, stats, pricing, estimated Meta spend |
| POST | `/api/v2/whatsapp/connect` | Exchange Embedded Signup code and save encrypted token |
| POST | `/api/v2/whatsapp/register` | Register number with a 6-digit PIN (skipped for coexistence) |
| POST | `/api/v2/whatsapp/sync` | Refresh phone/WABA/template state |
| POST | `/api/v2/whatsapp/payment-method-confirmed` | Record owner confirmation of the Meta Billing step |
| POST | `/api/v2/whatsapp/templates` | Create a template at Meta |
| PATCH | `/api/v2/whatsapp/templates/:id` | Edit an approved/rejected/paused template |
| POST | `/api/v2/whatsapp/templates/sync` | Pull templates and approval statuses |
| POST | `/api/v2/whatsapp/contacts` | Add one customer with attested consent |
| POST | `/api/v2/whatsapp/contacts/bulk` | Add up to 1,000 attested contacts |
| POST | `/api/v2/whatsapp/contacts/:id/opt-out` | Mark a customer opted out |
| POST | `/api/v2/whatsapp/send` | Send an approved template now |
| POST | `/api/v2/whatsapp/reply` | Free-form reply inside the 24-hour window |
| GET | `/api/v2/whatsapp/conversations/:businessId` | Conversation list |
| GET | `/api/v2/whatsapp/conversations/:businessId/:contactId` | Thread + service-window state |
| POST | `/api/v2/whatsapp/automations` | Schedule a template send |
| DELETE | `/api/v2/whatsapp/automations/:id` | Cancel a scheduled send |
| GET/POST/DELETE | `/api/v2/whatsapp/automation-rules/...` | Event automation rules |
| POST | `/api/v2/whatsapp/campaigns` | Queue a campaign to an opted-in audience |
| POST | `/api/v2/whatsapp/process-due` | Process due schedules (auth or cron secret) |
| GET | `/api/v2/whatsapp/public/business/:slug` | Public opt-in page business info |
| POST | `/api/v2/whatsapp/public/opt-in` | Public sign-up with consent |
| GET/POST | `/api/v2/whatsapp/webhook` | Meta verification and signed events |

## 8. Testing

Build and type-check:

```bash
cd server && npm run build
cd ../client && npx tsc --noEmit
```

Webhook signature check:

```bash
BODY='{"object":"whatsapp_business_account","entry":[]}'
SIG=$(node -e "const c=require('crypto');const s=process.env.WHATSAPP_APP_SECRET;process.stdout.write('sha256='+c.createHmac('sha256',s).update(process.argv[1]).digest('hex'))" "$BODY")
curl -X POST http://localhost:4000/api/v2/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIG" \
  -d "$BODY"
```

An unsigned or wrongly signed POST must return `401`. If
`WHATSAPP_APP_SECRET` is missing, the endpoint returns `503` rather than
accepting the event.

Template creation and sending require a real connected WABA. They cannot be
tested with placeholder IDs.

## 9. Known limitations / unverified items

- Meta does not expose a simple "payment method added" or "current balance"
  status through this integration. The connection stores an owner-confirmed
  timestamp for the checklist. Meta Billing Hub remains the source of truth.
- The dashboard's monthly Meta spend is an estimate from delivery webhooks.
  Taxes, volume tiers, free entry point windows, and settlement timing can make
  Meta's invoice differ.
- Number registration PIN behavior depends on the owner's two-step verification
  setup. The API treats Meta's "already registered" response as success.
- Coexistence contact sync is requested automatically. Chat history sync is not
  requested or persisted. The owner can still see new messages through
  `smb_message_echoes`.
- Some WhatsApp users adopt usernames; their phone number may be omitted from
  some webhooks. Those contacts cannot always be mapped to a phone-only record.
- Template approval time is controlled by Meta.
- Automatic weekly owner-digest scheduling is not claimed. The settings card
  can preview and send a test through an approved Owner report template, but
  there is no separate digest scheduler in this change.
- WhatsApp owner alerts from the old global-number path are disabled. They
  require per-business connection, an approved template, and owner opt-in.
- Google review-text import remains blocked by missing review-content
  entitlement.
- Production must use an India-region PostgreSQL database for payment data
  localization. That is unchanged by this feature.

## 10. Official sources

- Embedded Signup overview / versions:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview
- Embedded Signup v4:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4
- Onboarding customers as a Tech Provider:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-customers-as-a-tech-provider
- WhatsApp Business app coexistence:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users
- `smb_message_echoes`:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/smb_message_echoes
- `smb_app_state_sync`:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/smb_app_state_sync
- Opt-in requirements:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in
- WhatsApp pricing:
  https://developers.facebook.com/docs/whatsapp/pricing
- India prepaid billing and error 131042:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/prepaid-billing
- Support for onboarded clients / adding a payment method:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/support/business-customer-support
- Click-to-chat link format:
  https://faq.whatsapp.com/en/general/26000030
- Template fundamentals:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview
- Marketing templates and user preferences:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates
- WhatsApp Business Messaging Policy:
  https://business.whatsapp.com/policy
- Google review policy (no fake, misleading, or incentivized reviews):
  https://support.google.com/contributionpolicy/answer/7400114
