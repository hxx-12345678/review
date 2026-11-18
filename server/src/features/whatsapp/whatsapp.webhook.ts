import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { getEnv } from "../../config/env";
import { verifyMetaSignature } from "./whatsapp.meta";

const STATUS_RANK: Record<string, number> = {
  QUEUED: 0,
  RECEIVED: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
};

function digitsOnly(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

function unixToDate(value: unknown): Date | null {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
}

function extractInboundText(message: any): string {
  if (!message) return "";
  switch (String(message.type || "").toLowerCase()) {
    case "text":
      return String(message.text?.body || "");
    case "button":
      return String(message.button?.text || message.button?.payload || "");
    case "interactive":
      return String(
        message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title ||
          message.interactive?.nfm_reply?.response_json ||
          "",
      );
    case "image":
      return String(message.image?.caption || "[image]");
    case "video":
      return String(message.video?.caption || "[video]");
    case "document":
      return String(message.document?.filename || "[document]");
    case "audio":
      return "[audio]";
    case "sticker":
      return "[sticker]";
    case "location":
      return [message.location?.name, message.location?.address].filter(Boolean).join(" — ") || "[location]";
    case "contacts":
      return String(message.contacts?.[0]?.name?.formatted_name || "[contact]");
    case "reaction":
      return String(message.reaction?.emoji || "[reaction]");
    default:
      return `[${message.type || "message"}]`;
  }
}

async function resolveConnection(phoneNumberId?: string | null, wabaId?: string | null) {
  if (phoneNumberId) {
    const byPhone = await prisma.whatsAppConnection.findUnique({
      where: { phoneNumberId: String(phoneNumberId) },
    });
    if (byPhone) return byPhone;
  }
  if (wabaId) {
    return prisma.whatsAppConnection.findFirst({
      where: { wabaId: String(wabaId) },
    });
  }
  return null;
}

async function recordConsent(input: {
  businessId: string;
  contactId: string;
  type: "OPT_IN" | "OPT_OUT" | "MARKETING_OPT_IN" | "MARKETING_OPT_OUT";
  source: string;
  note?: string | null;
}) {
  await prisma.whatsAppConsentEvent.create({
    data: {
      businessId: input.businessId,
      contactId: input.contactId,
      type: input.type,
      source: input.source,
      note: input.note || null,
    },
  });
}

async function handleInboundMessages(connection: any, value: any) {
  const messages = Array.isArray(value.messages) ? value.messages : [];
  const contacts = Array.isArray(value.contacts) ? value.contacts : [];

  for (const message of messages) {
    if (!message?.id || !message?.from) continue;
    const phone = digitsOnly(message.from);
    if (phone.length < 8) continue;

    const existing = await prisma.whatsAppMessage.findUnique({
      where: { metaMessageId: String(message.id) },
      select: { id: true },
    });
    if (existing) continue;

    const profileName =
      contacts.find((c: any) => digitsOnly(c?.wa_id) === phone)?.profile?.name ||
      contacts[0]?.profile?.name ||
      null;
    const receivedAt = unixToDate(message.timestamp) || new Date();
    const text = extractInboundText(message).slice(0, 1000);

    const contact = await prisma.whatsAppContact.upsert({
      where: { businessId_phone: { businessId: connection.businessId, phone } },
      create: {
        businessId: connection.businessId,
        phone,
        name: profileName,
        lastInboundAt: receivedAt,
      },
      update: {
        lastInboundAt: receivedAt,
        ...(profileName ? { name: profileName } : {}),
      },
    });

    await prisma.whatsAppMessage.create({
      data: {
        businessId: connection.businessId,
        contactId: contact.id,
        metaMessageId: String(message.id),
        direction: "INBOUND",
        messageType: String(message.type || "text").toUpperCase(),
        status: "RECEIVED",
        bodyPreview: text,
        receivedAt,
        metadata: message.context?.id ? { replyToMessageId: String(message.context.id) } : undefined,
      },
    });

    // Simple, explicit keyword handling. A customer can always stop messages.
    const keyword = text.trim().toLowerCase();
    const isStop = ["stop", "stop all", "unsubscribe", "opt out", "opt-out"].includes(keyword);
    const isStart = ["start", "unstop", "resume", "opt in", "opt-in"].includes(keyword);

    if (isStop && contact.consentStatus !== "OPTED_OUT") {
      const now = new Date();
      await prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: {
          consentStatus: "OPTED_OUT",
          optOutAt: now,
          marketingOptIn: false,
          marketingOptOut: true,
          marketingOptOutAt: now,
        },
      });
      await recordConsent({
        businessId: connection.businessId,
        contactId: contact.id,
        type: "OPT_OUT",
        source: "inbound_keyword",
        note: `Customer sent "${text.trim()}"`,
      });
    } else if (isStart && contact.consentStatus !== "OPTED_IN") {
      await prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: {
          consentStatus: "OPTED_IN",
          consentAt: new Date(),
          optOutAt: null,
          // A service resume does not imply marketing consent. Only Meta's
          // marketing user_preferences event or an explicit checkbox does.
          marketingOptOut: false,
          marketingOptOutAt: null,
        },
      });
      await recordConsent({
        businessId: connection.businessId,
        contactId: contact.id,
        type: "OPT_IN",
        source: "inbound_keyword",
        note: `Customer sent "${text.trim()}"`,
      });
    }
  }
}

