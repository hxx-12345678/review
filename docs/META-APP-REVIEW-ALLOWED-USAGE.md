# Meta App Review — Allowed usage, screencasts, and reviewer instructions

Last verified: **19 November 2026**

This document matches the flows that actually exist in this repository. Do not
claim automatic WhatsApp digest delivery or WhatsApp reply parsing until those
features are implemented.

---

## 1. What the Allowed usage screenshot means

From the screenshot:

### `whatsapp_business_messaging`

- ✅ Describe how the app uses the permission
- ❌ **Upload screencast** — missing
- ✅ Required API test calls
- ✅ Agree to allowed usage

Only the screencast is missing.

### `whatsapp_business_management`

- ✅ Describe how the app uses the permission
- ❌ **Upload screencast** — missing
- ❌ **Required API test calls** — missing on this card
- ✅ Agree to allowed usage

This card has **two** missing steps, not one. Uploading only the screencast will
not make the card complete. Run a successful management API call and wait for
Meta’s counter to update before submitting.

### `public_profile`

`public_profile` is already configured. It is **not required** for WhatsApp
Embedded Signup. If Meta lets you remove it from the submission, remove it
unless you actually use Facebook user profile data. This app uses `FB.login`
only to launch Embedded Signup and requests no `email`, `public_profile`, or
`user_*` permissions.

---

## 2. Exact copy-paste permission descriptions

### `whatsapp_business_messaging`

```text
BEYONDVYU uses whatsapp_business_messaging to send Meta-approved WhatsApp template messages to customers and business owners who have opted in. The messages are customer feedback and review requests, service follow-ups, and weekly review intelligence digests that the business owner requests from the dashboard. The app also receives customer replies in its inbox and lets the business reply within the 24-hour service window. Marketing templates are sent only to contacts with separate marketing opt-in. BEYONDVYU does not send free-form business-initiated messages outside the 24-hour service window.
```

### `whatsapp_business_management`

```text
BEYONDVYU is a Tech Provider that uses whatsapp_business_management so each business can connect its own WhatsApp Business Account and phone number through Meta Embedded Signup. The app reads the connected WABA's phone-number status and message templates so the business can sync, create, and manage approved templates for review collection, service follow-ups, and owner digests. Each business owns its WABA and pays Meta directly; BEYONDVYU does not bundle, absorb, or mark up Meta message fees.
```

---

## 3. Required API test calls

Meta’s published Postman collection:

<https://www.postman.com/meta/whatsapp-business-platform/collection/3kru5r6/moved-whatsapp-business-management-api>

Set these collection values:

| Variable | Value |
| --- | --- |
| `baseUrl` | `https://graph.facebook.com/v27.0` |
| `waba-id` | your WhatsApp Business Account ID |
| Authorization | `Bearer <system-user token with whatsapp_business_management>` |

If the collection does not include the auth header, add it manually. If it uses
`:waba-id` as a path variable, fill the path variable; do not type the literal
text `:waba-id`.

Run at least these requests successfully:

```http
GET /<WABA_ID>/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating
```

```http
GET /<WABA_ID>/message_templates?fields=id,name,status,category,language
```

```http
POST /<WABA_ID>/message_templates
```

```json
{
  "name": "post_visit_review_request_20261119",
  "language": "en",
  "category": "UTILITY",
  "parameter_format": "positional",
  "components": [
    {
      "type": "body",
      "text": "Hi {{1}}, thank you for visiting {{2}}. Would you share a quick review of your experience? {{3}}",
      "example": {
        "body_text": [
          [
            "Meta Reviewer",
            "Caesars Palace",
            "https://beyondvyu.com/r/caesars-palace"
          ]
        ]
      }
    }
  ]
}
```

```http
GET /<TEMPLATE_ID>?fields=id,name,status,category,language
```

```http
GET /<WABA_ID>/subscribed_apps
```

The `POST /message_templates` call is the strongest proof that your app can
manage templates. Run it with the same Meta app you are submitting for review.

Meta may take **24–48 hours** to update the `0 of 1 API call(s) required`
counter. Do not submit until it is green.

### Messaging test call

If the messaging card is already green, no action is needed. If it is not,
send an approved template to an opted-in test number:

```http
POST /<PHONE_NUMBER_ID>/messages
```

Use a real approved template and a recipient who opted in. Do not use a
purchased list or a fake number.

---

## 4. Screencast 1 — `whatsapp_business_messaging`

**Goal:** prove that BEYONDVYU sends an approved template to an opted-in
customer, receives the message on WhatsApp, collects feedback through the
secure review link, and shows the result in the dashboard.

### Before recording

