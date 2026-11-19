# Meta WhatsApp production setup — BEYONDVYU

Last verified: **19 November 2026**

This is the production counterpart to the local setup in
[`WHATSAPP-AUTOMATION.md`](./WHATSAPP-AUTOMATION.md). It covers the exact
**Step 2 — Production setup** page in the Meta App Dashboard.

---

## 0. Current live status (verified 19 November 2026)

The production API is now configured correctly.

```text
GET /api/v2/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345
→ 403 Forbidden

GET /api/v2/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<correct>&hub.challenge=12345
→ 200 12345

POST /api/meta/data-deletion with invalid signed_request
→ 400 {"error":"Invalid signed_request"}

POST /api/v2/whatsapp/webhook with no signature
→ 401 {"error":"Invalid signature"}
```

This proves:

- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` is set and matches the local value.
- `WHATSAPP_APP_SECRET` is set.
- The webhook route is public and reachable.
- Meta can now verify the callback URL.

The remaining production work is to connect a real WABA, register a phone
number, add payment, create/approve a template, and publish the app.

---

## 1. Render environment variables

Set these on the **API** service in Render, then redeploy. Do not put secrets in
the frontend/Vercel environment.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://beyondvyu.com` |
| `WHATSAPP_APP_ID` | `1006742631836624` |
| `WHATSAPP_APP_SECRET` | Meta App Dashboard → App settings → Basic → App secret |
| `WHATSAPP_ES_CONFIG_ID` | `1323827363160575` |
| `WHATSAPP_ES_VERSION` | `v4` |
| `WHATSAPP_API_VERSION` | `v27.0` (use the same version you test locally) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | a long random string; the same value goes in Meta |
| `WHATSAPP_ES_FEATURE_TYPE` | `whatsapp_business_app_onboarding` for coexistence, or empty for Cloud API-only |
| `TOKEN_ENCRYPTION_KEY` | 64 hex characters; must stay stable or stored client tokens break |
| `WHATSAPP_CRON_SECRET` | optional; only if an external scheduler calls `/process-due` |

`WHATSAPP_BILLING_URL` and `WHATSAPP_MANAGER_URL` already have correct defaults.

Generate a verify token locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the **same** value into Render and into Meta's **Verify token** field.

> Do not set a global `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, or
> `WHATSAPP_BUSINESS_ACCOUNT_ID`. Client tokens are created by Embedded Signup
> and stored encrypted per business.

---

## 2. Configure Webhooks

In **App Dashboard → WhatsApp → Configuration** (or **Use cases → Customize →
Configuration** for the “Connect with customers through WhatsApp” app type):

| Field | Value |
| --- | --- |
| Callback URL | `https://review-ewye.onrender.com/api/v2/whatsapp/webhook` |
| Verify token | the exact `WHATSAPP_WEBHOOK_VERIFY_TOKEN` value from Render |

Click **Verify and save**. Meta sends:

```http
GET /api/v2/whatsapp/webhook?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...
```

The server returns `200` with the challenge only when the token matches. It
returns `503` if the token is missing and `403` if it is wrong.

### Subscribe to fields

At minimum:

- `messages`
- `message_template_status_update`
- `message_template_quality_update`
- `user_preferences`

For coexistence also subscribe to:

- `account_update`
- `history`
- `smb_app_state_sync`
- `smb_message_echoes`

### Client certificate / mTLS

Leave **Attach a client certificate** **off** unless you have explicitly set up
mTLS on the API host. This Express server does not verify client certificates.

### Test the webhook

Use the **Test** button in the Meta panel and check Render logs. Expected:

- `200` with `{"status":"ignored"}` or an event result for a valid signed test.
- `401` means `WHATSAPP_APP_SECRET` does not match the app that signed it.
- `503` means `WHATSAPP_APP_SECRET` is missing.
- `403` during verification means the verify token does not match.

You can also verify the public endpoint manually:

```powershell
$token = "<WHATSAPP_WEBHOOK_VERIFY_TOKEN>"
Invoke-WebRequest "https://review-ewye.onrender.com/api/v2/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$token&hub.challenge=12345"
```

Expected body: `12345`.

> While the app is unpublished, Meta only sends **test webhooks** from the app
> dashboard. Production message/status webhooks start after the app is
> published. See section 7.

---

## 3. Register the WhatsApp phone number

For your own production/test WABA:

1. Open **WhatsApp Manager → Account tools → Phone numbers**.
2. Click **Add phone number**.
3. Enter a number **owned by the business** with country and area code.
4. The number must be able to receive SMS or voice, and must not be active on
   WhatsApp. If it is active, delete that WhatsApp account first or use a new
   number.
5. Verify with the SMS/voice code.
6. Set the display name. It must follow Meta's display-name guidelines and may
   go through review.
7. Register the number for Cloud API and set a **6-digit two-step PIN**.
   The dashboard can also collect this PIN in the `/register` flow.
8. Confirm the number shows **Connected** and has a phone number ID.

For coexistence numbers, do not register separately. Use Embedded Signup and
choose the existing WhatsApp Business app number.

### Test number

The Meta test number is for development only. Add each test recipient as a
verified test number in **API Setup**. It has a small recipient limit and is not
a production number.

---