async function handleStatuses(connection: any, value: any) {
  const statuses = Array.isArray(value.statuses) ? value.statuses : [];

  for (const status of statuses) {
    if (!status?.id) continue;
    const message = await prisma.whatsAppMessage.findUnique({
      where: { metaMessageId: String(status.id) },
      select: { id: true, businessId: true, status: true },
    });
    if (!message || message.businessId !== connection.businessId) continue;

    const mapped =
      status.status === "sent"
        ? "SENT"
        : status.status === "delivered"
          ? "DELIVERED"
          : status.status === "read"
            ? "READ"
            : status.status === "failed"
              ? "FAILED"
              : null;
    if (!mapped) continue;

    const data: Record<string, any> = {};
    const currentRank = STATUS_RANK[message.status] ?? 0;
    const nextRank = STATUS_RANK[mapped] ?? 0;
    if (mapped === "FAILED" || nextRank >= currentRank) data.status = mapped;

    const when = unixToDate(status.timestamp);
    if (mapped === "DELIVERED" && when) data.deliveredAt = when;
    if (mapped === "READ" && when) data.readAt = when;
    if (mapped === "FAILED") {
      const error = Array.isArray(status.errors) ? status.errors[0] : null;
      data.errorCode = error?.code ? String(error.code) : null;
      data.errorMessage =
        error?.title ||
        error?.message ||
        error?.error_data?.details ||
        "WhatsApp delivery failed";

      // India prepaid accounts can accept a send and then reject it for
      // payment eligibility on the status webhook. Surface it immediately so
      // the owner sees the billing action instead of a silently missing message.
      if (String(data.errorCode) === "131042") {
        await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            lastError:
              "Meta payment issue: add or top up your payment method in Meta Billing to resume WhatsApp messages (error 131042).",
          },
        });
      }
    } else if (data.status) {
      data.errorCode = null;
      data.errorMessage = null;
      if (
        ["SENT", "DELIVERED", "READ"].includes(mapped) &&
        /131042|payment eligibility|payment method/i.test(String(connection.lastError || ""))
      ) {
        await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: { lastError: null },
        });
      }
    }

    if (status.pricing) data.pricing = status.pricing;
    if (status.conversation) {
      data.metadata = { conversation: status.conversation };
    }

    await prisma.whatsAppMessage.update({ where: { id: message.id }, data });
  }
}

