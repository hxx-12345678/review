import crypto from "crypto";
import { getEnv } from "../../config/env";

/**
 * Thin WhatsApp Business Platform (Cloud API) client.
 *
 * All calls are server-to-server. The client only receives short-lived
 * Embedded Signup codes, never business access tokens.
 */

export class MetaApiError extends Error {
  status: number;
  code?: number;
  subcode?: number;
  type?: string;
  fbtraceId?: string;

  constructor(message: string, status: number, details?: { code?: number; subcode?: number; type?: string; fbtraceId?: string }) {
    super(message);
    this.name = "MetaApiError";
    this.status = status;
    this.code = details?.code;
    this.subcode = details?.subcode;
    this.type = details?.type;
    this.fbtraceId = details?.fbtraceId;
  }
}

export interface MetaPhoneNumber {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  status?: string;
  code_verification_status?: string;
  platform_type?: string;
  /** True when the number is used by both the WhatsApp Business app and Cloud API. */
  is_on_biz_app?: boolean;
}

export interface MetaWaba {
  id?: string;
  name?: string;
  currency?: string;
  account_review_status?: string;
  timezone_id?: string;
  message_template_namespace?: string;
}

export interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: unknown[];
  rejected_reason?: string;
  quality_score?: unknown;
}

export function getWhatsAppPlatformConfig(): {
  configured: boolean;
  appId: string;
  configId: string;
  esVersion: string;
  esFeatureType: string;
  graphVersion: string;
  billingUrl: string;
  managerUrl: string;
} {
  const env = getEnv();
  return {
    configured: Boolean(env.WHATSAPP_APP_ID && env.WHATSAPP_APP_SECRET && env.WHATSAPP_ES_CONFIG_ID),
    appId: env.WHATSAPP_APP_ID,
    configId: env.WHATSAPP_ES_CONFIG_ID,
    esVersion: env.WHATSAPP_ES_VERSION,
    esFeatureType: env.WHATSAPP_ES_FEATURE_TYPE,
    graphVersion: env.WHATSAPP_API_VERSION,
    billingUrl: env.WHATSAPP_BILLING_URL,
    managerUrl: env.WHATSAPP_MANAGER_URL,
  };
}

function graphBase(): string {
  return `https://graph.facebook.com/${getEnv().WHATSAPP_API_VERSION}`;
}

async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function throwMetaError(res: Response, data: any): never {
  const err = data?.error || {};
  const message =
    typeof err.message === "string" && err.message
      ? err.message
      : `WhatsApp API request failed (HTTP ${res.status})`;
  throw new MetaApiError(message, res.status, {
    code: typeof err.code === "number" ? err.code : undefined,
    subcode: typeof err.error_subcode === "number" ? err.error_subcode : undefined,
    type: typeof err.type === "string" ? err.type : undefined,
    fbtraceId: typeof err.fbtrace_id === "string" ? err.fbtrace_id : undefined,
  });
}

async function graphFetch(path: string, token: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${graphBase()}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
    signal: AbortSignal.timeout(20000),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data?.error) throwMetaError(res, data);
  return data;
}

/**
 * Step 1 of Tech Provider onboarding: exchange the 30-second Embedded Signup
 * code for a Business Integration System User access token.
 */
export async function exchangeEmbeddedSignupCode(code: string): Promise<{
  accessToken: string;
  expiresIn: number | null;
  tokenType: string | null;
}> {
  const env = getEnv();
  if (!env.WHATSAPP_APP_ID || !env.WHATSAPP_APP_SECRET) {
    throw new MetaApiError(
      "WhatsApp Embedded Signup is not configured on this deployment",
      503,
    );
  }

  const params = new URLSearchParams({
    client_id: env.WHATSAPP_APP_ID,
    client_secret: env.WHATSAPP_APP_SECRET,
    code,
  });
  const res = await fetch(`${graphBase()}/oauth/access_token?${params.toString()}`, {
    method: "GET",
    signal: AbortSignal.timeout(20000),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data?.error) throwMetaError(res, data);
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new MetaApiError("Meta did not return a business access token", 502);
  }
  return {
    accessToken: data.access_token,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : null,
    tokenType: typeof data.token_type === "string" ? data.token_type : null,
  };
}

/** Step 2: subscribe our app to the customer's Messaging account webhooks. */
export async function subscribeAppToWaba(wabaId: string, token: string): Promise<void> {
  await graphFetch(`${encodeURIComponent(wabaId)}/subscribed_apps`, token, { method: "POST" });
}

/** Step 3: register the business phone number for Cloud API with a 6-digit PIN. */
export async function registerBusinessPhoneNumber(
  phoneNumberId: string,
  token: string,
  pin: string,
): Promise<void> {
  await graphFetch(`${encodeURIComponent(phoneNumberId)}/register`, token, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      pin,
    }),
  });
}

export async function getBusinessPhoneNumber(
  phoneNumberId: string,
  token: string,
): Promise<MetaPhoneNumber> {
  const fields = [
    "id",
    "display_phone_number",
    "verified_name",
    "quality_rating",
    "status",
    "code_verification_status",
    "platform_type",
    "is_on_biz_app",
  ].join(",");
  return graphFetch(
    `${encodeURIComponent(phoneNumberId)}?fields=${encodeURIComponent(fields)}`,
    token,
  );
}

