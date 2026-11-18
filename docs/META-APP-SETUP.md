# Meta app settings — exact values for BEYONDVYU

Last verified: **18 November 2026**

This is the field-by-field setup for the Meta app that powers WhatsApp
Embedded Signup. It matches the code in this repository:

- Frontend / Embedded Signup host: `beyondvyu.com` (Vercel)
- Staging frontend: `review-nine-inky.vercel.app`
- API host known to this repo: `review-ewye.onrender.com`
- Embedded Signup is launched from `/dashboard/whatsapp`
- Webhook: `/api/v2/whatsapp/webhook`
- Deauthorize callback: `/api/meta/deauthorize`
- Data deletion callback: `/api/meta/data-deletion`

> If you have moved the API to a custom host such as `api.beyondvyu.com`, use
> that host everywhere this document says `review-ewye.onrender.com`. The value
> must be the same origin that `NEXT_PUBLIC_API_URL` points to on the frontend.

---

## 1. Facebook Login for Business → Settings

Open **App Dashboard → Facebook Login for Business → Settings**.

### Toggles

| Setting | Value | Why |
| --- | --- | --- |
| Client OAuth login | **Yes** | Required for the OAuth dialog. |
| Web OAuth login | **Yes** | Required for browser login. |
| Enforce HTTPS | **Yes** | Embedded Signup only supports HTTPS. |
| Embedded Browser OAuth Login | **Yes** | Required for in-app browsers that suppress popups. |
| Use Strict Mode for redirect URIs | **Yes** | Meta requires exact redirect matching. |
| Login with the JavaScript SDK | **Yes** | `whatsapp-flows.tsx` loads `connect.facebook.net/en_US/sdk.js` and calls `FB.init` / `FB.login`. |
| Login from devices | **No** | This app does not use the TV/device login flow. |

### Valid OAuth Redirect URIs

Paste each line as a separate entry. Include both the apex and `www` host, and
the exact page that launches Embedded Signup.

```text
https://beyondvyu.com/
https://beyondvyu.com/dashboard/whatsapp
https://www.beyondvyu.com/
https://www.beyondvyu.com/dashboard/whatsapp

https://review-nine-inky.vercel.app/
https://review-nine-inky.vercel.app/dashboard/whatsapp
```

Notes:

- The Embedded Signup popup is launched from `/dashboard/whatsapp`. Listing the
  origin alone is not enough with Strict Mode; list the full path too.
- If you test through an HTTPS tunnel, add the tunnel origin and
  `https://<tunnel-host>/dashboard/whatsapp`.
- Do **not** add `http://localhost:3000`. Meta does not support HTTP for the
  full Embedded Signup flow. Use an HTTPS tunnel or the Vercel staging domain.
- Do not add the API host here. Embedded Signup runs on the frontend, not the API.

### Allowed Domains for the JavaScript SDK

Enter domains only — no `https://`, no path, no trailing slash.

```text
beyondvyu.com
www.beyondvyu.com
review-nine-inky.vercel.app
```

Add the tunnel hostname here too when testing locally.

### Redirect URI Validator

This field is only a checker; it is not saved. Enter:

```text
https://beyondvyu.com/dashboard/whatsapp
```

It must report that the URI matches the saved list. If it does not, add the
exact URI above and validate again.

### If the validator says “This is an invalid redirect URI for this application”

This error means the exact string is not in the **saved** list above it. It is
not a request to type the URL into the validator box.

Do this in order:

1. **App settings → Basic → App Domains** must contain `beyondvyu.com` and
   `www.beyondvyu.com`. Save. A redirect URI can be rejected when its domain is
   missing from App Domains, even if the URL is listed.
2. Go back to **Facebook Login for Business → Settings**.
3. In **Valid OAuth Redirect URIs**, type:

   ```text
   https://beyondvyu.com/dashboard/whatsapp
   ```

   Press **Enter** after typing so it becomes a separate entry. Do not just
   paste it and click away.
4. Add the other entries from the list above, including the root and `www`
   variants.
5. Scroll to the bottom of the page and click **Save changes**. Wait for the
   confirmation, then reload the page and confirm the entries are still there.
6. Now enter the same URL in **Redirect URI Validator** and check again.

If it still fails:

- Make sure you are editing the correct app (check the app selector at the top).
- If the page has both **Facebook Login** and **Facebook Login for Business**,
  add the URI to both settings pages. The validator only checks the section it
  belongs to.
- `Use Strict Mode for redirect URIs` requires an exact match. No wildcard, no
  extra query string, no uppercase host, no extra space.
- Add both `https://beyondvyu.com/dashboard/whatsapp` and
  `https://beyondvyu.com/dashboard/whatsapp/` if the validator still fails. One
  of them will match how the browser presents the page.
- Do not put the full URL in **Allowed Domains for the JavaScript SDK**. That
  field takes only `beyondvyu.com`.
- Do not put the API host (`review-ewye.onrender.com`) in this list. Embedded
  Signup runs on the frontend.
- If the app type is **None**, Facebook Login for Business may not save this
  list. Check **App settings → Basic → App Type** and use a Business app.
- If you use a tunnel, add the tunnel host to **App Domains**, the tunnel
  hostname to **Allowed Domains**, and the full
  `https://<tunnel-host>/dashboard/whatsapp` to **Valid OAuth Redirect URIs**.

---

## 2. Deauthorize Callback URL

**App Dashboard → App settings → Basic → Deauthorize Callback URL** (some app
versions show it under **Facebook Login for Business → Settings**).

```text
https://review-ewye.onrender.com/api/meta/deauthorize
```

Meta sends a form-encoded `signed_request`. The endpoint:

- verifies the HMAC with `WHATSAPP_APP_SECRET`
- rejects unsigned/invalid requests with HTTP 400
- returns HTTP 200 `{ "status": "ok" }` for a valid request
- does not log the app-scoped user ID

If you use the frontend proxy instead, the equivalent URL is
`https://beyondvyu.com/api/meta/deauthorize`. Direct API host is preferred
because it avoids any proxy body handling.

---

## 3. Data Deletion Request URL

Use the callback, not just a help page:

```text
https://review-ewye.onrender.com/api/meta/data-deletion
```

Meta sends a form-encoded `signed_request`. The endpoint:

- verifies the HMAC with `WHATSAPP_APP_SECRET`
- records the request in `MetaDataDeletionRequest`
- returns the exact JSON shape Meta requires:

```json
{
  "url": "https://beyondvyu.com/data-deletion/<confirmation-code>",
  "confirmation_code": "<confirmation-code>"
}
```

The status page is public and human-readable:
`https://beyondvyu.com/data-deletion/<confirmation-code>`.

If Meta also shows a separate **Data Deletion Instructions URL**, use:

```text
https://beyondvyu.com/data-deletion
```

### Why this is correct for this app

BEYONDVYU does not use Facebook Login for end-user accounts. Facebook Login is
used only for WhatsApp Embedded Signup. The signed request identifies a
Facebook user, not a BEYONDVYU account, and we do not store a Facebook profile
for that user. The callback therefore records the request as `no_data` with a
clear note, instead of claiming to delete rows that do not exist. If a future
feature stores Facebook user IDs, delete matching rows in the callback before
marking it complete.

---

## 4. Basic app settings

| Field | Value |
| --- | --- |
| App Domains | `beyondvyu.com`, `review-nine-inky.vercel.app` |
| Privacy Policy URL | `https://beyondvyu.com/privacy` |
| Terms of Service URL | `https://beyondvyu.com/terms` |
| User Data Deletion | `https://beyondvyu.com/data-deletion` |
| Category | Business |
| App icon | 1024×1024 PNG |
| App purpose / use case | Connect with customers through WhatsApp |

`beyondvyu.com/privacy` now links to `/data-deletion`, which is the
human-readable instruction page Meta looks for.

---

## 5. WhatsApp webhook

**App Dashboard → WhatsApp → Configuration**.

| Field | Value |
| --- | --- |
| Callback URL | `https://review-ewye.onrender.com/api/v2/whatsapp/webhook` |
| Verify token | the exact value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |

Subscribe to:

- `messages`
- `message_template_status_update`
- `message_template_quality_update`
- `user_preferences`

For coexistence, also subscribe to:

- `account_update`
- `history`
- `smb_app_state_sync`
- `smb_message_echoes`