/**
 * Coexistence: Meta streams the business's existing WhatsApp Business app
 * contacts here. They are imported with UNKNOWN consent, not opted in, so the
 * owner gets a ready contact book without manual typing while policy still
 * requires an explicit opt-in before any business-initiated message.
 */
async function handleSmbAppStateSync(connection: any, value: any) {
  const records = Array.isArray(value.state_sync) ? value.state_sync : [];
  for (const record of records) {
    if (String(record?.type || "") !== "contact") continue;
    if (String(record?.action || "add") !== "add") continue;
    const contact = record?.contact || {};
    const phone = digitsOnly(contact.phone_number);
    if (phone.length < 8) continue;
    const name = String(contact.full_name || contact.first_name || "").trim() || null;

    await prisma.whatsAppContact.upsert({
      where: { businessId_phone: { businessId: connection.businessId, phone } },
      create: {
        businessId: connection.businessId,
        phone,
        name,
        consentStatus: "UNKNOWN",
        consentSource: "whatsapp_business_app_sync",
      },
      update: {
        ...(name ? { name } : {}),
      },
    });
  }
}

/** Mirror messages the owner sends from the WhatsApp Business app into the inbox. */
async function handleSmbMessageEchoes(connection: any, value: any) {
  const echoes = Array.isArray(value.message_echoes) ? value.message_echoes : [];
  const contacts = Array.isArray(value.contacts) ? value.contacts : [];

  for (const echo of echoes) {
    if (!echo?.id || !echo?.to) continue;
    const echoType = String(echo.type || "");

    // Mirror edits and deletions of messages the owner sent from the business
    // app, so the BEYONDVYU inbox does not keep stale text.
    if (echoType === "revoke") {
      const originalId = echo.revoke?.original_message_id;
      if (originalId) {
        await prisma.whatsAppMessage.updateMany({
          where: { metaMessageId: String(originalId), businessId: connection.businessId },
          data: {
            bodyPreview: "[message deleted by business]",
            metadata: { source: "whatsapp_business_app", revoked: true },
          },
        });
      }
      continue;
    }
    if (echoType === "edit") {
      const originalId = echo.edit?.original_message_id;
      const edited = echo.edit?.message;
      if (originalId && edited) {
        await prisma.whatsAppMessage.updateMany({
          where: { metaMessageId: String(originalId), businessId: connection.businessId },
          data: {
            bodyPreview: extractInboundText(edited).slice(0, 1000),
            metadata: { source: "whatsapp_business_app", edited: true },
          },
        });
      }
      continue;
    }

    const phone = digitsOnly(echo.to);
    if (phone.length < 8) continue;

    const existing = await prisma.whatsAppMessage.findUnique({
      where: { metaMessageId: String(echo.id) },
      select: { id: true },
    });
    if (existing) continue;

    const profileName =
      contacts.find((c: any) => digitsOnly(c?.wa_id) === phone)?.profile?.name || null;
    const sentAt = unixToDate(echo.timestamp) || new Date();
    const text = extractInboundText(echo).slice(0, 1000);

    const contact = await prisma.whatsAppContact.upsert({
      where: { businessId_phone: { businessId: connection.businessId, phone } },
      create: {
        businessId: connection.businessId,
        phone,
        name: profileName,
        lastOutboundAt: sentAt,
      },
      update: {
        lastOutboundAt: sentAt,
        ...(profileName ? { name: profileName } : {}),
      },
    });

    await prisma.whatsAppMessage.create({
      data: {
        businessId: connection.businessId,
        contactId: contact.id,
        metaMessageId: String(echo.id),
        direction: "OUTBOUND",
        messageType: String(echo.type || "text").toUpperCase(),
        status: "SENT",
        bodyPreview: text,
        sentAt,
        metadata: { source: "whatsapp_business_app" },
      },
    });
  }
}