- Use the **HTTPS** app: `https://beyondvyu.com` (or your HTTPS staging URL).
- Connect the business’s own WABA and phone number.
- Add a Meta payment method, or use Meta’s test number with a verified test
  recipient. Without billing, sends can fail with Meta error `131042`.
- Have one **approved Utility template**, for example `review_request` or
  `post_service_review`.
- Have one test customer who opted in. For marketing templates, use a contact
  with separate marketing opt-in.
- Do not show a Figma mockup, slide deck, or fake dashboard.

### Recording steps

1. Open `https://beyondvyu.com/login` and sign in.
2. Select the reviewer business. The current production test account has
   `Caesars Palace` (slug `caesars-palace`).
3. Open **WhatsApp Automation & Marketing**.
4. Show the connected number card: verified name, phone number, status, and
   quality rating.
5. Open **Contacts**.
6. Show the test customer with **opted in** status. Point out that marketing
   opt-in is separate.
7. Open **Templates**.
8. Show the approved `review_request` or `post_service_review` template with
   status **APPROVED**.
9. Open **Send**.
10. Select the opted-in contact.
11. Select the approved Utility template.
12. Fill the variables, including the customer name, business name, and review
    URL.
13. Click **Send now**.
14. Open **Activity** and show the message status: Sent / Delivered / Read.
15. Switch to WhatsApp Web or the mirrored phone.
16. Show the message arriving from the business’s number.
17. Tap the review link.
18. Submit a short feedback response on the BEYONDVYU review page.
19. Show the thank-you screen and the optional WhatsApp opt-in.
20. Switch back to BEYONDVYU.
21. Open **Inbox** and show the customer’s reply. Reply within the 24-hour
    service window to demonstrate two-way messaging.
22. Open **Settings → WhatsApp Reputation Pulse**.
23. Enter the owner’s opted-in WhatsApp number, tick the consent box, and click
    **Send test digest / preview**.
24. Show the owner digest arriving on WhatsApp through the approved `Owner
    report` Utility template.
25. Show the preview/delivery state in the dashboard.

### Narration notes

- “The customer opted in before any template was sent.”
- “This is a Meta-approved Utility template, not free-form outbound text.”
- “The customer submits feedback through the secure review link.”
- “The owner digest is sent through an approved Owner report Utility template.”
- “Nothing is sent to a customer who did not opt in.”

### Do not claim

- Do not say the weekly WhatsApp digest sends automatically. This release saves
  the preference and supports a test send. Automatic WhatsApp delivery is not
  enabled yet.
- Do not say WhatsApp replies are converted into ratings. Feedback is submitted
  through the secure review link; replies appear in the inbox.

---

## 5. Screencast 2 — `whatsapp_business_management`

**Official requirement:** a video of **your app, or WhatsApp Manager**, being
used to create a message template. Your app qualifies.

**Goal:** prove that BEYONDVYU can create and save a message template in a
client’s own WABA through the WhatsApp Business Management API.

Use the app, not WhatsApp Manager. The app flow is stronger because it proves
the Tech Provider capability.

### Before recording

- Use the HTTPS app.
- Connect a real WABA and phone number to the reviewer business.
- Confirm the Templates tab is available.
- Have a unique template name ready. Do not reuse an existing name.
- Allow enough time for the template to appear as `PENDING` or `APPROVED`.

### Recording steps

1. Open `https://beyondvyu.com/login` and sign in.
2. Select the reviewer business.
3. Open **WhatsApp Automation & Marketing**.
4. Briefly show the connected WhatsApp number and verified name.
5. Open **Templates**.
6. Show the existing templates and click **Sync from Meta** if needed.
7. In **Create a Meta template**, enter:
   - **Name:** `post_visit_review_request_20261119`
   - **Language:** `en`
   - **Purpose:** Review request
   - **Meta category:** Utility
   - **Header:** `Thanks for visiting`
   - **Body:** `Hi {{1}}, thank you for visiting {{2}}. Would you share a quick review of your experience? {{3}}`
   - **Footer:** `Reply STOP to opt out of messages.`
   - **Example values:** `Meta Reviewer, Caesars Palace, https://beyondvyu.com/r/caesars-palace`
8. Pause on the live WhatsApp preview so the reviewer can read it.
9. Click **Submit to Meta**.
10. Show the success message: “Template submitted to Meta for review.”
11. Show the new template in **Your templates** with status `PENDING`.
12. Click **Sync from Meta** and show the status update.
13. Show that the template was saved in the connected WABA.
14. End on the template name and status.

### Narration notes