/**
 * Coexistence Embedded Signup can return only the Messaging account ID. Resolve
 * the business phone number from the WABA's own phone_numbers edge.
 */
export async function listWabaPhoneNumbers(
  wabaId: string,
  token: string,
): Promise<MetaPhoneNumber[]> {
  const fields = [
    "id",
    "display_phone_number",
    "verified_name",
    "quality_rating",
    "status",
    "code_verification_status",
    "platform_type",
    "is_on_biz_app",
  ].join(",");
  const data = await graphFetch(
    `${encodeURIComponent(wabaId)}/phone_numbers?fields=${encodeURIComponent(fields)}&limit=25`,
    token,
  );
  return Array.isArray(data?.data) ? (data.data as MetaPhoneNumber[]) : [];
}

/**
 * Coexistence onboarding: ask Meta to stream the business's existing WhatsApp
 * Business app contacts to our webhook. These contacts are imported as
 * UNKNOWN consent, never as opted in. Must be called within 24 hours of
 * onboarding and only once per onboarding.
 */
export async function syncSmbAppContacts(phoneNumberId: string, token: string): Promise<void> {
  await graphFetch(`${encodeURIComponent(phoneNumberId)}/smb_app_data`, token, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      sync_type: "smb_app_state_sync",
    }),
  });
}

export async function getWaba(wabaId: string, token: string): Promise<MetaWaba> {
  const fields = [
    "id",
    "name",
    "currency",
    "account_review_status",
    "timezone_id",
    "message_template_namespace",
  ].join(",");
  return graphFetch(
    `${encodeURIComponent(wabaId)}?fields=${encodeURIComponent(fields)}`,
    token,
  );
}

/** List every template in the business's own Messaging account. */
export async function listMessageTemplates(wabaId: string, token: string): Promise<MetaTemplate[]> {
  const fields = [
    "id",
    "name",
    "language",
    "status",
    "category",
    "components",
    "rejected_reason",
    "quality_score",
  ].join(",");

  const templates: MetaTemplate[] = [];
  let after: string | undefined;

  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({ fields, limit: "100" });
    if (after) params.set("after", after);
    const data = await graphFetch(
      `${encodeURIComponent(wabaId)}/message_templates?${params.toString()}`,
      token,
    );
    if (Array.isArray(data.data)) templates.push(...(data.data as MetaTemplate[]));
    const nextAfter = data?.paging?.cursors?.after;
    if (!data?.paging?.next || !nextAfter) break;
    after = String(nextAfter);
  }

  return templates;
}

export async function createMessageTemplate(
  wabaId: string,
  token: string,
  payload: {
    name: string;
    language: string;
    category: string;
    parameter_format: "positional" | "named";
    components: unknown[];
  },
): Promise<{ id: string; status: string; category?: string }> {
  return graphFetch(`${encodeURIComponent(wabaId)}/message_templates`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Edit an existing template. Meta only allows edits to APPROVED, REJECTED, or
 * PAUSED templates and only permits category changes while a template is not
 * APPROVED. The name and language are immutable.
 */
export async function updateMessageTemplate(
  templateId: string,
  token: string,
  payload: {
    category?: string;
    parameter_format?: "positional" | "named";
    components: unknown[];
  },
): Promise<{ success: boolean }> {
  return graphFetch(`${encodeURIComponent(templateId)}`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  token: string,
  payload: {
    to: string;
    name: string;
    language: string;
    components?: unknown[];
  },
): Promise<{ messageId: string; raw: any }> {
  const data = await graphFetch(`${encodeURIComponent(phoneNumberId)}/messages`, token, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "template",
      template: {
        name: payload.name,
        language: { code: payload.language },
        ...(payload.components?.length ? { components: payload.components } : {}),
      },
    }),
  });
  const messageId = data?.messages?.[0]?.id;
  if (typeof messageId !== "string" || !messageId) {
    throw new MetaApiError("Meta accepted the request but returned no message ID", 502);
  }
  return { messageId, raw: data };
}

/**
 * Free-form text is only legal inside an open 24-hour customer service window.
 * Callers MUST verify `lastInboundAt` before using this.
 */
export async function sendTextMessage(
  phoneNumberId: string,
  token: string,
  to: string,
  body: string,
): Promise<{ messageId: string; raw: any }> {
  const data = await graphFetch(`${encodeURIComponent(phoneNumberId)}/messages`, token, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: body.slice(0, 4000) },
    }),
  });
  const messageId = data?.messages?.[0]?.id;
  if (typeof messageId !== "string" || !messageId) {
    throw new MetaApiError("Meta accepted the request but returned no message ID", 502);
  }
  return { messageId, raw: data };
}

/** Verify Meta's X-Hub-Signature-256 HMAC using the Meta app secret. */
export function verifyMetaSignature(rawBody: Buffer | string, signatureHeader: string | undefined): boolean {
  const env = getEnv();
  if (!env.WHATSAPP_APP_SECRET) return false;
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const provided = signatureHeader.slice("sha256=".length);
  const expected = crypto.createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