const DISCONNECTION_REASONS: Record<string, string> = {
  ACCOUNT_DISCONNECTED: "the business disconnected the account or Meta enforced a policy",
  BUSINESS_DOWNGRADE: "the number was registered on the consumer WhatsApp app",
  CHANGE_NUMBER: "the business changed its phone number",
  COMPANION_INACTIVITY: "the linked device was inactive for about 30 days",
  PRIMARY_INACTIVITY: "the WhatsApp Business app was inactive for about 14 days",
  USER_RE_REGISTERED: "the number was registered on a new device",
};

async function handleAccountUpdate(connection: any, value: any) {
  const event = String(value?.event || "").toUpperCase();
  if (!event) return;

  if (event === "PARTNER_REMOVED" || event === "ACCOUNT_OFFBOARDED") {
    const reasonCode = String(value?.disconnection_info?.reason || "").toUpperCase();
    const reason = DISCONNECTION_REASONS[reasonCode];
    await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: {
        status: "NEEDS_ATTENTION",
        lastError:
          event === "ACCOUNT_OFFBOARDED"
            ? "This number was disconnected from Cloud API in the WhatsApp Business app. Reconnect from Settings > Account > Business Platform, then reconnect here."
            : `Meta removed BEYONDVYU's access to this WhatsApp account${reason ? `: ${reason}` : ""}. Reconnect the business number to resume.`,
      },
    });
    return;
  }
  if (event === "ACCOUNT_RECONNECTED") {
    await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: { status: "CONNECTED", lastError: null },
    });
  }
}

async function handleUserPreferences(connection: any, value: any) {
  const preferences = Array.isArray(value.user_preferences) ? value.user_preferences : [];
  const contacts = Array.isArray(value.contacts) ? value.contacts : [];

  for (const preference of preferences) {
    if (String(preference?.category || "") !== "marketing_messages") continue;
    const phone =
      digitsOnly(preference?.wa_id) ||
      digitsOnly(contacts.find((c: any) => c?.user_id === preference?.user_id)?.wa_id);
    if (phone.length < 8) continue;

    const valueLower = String(preference?.value || "").toLowerCase();
    if (valueLower !== "stop" && valueLower !== "resume") continue;

    const contact = await prisma.whatsAppContact.upsert({
      where: { businessId_phone: { businessId: connection.businessId, phone } },
      create: {
        businessId: connection.businessId,
        phone,
        marketingOptIn: valueLower === "resume",
        marketingOptInAt: valueLower === "resume" ? new Date() : null,
        marketingOptOut: valueLower === "stop",
        marketingOptOutAt: valueLower === "stop" ? new Date() : null,
      },
      update: {
        marketingOptIn: valueLower === "resume",
        marketingOptInAt: valueLower === "resume" ? new Date() : null,
        marketingOptOut: valueLower === "stop",
        marketingOptOutAt: valueLower === "stop" ? new Date() : null,
      },
    });

    await recordConsent({
      businessId: connection.businessId,
      contactId: contact.id,
      type: valueLower === "stop" ? "MARKETING_OPT_OUT" : "MARKETING_OPT_IN",
      source: "meta_user_preferences",
      note: preference?.detail || null,
    });
  }
}