- “This is the client’s own WABA, connected through Meta Embedded Signup.”
- “BEYONDVYU creates the template through the WhatsApp Business Management API.”
- “The template is submitted to Meta for review.”
- “The client can see the status in the dashboard.”
- “Each business owns its WABA and pays Meta directly.”

### Do not include

- Do not show the message send/receive flow in this video. That belongs in the
  `whatsapp_business_messaging` video.
- Do not show a mockup or a pre-recorded template list without the creation
  action.
- Do not use a template that offers discounts, gifts, rewards, or asks only for
  positive reviews.

---

## 6. Reviewer instructions — copy-paste template

Replace the placeholders before submitting.

```text
Reviewer URL: https://beyondvyu.com/login
Reviewer email: <reviewer-email>
Reviewer password: <reviewer-password>

This account has no SMS OTP or 2FA and has full access to the demo business
"Caesars Palace". Replace this name if you create a dedicated reviewer business.

1. Sign in at https://beyondvyu.com/login with the credentials above.
2. Select the business "Caesars Palace".
3. Open "WhatsApp Automation & Marketing" in the left navigation.
4. On the overview, confirm the connected WhatsApp Business number and its
   verified name/status. This number is connected through Meta Embedded Signup.
5. Open the "Templates" tab. Confirm that the Utility template named
   "review_request" (or "post_service_review") is APPROVED.
6. Open the "Contacts" tab. Confirm that the test customer is opted in. The
   optional marketing opt-in is separate and is not required for Utility
   review requests.
7. Open the "Send" tab. Select the opted-in test customer, select the approved
   Utility template, fill the sample variables, and click "Send now".
8. Open the "Activity" tab to see the message status. The same message arrives
   on the opted-in test phone.
9. To demonstrate the owner digest, open "Settings" → "WhatsApp Reputation
   Pulse". Enter the opted-in owner number, tick the consent box, and click
   "Send test digest / preview". The digest arrives through the approved Owner
   report Utility template.
10. Open "Inbox" to see customer replies and the 24-hour service-window reply
    flow.
11. Open "Templates" → "Owner Reports" to see the Weekly Reputation Digest
    template and the "Submit to Meta" flow.

Notes for the reviewer:
- The app uses Meta-approved templates for business-initiated messages.
- Marketing templates require separate marketing opt-in.
- The app does not send free-form business-initiated messages outside the
  24-hour service window.
- Each business owns its own WABA and pays Meta directly. BEYONDVYU does not
  bundle or mark up Meta fees.
```

Do not commit a real password. Use a dedicated reviewer account, not a personal
login, and rotate the password after the review.

---

## 7. Pre-submission checklist

- [ ] App is live on HTTPS.
- [ ] `WHATSAPP_APP_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ES_CONFIG_ID`,
      `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, and `TOKEN_ENCRYPTION_KEY` are set on the
      API host.
- [ ] `FRONTEND_URL` is the HTTPS frontend origin.
- [ ] Meta **Valid OAuth Redirect URIs** includes the exact
      `https://beyondvyu.com/dashboard/whatsapp`.
- [ ] Meta **App Domains** includes `beyondvyu.com` and `www.beyondvyu.com`.
- [ ] Reviewer business has a connected WABA and phone number.
- [ ] Reviewer business has an approved Utility template.
- [ ] Reviewer business has an opted-in test contact.
- [ ] Meta payment method is added, or a test number/verified recipient is used.
- [ ] Management API call succeeded and the counter shows complete.
- [ ] Two separate MP4 screencasts under 100 MB.
- [ ] Privacy Policy URL is public and matches the live domain.
- [ ] Data deletion instructions are public.
- [ ] No mockups, fake messages, review gating, or incentives.
- [ ] `public_profile` is removed from the submission if it is not used.

---

## 8. What is actually implemented today

| Feature | Status |
| --- | --- |
| Meta Embedded Signup / WABA connection | ✅ Implemented |
| Phone-number and template sync | ✅ Implemented |
| Template creation and submission | ✅ Implemented |
| Contacts and consent tracking | ✅ Implemented |
| Send approved template 1-to-1 | ✅ Implemented |
| Scheduled sends and group campaigns | ✅ Implemented |
| Event automations | ✅ Implemented |
| Inbox and 24-hour reply flow | ✅ Implemented |
| Message activity/status | ✅ Implemented |
| Customer feedback via secure review link | ✅ Implemented |
| Owner digest preview and test send via approved Utility template | ✅ Implemented |
| Automatic weekly WhatsApp digest delivery | ❌ Not enabled; do not claim it |
| Parse WhatsApp replies into ratings | ❌ Not implemented; use the secure link |

The email owner digest runner is separate (`npm run digest:send`) and uses
email, not WhatsApp.