The POST route verifies `X-Hub-Signature-256` with `WHATSAPP_APP_SECRET` and
fails closed. The GET route answers Meta's verification challenge with
`WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

---

## 6. Embedded Signup configuration

**Facebook Login for Business → Configurations**.

1. Create from the **WhatsApp Embedded Signup Configuration With 60 Expiration
   Token** template, or create a custom configuration with login variation
   **WhatsApp Embedded Signup**.
2. Select **Cloud API**.
3. Select only `whatsapp_business_management` and
   `whatsapp_business_messaging`.
4. Enable WhatsApp Business app onboarding / coexistence if owners should keep
   using the WhatsApp Business app on their phone.
5. Copy the **Configuration ID** into `WHATSAPP_ES_CONFIG_ID`.

Server env:

```env
WHATSAPP_APP_ID="<App ID>"
WHATSAPP_APP_SECRET="<App secret>"
WHATSAPP_ES_CONFIG_ID="<Configuration ID>"
WHATSAPP_ES_VERSION="v4"
WHATSAPP_ES_FEATURE_TYPE="whatsapp_business_app_onboarding"
WHATSAPP_API_VERSION="v25.0"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="<long random string>"
```

`FRONTEND_URL` must be the public frontend origin, because the data-deletion
status URL is generated from it:

```env
FRONTEND_URL="https://beyondvyu.com"
```

---

## 7. CSP and SDK loading

`client/middleware.ts` now allows the Meta SDK and signup window:

- `script-src https://connect.facebook.net`
- `connect-src https://connect.facebook.net https://graph.facebook.com https://www.facebook.com https://web.facebook.com`
- `frame-src https://www.facebook.com https://web.facebook.com https://*.facebook.com`
- `form-action https://www.facebook.com`

Without these entries the browser blocks the SDK before `FB.login` runs, and
the Connect button appears to do nothing.

---

## 8. Common mistakes that break Embedded Signup

| Mistake | Symptom |
| --- | --- |
| `localhost` HTTP instead of HTTPS | Popup opens but never returns a code. |
| Only `https://beyondvyu.com` listed, not the `/dashboard/whatsapp` path | Strict Mode rejects the redirect URI. |
| `Login with the JavaScript SDK` is off | `FB.init` loads but `FB.login` fails. |
| Domain missing from **Allowed Domains for the JavaScript SDK** | SDK loads, popup blocked or code not returned. |
| API host added to **Valid OAuth Redirect URIs** | Wrong host; Embedded Signup runs on the frontend. |
| `www` missing | Users on `www.beyondvyu.com` fail while apex works. |
| CSP missing `connect.facebook.net` | Console shows a CSP violation; no signup window. |
| Webhook verify token mismatch | Meta webhook verification fails with 403. |
| App secret changed but server not restarted | Code exchange and signature checks fail. |

---

## 9. What to test after saving

1. Open `https://beyondvyu.com/dashboard/whatsapp` in a private window.
2. Click **Connect WhatsApp** while signed in as an app admin/developer/tester.
3. Complete the Meta flow with a sandbox or test business.
4. Confirm the callback returns `waba_id` and an exchangeable code.
5. Confirm the dashboard exchanges the code, subscribes the app, and shows the
   connected number.
6. Send a test template to an opted-in test number.
7. Trigger the deauthorize callback from Facebook Settings → Apps and Websites
   and confirm HTTP 200 in the API logs.
8. Trigger a data deletion request and confirm the JSON contains `url` and
   `confirmation_code`, and that the status page loads.
9. Run a signed webhook test:

```bash
BODY='{"object":"whatsapp_business_account","entry":[]}'
SIG=$(node -e "const c=require('crypto');const s=process.env.WHATSAPP_APP_SECRET;process.stdout.write('sha256='+c.createHmac('sha256',s).update(process.argv[1]).digest('hex'))" "$BODY")
curl -X POST https://review-ewye.onrender.com/api/v2/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIG" \
  -d "$BODY"
```

Expected: HTTP 200. An unsigned request must return 401, and a missing app
secret must return 503.

---

## 10. Official sources

- Embedded Signup implementation (toggles, allowed domains, JS SDK):
  https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation
- Embedded Signup overview:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview
- Embedded Signup v4:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4
- Data Deletion Request Callback:
  https://developers.facebook.com/docs/apps/delete-data
- Manual login flow / deauthorize callback:
  https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow
- WhatsApp webhooks:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