## 4. Add payment to send business-initiated messages

1. Open **Meta Billing Hub** for the business portfolio that owns the WABA.
2. Add a payment method.
   - India: UPI prepaid balance or card/invoiced billing.
   - The mode is fixed after the first setup.
3. Confirm the payment method is attached to the correct WABA/business.

Rules:

- Each client business pays Meta directly. BEYONDVYU must not put its own card on
  a client's WABA or absorb/mark up Meta fees.
- Marketing, Utility, and Authentication templates are charged when delivered.
- The **1,000 free service messages per business phone number per month** (from
  1 October 2026) covers service messages only, not marketing/utility/auth.
- Without payment, sending can fail with Meta error **`131042`** even after the
  template is accepted.

The test number may allow a limited number of verified test recipients without
production billing. A real production number needs payment.

---

## 5. Generate an access token

There are two different token needs. Do not mix them.

### A. Permanent token for your own test WABA / API test calls

1. Open **Business Settings → Users → System Users**.
2. Add a system user, for example `BEYONDVYU WhatsApp Production`.
3. Assign assets:
   - the Meta app
   - the WABA / WhatsApp Business Account
4. Click **Generate New Token**.
5. Select the app.
6. Select:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `business_management` if Meta requires it for asset management
7. Set expiration to **Never**.
8. Copy the token once and store it in a password manager.

This token is for your own Graph API calls, API test calls, and your own test
WABA. It is **not** the token used for client sends.

### B. Client tokens for the multi-tenant product

- Embedded Signup returns a short-lived code.
- The server exchanges it for the client business token and stores it encrypted
  with `TOKEN_ENCRYPTION_KEY`.
- Each client's token belongs to that client's WABA.
- Never put a client token in Render env or the frontend.

If **Generate New Token** is disabled, finish Business Verification, assign the
app/WABA assets, and complete the required App Review/Tech Provider steps.

The temporary token on the API Setup page expires in **24 hours**. Do not use it
in production config.

---

## 6. Send the first message

Business-initiated messages must use an **approved template**. Free-form text is
only allowed inside the 24-hour customer service window after the customer
messages you first.

### Template send example

Replace the IDs, token, template name/language, and parameter count with your
real values:

```bash
curl -X POST "https://graph.facebook.com/v27.0/<PHONE_NUMBER_ID>/messages" \
  -H "Authorization: Bearer <SYSTEM_USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "<E164_NUMBER_WITHOUT_PLUS>",
    "type": "template",
    "template": {
      "name": "review_request",
      "language": { "code": "en" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Riya" },
            { "type": "text", "text": "Sunrise Cafe" },
            { "type": "text", "text": "https://beyondvyu.com/r/sunrise-cafe" }
          ]
        }
      ]
    }
  }'
```

The recipient must have opted in. If you use the test number, the recipient must
also be a verified test number.

The response contains `messages[0].id`. The webhook then sends `sent`,
`delivered`, and `read` status updates.

### QR code on the setup page

The QR code is for the customer to send the **first** message. That opens the
24-hour service window so the business can reply with free-form text. It does not
replace template consent for later business-initiated messages.

### Common send errors

| Error | Meaning |
| --- | --- |
| `131042` | Payment method missing/ineligible on the WABA |
| `131026` | Recipient cannot receive / has not opted in |
| `132000` or `132001` | Template parameter count or name/language mismatch |
| `190` | Access token expired or invalid |
| `100` | Invalid phone number ID or parameter |

---

## 7. Publish the app and subscribe the WABA

The production setup page warns:

> Apps will only be able to receive test webhooks while the app is unpublished.
> No production data, including from app admins, developers or testers, will be
> delivered unless the app has been published.

Sequence:

1. Finish **App Review** (Allowed usage screencasts, permissions, reviewer
   instructions). See
   [`META-APP-REVIEW-ALLOWED-USAGE.md`](./META-APP-REVIEW-ALLOWED-USAGE.md).
2. Switch the app to **Live** after approval.
3. Confirm each client WABA is subscribed to the app:
   - Embedded Signup does this automatically through
     `POST /{WABA_ID}/subscribed_apps`.
   - For manual setups, call the same endpoint or use WhatsApp Manager.
4. Send a real template and confirm the webhook receives `messages` and status
   events.

If the webhook is configured but no production events arrive, check:

- app is published/live
- WABA is subscribed to the app
- the phone number is registered and connected
- the callback URL is exactly `/api/v2/whatsapp/webhook`
- Render is awake (free-tier cold starts can exceed Meta's timeout)

---

## 8. Production checklist

- [ ] `WHATSAPP_APP_SECRET` set on Render
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` set on Render
- [ ] `TOKEN_ENCRYPTION_KEY` set and backed up
- [ ] `FRONTEND_URL=https://beyondvyu.com`
- [ ] Callback URL verified in Meta
- [ ] Webhook fields subscribed
- [ ] Phone number added, verified, registered, and connected
- [ ] 6-digit two-step PIN stored securely
- [ ] Payment method on the correct WABA
- [ ] Approved Utility template
- [ ] Opted-in test recipient
- [ ] System-user token generated for your own test calls
- [ ] App published / WABA subscribed for production events
- [ ] No global client token in env
- [ ] No secrets in git or frontend bundles