async function handleTemplateStatusUpdate(connection: any, value: any) {
  const metaTemplateId = value?.message_template_id ? String(value.message_template_id) : null;
  const name = value?.message_template_name ? String(value.message_template_name) : null;
  const language = value?.message_template_language ? String(value.message_template_language) : null;
  const event = value?.event ? String(value.event).toUpperCase() : null;
  if (!metaTemplateId && !name) return;

  const template = metaTemplateId
    ? await prisma.whatsAppTemplate.findUnique({ where: { metaTemplateId } })
    : await prisma.whatsAppTemplate.findFirst({
        where: {
          businessId: connection.businessId,
          ...(name ? { name } : {}),
          ...(language ? { language } : {}),
        },
      });
  if (!template || template.businessId !== connection.businessId) return;

  const data: Record<string, any> = { lastSyncedAt: new Date() };
  if (event) data.status = event;
  if (value?.message_template_category) {
    data.category = String(value.message_template_category).toUpperCase();
  }
  if (event === "REJECTED") {
    const info = value?.rejection_info || {};
    data.rejectedReason =
      [value?.reason, info?.reason, info?.recommendation].filter(Boolean).join(" — ") ||
      "Rejected by Meta";
  } else if (["APPROVED", "REINSTATED", "UNARCHIVED"].includes(String(event))) {
    data.rejectedReason = null;
  }
  if (value?.quality_score) data.qualityScore = value.quality_score;

  await prisma.whatsAppTemplate.update({ where: { id: template.id }, data });
}

export function verifyWhatsAppWebhook(req: Request, res: Response) {
  const env = getEnv();
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(503).send("Webhook verify token is not configured");
  }
  if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(String(challenge ?? ""));
  }
  return res.status(403).send("Forbidden");
}

export async function handleWhatsAppWebhook(req: Request, res: Response) {
  const env = getEnv();
  const signatureHeader = req.headers["x-hub-signature-256"];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(String(req.body ?? ""));

  // Fail closed: an unsigned webhook is never accepted.
  if (!env.WHATSAPP_APP_SECRET) {
    console.error("WhatsApp webhook rejected: WHATSAPP_APP_SECRET is not configured");
    return res.status(503).json({ error: "Webhook not configured" });
  }
  if (!verifyMetaSignature(rawBody, signature)) {
    console.error("WhatsApp webhook rejected: invalid X-Hub-Signature-256");
    return res.status(401).json({ error: "Invalid signature" });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (payload?.object !== "whatsapp_business_account") {
    return res.status(200).json({ status: "ignored" });
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  for (const entry of entries) {
    const entryWabaId = entry?.id ? String(entry.id) : null;
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change?.value || {};
      const field = String(change?.field || "");
      const phoneNumberId = value?.metadata?.phone_number_id
        ? String(value.metadata.phone_number_id)
        : null;

      try {
        // account_update can put the partner business ID in entry.id; the
        // client's Messaging account is then only in value.waba_info.waba_id.
        const wabaCandidates = [value?.waba_info?.waba_id, entryWabaId]
          .filter(Boolean)
          .map((candidate) => String(candidate));
        let connection: Awaited<ReturnType<typeof resolveConnection>> = null;
        for (const candidate of wabaCandidates) {
          connection = await resolveConnection(phoneNumberId, candidate);
          if (connection) break;
        }
        if (!connection) continue;

        if (Array.isArray(value.messages) && value.messages.length) {
          await handleInboundMessages(connection, value);
        }
        if (Array.isArray(value.statuses) && value.statuses.length) {
          await handleStatuses(connection, value);
        }
        if (Array.isArray(value.user_preferences) && value.user_preferences.length) {
          await handleUserPreferences(connection, value);
        }
        if (field === "smb_app_state_sync" || Array.isArray(value.state_sync)) {
          await handleSmbAppStateSync(connection, value);
        }
        if (field === "smb_message_echoes" || Array.isArray(value.message_echoes)) {
          await handleSmbMessageEchoes(connection, value);
        }
        if (field === "account_update" || value?.event) {
          await handleAccountUpdate(connection, value);
        }
        if (
          field === "message_template_status_update" ||
          field === "message_template_quality_update" ||
          value?.message_template_id
        ) {
          await handleTemplateStatusUpdate(connection, value);
        }
      } catch (err: any) {
        // Never log the raw payload: it contains customer phone numbers and
        // message text. Log only the high-level failure.
        console.error(`WhatsApp webhook processing error (${field || "unknown"}):`, err?.message || err);
      }
    }
  }

  return res.status(200).json({ status: "ok" });
}
