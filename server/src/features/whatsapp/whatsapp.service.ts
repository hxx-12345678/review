import { randomUUID } from "crypto";
import { prisma } from "../../config/database";
import { getEnv } from "../../config/env";
import { decrypt, encrypt } from "../../utils/encryption";
import { normalizePhoneNumber } from "../../utils/phone";
import {
  createMessageTemplate,
  exchangeEmbeddedSignupCode,
  getBusinessPhoneNumber,
  getWaba,
  listMessageTemplates,
  registerBusinessPhoneNumber,
  sendTemplateMessage,
  sendTextMessage,
  subscribeAppToWaba,
  updateMessageTemplate,
} from "./whatsapp.meta";

export class WhatsAppServiceError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "WHATSAPP_ERROR") {
    super(message);
    this.name = "WhatsAppServiceError";
    this.status = status;
    this.code = code;
  }
}

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

const USE_CASES = [
  "REVIEW_REQUEST",
  "PAYMENT_REMINDER",
  "OFFER",
  "FEEDBACK",
  "OWNER_REPORT",
  "CUSTOM",
] as const;

export type WhatsAppUseCase = (typeof USE_CASES)[number];

export const AUTOMATION_TRIGGERS = ["FEEDBACK_RECEIVED", "OPT_IN_RECEIVED"] as const;
export type WhatsAppAutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_TOKENS = [
  "CUSTOMER_NAME",
  "BUSINESS_NAME",
  "REVIEW_URL",
  "RATING",
  "DATE",
] as const;

export type WhatsAppVariableMapping = { type: "TOKEN" | "TEXT"; value: string };

type AutomationContext = {
  customerName?: string | null;
  rating?: number | null;
  feedbackId?: string | null;
};

export const WHATSAPP_PRICING = {
  india: {
    currency: "INR",
    effectiveFrom: "2026-10-01",
    verifiedOn: "2026-11-17",
    freeServiceMessagesPerMonth: 1000,
    perDeliveredMessage: {
      MARKETING: 0.8631,
      UTILITY: 0.1150,
      AUTHENTICATION: 0.1150,
      SERVICE: 0.1150,
      AUTHENTICATION_INTERNATIONAL: 2.4971,
    },
    source: "https://developers.facebook.com/docs/whatsapp/pricing",
  },
  other: {
    currency: null,
    source: "https://developers.facebook.com/docs/whatsapp/pricing",
  },
} as const;

function serializeConnection(connection: any) {
  if (!connection) return null;
  return {
    id: connection.id,
    businessId: connection.businessId,
    wabaId: connection.wabaId,
    phoneNumberId: connection.phoneNumberId,
    businessPortfolioId: connection.businessPortfolioId,
    displayPhoneNumber: connection.displayPhoneNumber,
    verifiedName: connection.verifiedName,
    status: connection.status,
    tokenExpiresAt: connection.tokenExpiresAt,
    webhookSubscribed: connection.webhookSubscribed,
    numberRegistered: connection.numberRegistered,
    paymentMethodConfirmedAt: connection.paymentMethodConfirmedAt,
    qualityRating: connection.qualityRating,
    messagingLimitTier: connection.messagingLimitTier,
    lastSyncedAt: connection.lastSyncedAt,
    lastError: connection.lastError,
    connectedAt: connection.connectedAt,
  };
}

export function getConnectionToken(connection: {
  accessTokenCiphertext: string;
  accessTokenIv: string;
  accessTokenTag: string;
}): string {
  return decrypt({
    encrypted: connection.accessTokenCiphertext,
    iv: connection.accessTokenIv,
    tag: connection.accessTokenTag,
  });
}

export async function getBusinessConnection(businessId: string) {
  return prisma.whatsAppConnection.findUnique({ where: { businessId } });
}

async function requireBusinessConnection(businessId: string) {
  const connection = await getBusinessConnection(businessId);
  if (!connection) {
    throw new WhatsAppServiceError(
      "This business has not connected a WhatsApp Business number yet.",
      409,
      "WHATSAPP_NOT_CONNECTED",
    );
  }
  return { connection, token: getConnectionToken(connection) };
}

function digitsOnly(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

function assertMetaId(value: string, label: string): string {
  const id = String(value || "").trim();
  if (!/^\d{5,}$/.test(id)) {
    throw new WhatsAppServiceError(`Invalid ${label} returned by Meta.`, 400, "INVALID_META_ID");
  }
  return id;
}

export async function connectBusinessWhatsApp(input: {
  businessId: string;
  code: string;
  wabaId: string;
  phoneNumberId: string;
  businessPortfolioId?: string | null;
}): Promise<{ connection: ReturnType<typeof serializeConnection>; warnings: string[] }> {
  const wabaId = assertMetaId(input.wabaId, "WhatsApp Business Account ID");
  const phoneNumberId = assertMetaId(input.phoneNumberId, "phone number ID");
  const businessPortfolioId = input.businessPortfolioId
    ? assertMetaId(input.businessPortfolioId, "business portfolio ID")
    : null;

  const exchanged = await exchangeEmbeddedSignupCode(input.code);
  const token = exchanged.accessToken;

  const [phone, waba] = await Promise.all([
    getBusinessPhoneNumber(phoneNumberId, token),
    getWaba(wabaId, token).catch(() => null),
  ]);

  const warnings: string[] = [];
  let webhookSubscribed = false;
  try {
    await subscribeAppToWaba(wabaId, token);
    webhookSubscribed = true;
  } catch (err: any) {
    warnings.push(
      `Connected, but webhook subscription failed: ${err?.message || "unknown error"}. Retry Sync after checking the Meta app webhook.`,
    );
  }

  const secret = encrypt(token);
  const tokenExpiresAt = exchanged.expiresIn
    ? new Date(Date.now() + exchanged.expiresIn * 1000)
    : null;
  const connectionStatus =
    !phone.status || phone.status === "CONNECTED" ? "CONNECTED" : "NEEDS_ATTENTION";

  const existingForPhone = await prisma.whatsAppConnection.findUnique({
    where: { phoneNumberId },
    select: { businessId: true },
  });
  if (existingForPhone && existingForPhone.businessId !== input.businessId) {
    throw new WhatsAppServiceError(
      "This WhatsApp business number is already connected to another business in BEYONDVYU.",
      409,
      "PHONE_ALREADY_CONNECTED",
    );
  }

  const connection = await prisma.whatsAppConnection.upsert({
    where: { businessId: input.businessId },
    create: {
      businessId: input.businessId,
      wabaId,
      phoneNumberId,
      businessPortfolioId,
      displayPhoneNumber: phone.display_phone_number || null,
      verifiedName: phone.verified_name || null,
      status: connectionStatus,
      accessTokenCiphertext: secret.encrypted,
      accessTokenIv: secret.iv,
      accessTokenTag: secret.tag,
      tokenExpiresAt,
      webhookSubscribed,
      qualityRating: phone.quality_rating || null,
      lastSyncedAt: new Date(),
      lastError: warnings.length ? warnings.join(" ") : null,
    },
    update: {
      wabaId,
      phoneNumberId,
      businessPortfolioId,
      displayPhoneNumber: phone.display_phone_number || null,
      verifiedName: phone.verified_name || null,
      status: connectionStatus,
      accessTokenCiphertext: secret.encrypted,
      accessTokenIv: secret.iv,
      accessTokenTag: secret.tag,
      tokenExpiresAt,
      webhookSubscribed,
      qualityRating: phone.quality_rating || null,
      lastSyncedAt: new Date(),
      lastError: warnings.length ? warnings.join(" ") : null,
    },
  });

  // Pull templates immediately so the owner can see approval status.
  try {
    await syncBusinessTemplates(input.businessId);
  } catch (err: any) {
    warnings.push(`Templates could not be synced yet: ${err?.message || "unknown error"}`);
  }

  return { connection: serializeConnection(connection), warnings };
}

export async function syncBusinessConnection(businessId: string): Promise<{
  connection: ReturnType<typeof serializeConnection>;
  templateCount: number;
  warnings: string[];
}> {
  const { connection, token } = await requireBusinessConnection(businessId);
  const warnings: string[] = [];

  const [phone, waba] = await Promise.all([
    getBusinessPhoneNumber(connection.phoneNumberId, token),
    getWaba(connection.wabaId, token).catch(() => null),
  ]);

  const connectionStatus =
    !phone.status || phone.status === "CONNECTED" ? "CONNECTED" : "NEEDS_ATTENTION";

  const updated = await prisma.whatsAppConnection.update({
    where: { id: connection.id },
    data: {
      displayPhoneNumber: phone.display_phone_number || connection.displayPhoneNumber,
      verifiedName: phone.verified_name || connection.verifiedName,
      qualityRating: phone.quality_rating || connection.qualityRating,
      status: connectionStatus,
      lastSyncedAt: new Date(),
      lastError: null,
    },
  });

  let templateCount = 0;
  try {
    const result = await syncBusinessTemplates(businessId);
    templateCount = result.synced;
  } catch (err: any) {
    warnings.push(err?.message || "Template sync failed");
  }

  if (waba?.currency) {
    warnings.push(`Meta billing currency for this account: ${waba.currency}.`);
  }

  return {
    connection: serializeConnection(updated),
    templateCount,
    warnings,
  };
}

export async function registerConnectedPhoneNumber(
  businessId: string,
  pin: string,
): Promise<{ numberRegistered: boolean }> {
  if (!/^\d{6}$/.test(pin)) {
    throw new WhatsAppServiceError(
      "Enter the 6-digit two-step verification PIN for this WhatsApp number.",
      400,
      "INVALID_PIN",
    );
  }

  const { connection, token } = await requireBusinessConnection(businessId);

  try {
    await registerBusinessPhoneNumber(connection.phoneNumberId, token, pin);
  } catch (err: any) {
    const message = String(err?.message || "").toLowerCase();
    if (message.includes("already registered") || message.includes("already been registered")) {
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { numberRegistered: true, lastError: null },
      });
      return { numberRegistered: true };
    }
    throw new WhatsAppServiceError(
      `Meta could not register this number: ${err?.message || "unknown error"}`,
      502,
      "REGISTER_FAILED",
    );
  }

  await prisma.whatsAppConnection.update({
    where: { id: connection.id },
    data: { numberRegistered: true, lastError: null },
  });
  return { numberRegistered: true };
}

export async function confirmPaymentMethod(businessId: string): Promise<void> {
  await prisma.whatsAppConnection.update({
    where: { businessId },
    data: { paymentMethodConfirmedAt: new Date() },
  });
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                  */
/* -------------------------------------------------------------------------- */

export function countPlaceholders(text: string): { count: number; error?: string } {
  const matches = [...String(text || "").matchAll(/\{\{\s*(\d+)\s*\}\}/g)];
  if (matches.length === 0) return { count: 0 };

  const numbers = matches.map((m) => Number(m[1])).sort((a, b) => a - b);
  const unique = [...new Set(numbers)];
  for (let i = 0; i < unique.length; i++) {
    if (unique[i] !== i + 1) {
      return {
        count: unique.length,
        error: "Template variables must be numbered continuously starting at {{1}} (for example {{1}}, {{2}}).",
      };
    }
  }
  return { count: unique.length };
}

export function validateTemplatePolicy(input: {
  category: string;
  useCase?: string | null;
  bodyText: string;
}): void {
  const category = String(input.category || "").toUpperCase();
  const useCase = String(input.useCase || "CUSTOM").toUpperCase();

  if (!["MARKETING", "UTILITY", "AUTHENTICATION"].includes(category)) {
    throw new WhatsAppServiceError("Choose a valid Meta template category.", 400, "INVALID_CATEGORY");
  }

  if (useCase === "OFFER" && category !== "MARKETING") {
    throw new WhatsAppServiceError(
      "Offers and promotions must use the Marketing category. Meta rejects promotional content submitted as Utility.",
      400,
      "CATEGORY_MISMATCH",
    );
  }
  if (["PAYMENT_REMINDER", "OWNER_REPORT"].includes(useCase) && category !== "UTILITY") {
    throw new WhatsAppServiceError(
      "Payment reminders and owner reports must use the Utility category and must be non-promotional.",
      400,
      "CATEGORY_MISMATCH",
    );
  }
  if (useCase === "AUTHENTICATION" && category !== "AUTHENTICATION") {
    throw new WhatsAppServiceError(
      "Authentication templates must use the Authentication category.",
      400,
      "CATEGORY_MISMATCH",
    );
  }

  // Meta may reclassify a generic review ask or survey as Marketing. Rather than
  // pretending every review request is a Utility message, allow either category
  // and let the business pay the correct rate. Marketing sends still require
  // separate marketing opt-in at send time.
  if (useCase === "REVIEW_REQUEST") {
    const incentivePattern =
      /\b(discount|coupon|voucher|cashback|incentive|reward|gift|freebie|five[\s-]?star|5[\s-]?star|positive review|only if you had a good experience)\b/i;
    if (incentivePattern.test(input.bodyText)) {
      throw new WhatsAppServiceError(
        "Review-request templates cannot offer incentives or ask only for positive reviews. Google and Meta policies prohibit gating or rewarding reviews.",
        400,
        "REVIEW_POLICY_VIOLATION",
      );
    }
  }

  if (category === "UTILITY" && ["REVIEW_REQUEST", "FEEDBACK"].includes(useCase)) {
    if (countPlaceholders(input.bodyText).count === 0) {
      throw new WhatsAppServiceError(
        "A Utility review or feedback template must reference the specific visit, order, or request with at least one variable. Otherwise Meta may treat it as Marketing.",
        400,
        "CATEGORY_MISMATCH",
      );
    }
  }
}

export function buildTemplateComponents(input: {
  headerText?: string | null;
  bodyText: string;
  footerText?: string | null;
  bodyExamples?: string[];
  headerExample?: string;
}): {
  components: unknown[];
  parameterCount: number;
  headerParameterCount: number;
} {
  const bodyText = String(input.bodyText || "").trim();
  if (!bodyText) {
    throw new WhatsAppServiceError("Template body text is required.", 400, "INVALID_TEMPLATE");
  }
  if (bodyText.length > 1024) {
    throw new WhatsAppServiceError("Template body text must be 1024 characters or fewer.", 400, "INVALID_TEMPLATE");
  }

  const body = countPlaceholders(bodyText);
  if (body.error) throw new WhatsAppServiceError(body.error, 400, "INVALID_TEMPLATE");

  const headerText = String(input.headerText || "").trim();
  if (headerText.length > 60) {
    throw new WhatsAppServiceError("Template header must be 60 characters or fewer.", 400, "INVALID_TEMPLATE");
  }
  const header = countPlaceholders(headerText);
  if (header.error) throw new WhatsAppServiceError(header.error, 400, "INVALID_TEMPLATE");
  if (header.count > 1) {
    throw new WhatsAppServiceError("A text header supports only one variable.", 400, "INVALID_TEMPLATE");
  }

  const footerText = String(input.footerText || "").trim();
  if (footerText.length > 60) {
    throw new WhatsAppServiceError("Template footer must be 60 characters or fewer.", 400, "INVALID_TEMPLATE");
  }

  const bodyExamples = (input.bodyExamples || []).map((v) => String(v || "").trim()).filter(Boolean);
  if (body.count > 0 && bodyExamples.length < body.count) {
    throw new WhatsAppServiceError(
      `Provide ${body.count} example value(s) for the body variables. Meta requires examples before it will review the template.`,
      400,
      "MISSING_EXAMPLES",
    );
  }

  const components: unknown[] = [];
  if (headerText) {
    components.push({
      type: "header",
      format: "TEXT",
      text: headerText,
      ...(header.count > 0
        ? { example: { header_text: [String(input.headerExample || "Example")] } }
        : {}),
    });
  }

  components.push({
    type: "body",
    text: bodyText,
    ...(body.count > 0 ? { example: { body_text: [bodyExamples.slice(0, body.count)] } } : {}),
  });

  if (footerText) {
    components.push({ type: "footer", text: footerText });
  }

  return {
    components,
    parameterCount: body.count,
    headerParameterCount: header.count,
  };
}

function getMetaComponent(components: unknown[] | undefined, type: string): any {
  if (!Array.isArray(components)) return null;
  return components.find((c: any) => String(c?.type || "").toUpperCase() === type) || null;
}

function inferUseCaseFromName(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("review")) return "REVIEW_REQUEST";
  if (n.includes("payment") || n.includes("reminder")) return "PAYMENT_REMINDER";
  if (n.includes("offer") || n.includes("promo")) return "OFFER";
  if (n.includes("feedback")) return "FEEDBACK";
  if (n.includes("owner") || n.includes("digest") || n.includes("report")) return "OWNER_REPORT";
  return null;
}

export async function syncBusinessTemplates(businessId: string): Promise<{ synced: number }> {
  const { connection, token } = await requireBusinessConnection(businessId);
  const remote = await listMessageTemplates(connection.wabaId, token);

  let synced = 0;
  for (const template of remote) {
    if (!template?.id || !template?.name || !template?.language) continue;

    const byMeta = await prisma.whatsAppTemplate.findUnique({
      where: { metaTemplateId: template.id },
    });
    if (byMeta && byMeta.businessId !== businessId) continue;

    const existing =
      byMeta ||
      (await prisma.whatsAppTemplate.findFirst({
        where: {
          businessId,
          name: template.name,
          language: template.language,
        },
      }));

    const components = Array.isArray(template.components) ? template.components : [];
    const bodyComponent = getMetaComponent(components, "BODY");
    const headerComponent = getMetaComponent(components, "HEADER");
    const footerComponent = getMetaComponent(components, "FOOTER");
    const bodyText = typeof bodyComponent?.text === "string" ? bodyComponent.text : null;
    const headerText =
      String(headerComponent?.format || "").toUpperCase() === "TEXT" &&
      typeof headerComponent?.text === "string"
        ? headerComponent.text
        : null;
    const footerText = typeof footerComponent?.text === "string" ? footerComponent.text : null;

    const bodyCount = bodyText ? countPlaceholders(bodyText).count : 0;
    const headerCount = headerText ? countPlaceholders(headerText).count : 0;

    const data = {
      metaTemplateId: template.id,
      name: template.name,
      language: template.language,
      category: String(template.category || "MARKETING").toUpperCase(),
      status: String(template.status || "PENDING").toUpperCase(),
      useCase: existing?.useCase ?? inferUseCaseFromName(template.name),
      headerText,
      bodyText,
      footerText,
      parameterFormat: "POSITIONAL",
      parameterCount: bodyCount,
      headerParameterCount: headerCount,
      components: components as any,
      rejectedReason: template.rejected_reason || null,
      qualityScore: (template.quality_score as any) ?? null,
      lastSyncedAt: new Date(),
    };

    if (existing) {
      await prisma.whatsAppTemplate.update({ where: { id: existing.id }, data });
    } else {
      await prisma.whatsAppTemplate.create({ data: { businessId, ...data } });
    }
    synced++;
  }

  return { synced };
}

export async function createBusinessTemplate(
  businessId: string,
  input: {
    name: string;
    language?: string;
    category: string;
    useCase?: string;
    headerText?: string;
    bodyText: string;
    footerText?: string;
    bodyExamples?: string[];
    headerExample?: string;
  },
) {
  const { connection, token } = await requireBusinessConnection(businessId);

  const name = String(input.name || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{1,512}$/.test(name)) {
    throw new WhatsAppServiceError(
      "Template name must use lowercase letters, numbers, and underscores only.",
      400,
      "INVALID_TEMPLATE_NAME",
    );
  }
  const language = String(input.language || "en").trim() || "en";
  const category = String(input.category || "").toUpperCase();
  const useCase = String(input.useCase || "CUSTOM").toUpperCase();
  if (!USE_CASES.includes(useCase as WhatsAppUseCase)) {
    throw new WhatsAppServiceError("Choose a valid template purpose.", 400, "INVALID_USE_CASE");
  }

  validateTemplatePolicy({ category, useCase, bodyText: input.bodyText });
  const built = buildTemplateComponents(input);

  let created: { id: string; status: string; category?: string };
  try {
    created = await createMessageTemplate(connection.wabaId, token, {
      name,
      language,
      category: category.toLowerCase(),
      parameter_format: "positional",
      components: built.components,
    });
  } catch (err: any) {
    throw new WhatsAppServiceError(
      `Meta rejected the template request: ${err?.message || "unknown error"}`,
      502,
      "TEMPLATE_CREATE_FAILED",
    );
  }

  const template = await prisma.whatsAppTemplate.create({
    data: {
      businessId,
      metaTemplateId: created.id,
      name,
      language,
      category,
      status: String(created.status || "PENDING").toUpperCase(),
      useCase,
      headerText: input.headerText?.trim() || null,
      bodyText: input.bodyText.trim(),
      footerText: input.footerText?.trim() || null,
      parameterFormat: "POSITIONAL",
      parameterCount: built.parameterCount,
      headerParameterCount: built.headerParameterCount,
      components: built.components as any,
      lastSyncedAt: new Date(),
    },
  });

  return template;
}

export async function updateBusinessTemplate(
  businessId: string,
  templateId: string,
  input: {
    category?: string;
    useCase?: string;
    headerText?: string;
    bodyText: string;
    footerText?: string;
    bodyExamples?: string[];
    headerExample?: string;
  },
) {
  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: templateId, businessId },
  });
  if (!template) throw new WhatsAppServiceError("Template not found.", 404, "TEMPLATE_NOT_FOUND");
  if (!template.metaTemplateId) {
    throw new WhatsAppServiceError(
      "This template has not been submitted to Meta yet.",
      409,
      "TEMPLATE_NOT_SUBMITTED",
    );
  }
  if (!["APPROVED", "REJECTED", "PAUSED"].includes(template.status)) {
    throw new WhatsAppServiceError(
      "Meta only allows edits to approved, rejected, or paused templates. Sync the template status first.",
      409,
      "TEMPLATE_NOT_EDITABLE",
    );
  }

  const category = String(input.category || template.category).toUpperCase();
  if (template.status === "APPROVED" && category !== template.category) {
    throw new WhatsAppServiceError(
      "Meta does not allow the category of an approved template to be changed. Create a new template instead.",
      400,
      "CATEGORY_CHANGE_NOT_ALLOWED",
    );
  }
  const useCase = String(input.useCase || template.useCase || "CUSTOM").toUpperCase();
  if (!USE_CASES.includes(useCase as WhatsAppUseCase)) {
    throw new WhatsAppServiceError("Choose a valid template purpose.", 400, "INVALID_USE_CASE");
  }

  validateTemplatePolicy({ category, useCase, bodyText: input.bodyText });
  const built = buildTemplateComponents(input);
  const { token } = await requireBusinessConnection(businessId);

  try {
    await updateMessageTemplate(template.metaTemplateId, token, {
      ...(template.status === "APPROVED" ? {} : { category: category.toLowerCase() }),
      parameter_format: "positional",
      components: built.components,
    });
  } catch (err: any) {
    throw new WhatsAppServiceError(
      `Meta rejected the template edit: ${err?.message || "unknown error"}`,
      502,
      "TEMPLATE_UPDATE_FAILED",
    );
  }

  // Re-review is asynchronous. Treat the template as pending so a stale
  // APPROVED row cannot be used to send content Meta has not re-approved.
  return prisma.whatsAppTemplate.update({
    where: { id: template.id },
    data: {
      category,
      useCase,
      headerText: input.headerText?.trim() || null,
      bodyText: input.bodyText.trim(),
      footerText: input.footerText?.trim() || null,
      parameterFormat: "POSITIONAL",
      parameterCount: built.parameterCount,
      headerParameterCount: built.headerParameterCount,
      components: built.components as any,
      status: "PENDING",
      rejectedReason: null,
      lastSyncedAt: new Date(),
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Contacts and consent                                                       */
/* -------------------------------------------------------------------------- */

async function businessDefaultCountry(businessId: string): Promise<"IN" | "US"> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { country: true },
  });
  return business?.country === "US" ? "US" : "IN";
}

export function normalizeWhatsAppPhone(raw: string, country: "IN" | "US"): string {
  const normalized = normalizePhoneNumber(raw, country);
  if (!normalized.isValid) {
    throw new WhatsAppServiceError("Enter a valid mobile number with country code.", 400, "INVALID_PHONE");
  }
  return normalized.digits;
}

export async function upsertContactWithConsent(input: {
  businessId: string;
  phone: string;
  name?: string | null;
  source?: string;
  note?: string | null;
  consentConfirmed: boolean;
  marketingConsent?: boolean;
}) {
  if (!input.consentConfirmed) {
    throw new WhatsAppServiceError(
      "You must confirm that this customer gave permission to receive WhatsApp messages from this business.",
      400,
      "CONSENT_REQUIRED",
    );
  }

  const country = await businessDefaultCountry(input.businessId);
  const phone = normalizeWhatsAppPhone(input.phone, country);
  const now = new Date();
  const marketingConsent = input.marketingConsent === true;

  const contact = await prisma.whatsAppContact.upsert({
    where: { businessId_phone: { businessId: input.businessId, phone } },
    create: {
      businessId: input.businessId,
      phone,
      name: input.name?.trim() || null,
      consentStatus: "OPTED_IN",
      consentSource: input.source || "owner_attested",
      consentAt: now,
      marketingOptIn: marketingConsent,
      marketingOptInAt: marketingConsent ? now : null,
    },
    update: {
      name: input.name?.trim() || undefined,
      consentStatus: "OPTED_IN",
      consentSource: input.source || "owner_attested",
      consentAt: now,
      optOutAt: null,
      // Never infer marketing consent from a service opt-in. Only an explicit
      // marketing checkbox or Meta's user_preferences event turns it on.
      ...(marketingConsent
        ? { marketingOptIn: true, marketingOptInAt: now, marketingOptOut: false, marketingOptOutAt: null }
        : {}),
    },
  });

  await prisma.whatsAppConsentEvent.create({
    data: {
      businessId: input.businessId,
      contactId: contact.id,
      type: "OPT_IN",
      source: input.source || "owner_attested",
      note: input.note || "Customer confirmed WhatsApp opt-in",
    },
  });

  if (marketingConsent) {
    await prisma.whatsAppConsentEvent.create({
      data: {
        businessId: input.businessId,
        contactId: contact.id,
        type: "MARKETING_OPT_IN",
        source: input.source || "owner_attested",
        note: "Customer separately consented to offers and promotions",
      },
    });
  }

  return contact;
}

export async function setContactOptOut(businessId: string, contactId: string, note?: string) {
  const contact = await prisma.whatsAppContact.findFirst({
    where: { id: contactId, businessId },
  });
  if (!contact) throw new WhatsAppServiceError("Contact not found.", 404, "CONTACT_NOT_FOUND");

  const updated = await prisma.whatsAppContact.update({
    where: { id: contact.id },
    data: {
      consentStatus: "OPTED_OUT",
      optOutAt: new Date(),
      marketingOptIn: false,
      marketingOptOut: true,
      marketingOptOutAt: new Date(),
    },
  });
  await prisma.whatsAppConsentEvent.create({
    data: {
      businessId,
      contactId: contact.id,
      type: "OPT_OUT",
      source: "owner",
      note: note || "Opted out by business owner",
    },
  });
  return updated;
}

/* -------------------------------------------------------------------------- */
/* Sending                                                                    */
/* -------------------------------------------------------------------------- */

function buildSendComponents(
  template: { parameterCount: number; headerParameterCount: number },
  variables: string[],
  headerVariables: string[],
): unknown[] {
  const bodyVariables = (variables || []).map((v) => String(v ?? "").trim());
  const headVariables = (headerVariables || []).map((v) => String(v ?? "").trim());

  if (template.parameterCount > 0 && bodyVariables.length !== template.parameterCount) {
    throw new WhatsAppServiceError(
      `This template needs ${template.parameterCount} body variable value(s).`,
      400,
      "VARIABLE_COUNT_MISMATCH",
    );
  }
  if (template.parameterCount === 0 && bodyVariables.length > 0) {
    throw new WhatsAppServiceError(
      "This template has no body variables, so remove the extra values.",
      400,
      "VARIABLE_COUNT_MISMATCH",
    );
  }
  if (template.headerParameterCount > 0 && headVariables.length !== template.headerParameterCount) {
    throw new WhatsAppServiceError(
      "This template needs a header variable value.",
      400,
      "VARIABLE_COUNT_MISMATCH",
    );
  }
  if (template.headerParameterCount === 0 && headVariables.length > 0) {
    throw new WhatsAppServiceError(
      "This template has no header variable, so remove the extra value.",
      400,
      "VARIABLE_COUNT_MISMATCH",
    );
  }
  if (bodyVariables.some((value) => !value)) {
    throw new WhatsAppServiceError(
      "Fill in every body variable value before sending.",
      400,
      "VARIABLE_COUNT_MISMATCH",
    );
  }
  if (headVariables.some((value) => !value)) {
    throw new WhatsAppServiceError(
      "Fill in the header variable value before sending.",
      400,
      "VARIABLE_COUNT_MISMATCH",
    );
  }

  const components: unknown[] = [];
  if (template.headerParameterCount > 0) {
    components.push({
      type: "header",
      parameters: headVariables.map((text) => ({ type: "text", text })),
    });
  }
  if (template.parameterCount > 0) {
    components.push({
      type: "body",
      parameters: bodyVariables.map((text) => ({ type: "text", text })),
    });
  }
  return components;
}

function renderPreview(
  bodyText: string | null | undefined,
  variables: string[],
): string {
  let text = String(bodyText || "");
  (variables || []).forEach((value, index) => {
    text = text.split(`{{${index + 1}}}`).join(String(value || ""));
  });
  return text.slice(0, 500);
}

export async function sendTemplateToContact(input: {
  businessId: string;
  contactId: string;
  templateId: string;
  variables?: string[];
  headerVariables?: string[];
}) {
  const [contact, template] = await Promise.all([
    prisma.whatsAppContact.findFirst({
      where: { id: input.contactId, businessId: input.businessId },
    }),
    prisma.whatsAppTemplate.findFirst({
      where: { id: input.templateId, businessId: input.businessId },
    }),
  ]);

  if (!contact) throw new WhatsAppServiceError("Contact not found.", 404, "CONTACT_NOT_FOUND");
  if (!template) throw new WhatsAppServiceError("Template not found.", 404, "TEMPLATE_NOT_FOUND");

  if (contact.consentStatus !== "OPTED_IN") {
    throw new WhatsAppServiceError(
      "This customer has not opted in to WhatsApp messages from this business.",
      409,
      "CONSENT_REQUIRED",
    );
  }
  if (template.category === "MARKETING" && (!contact.marketingOptIn || contact.marketingOptOut)) {
    throw new WhatsAppServiceError(
      "This customer has not opted in to marketing messages from this business. Use a Utility or service message instead.",
      409,
      "MARKETING_OPT_OUT",
    );
  }
  if (template.status !== "APPROVED") {
    throw new WhatsAppServiceError(
      `This template is ${template.status.toLowerCase()} at Meta. Only approved templates can be sent.`,
      409,
      "TEMPLATE_NOT_APPROVED",
    );
  }

  const variables = input.variables || [];
  const headerVariables = input.headerVariables || [];
  const components = buildSendComponents(template, variables, headerVariables);
  const { connection, token } = await requireBusinessConnection(input.businessId);

  const message = await prisma.whatsAppMessage.create({
    data: {
      businessId: input.businessId,
      contactId: contact.id,
      direction: "OUTBOUND",
      messageType: "TEMPLATE",
      templateId: template.id,
      templateName: template.name,
      templateLanguage: template.language,
      templateCategory: template.category,
      status: "QUEUED",
      bodyPreview: renderPreview(template.bodyText, variables),
    },
  });

  try {
    const result = await sendTemplateMessage(connection.phoneNumberId, token, {
      to: contact.phone,
      name: template.name,
      language: template.language,
      components,
    });

    const updated = await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        metaMessageId: result.messageId,
        status: "SENT",
        sentAt: new Date(),
      },
    });
    await prisma.whatsAppContact.update({
      where: { id: contact.id },
      data: { lastOutboundAt: new Date() },
    });

    return updated;
  } catch (err: any) {
    const errorMessage = err?.message || "WhatsApp send failed";
    await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        status: "FAILED",
        errorCode: err?.code ? String(err.code) : null,
        errorMessage,
      },
    });
    throw new WhatsAppServiceError(errorMessage, 502, "SEND_FAILED");
  }
}

export async function sendTextReply(input: {
  businessId: string;
  contactId: string;
  text: string;
}) {
  const contact = await prisma.whatsAppContact.findFirst({
    where: { id: input.contactId, businessId: input.businessId },
  });
  if (!contact) throw new WhatsAppServiceError("Contact not found.", 404, "CONTACT_NOT_FOUND");
  if (contact.consentStatus === "OPTED_OUT") {
    throw new WhatsAppServiceError(
      "This customer opted out. Do not send them further messages.",
      409,
      "CONSENT_REQUIRED",
    );
  }

  const now = Date.now();
  const lastInbound = contact.lastInboundAt?.getTime() ?? 0;
  if (!lastInbound || now - lastInbound > SERVICE_WINDOW_MS) {
    throw new WhatsAppServiceError(
      "The 24-hour customer service window is closed. Use an approved template instead of free-form text.",
      409,
      "SERVICE_WINDOW_CLOSED",
    );
  }

  const text = String(input.text || "").trim();
  if (!text) throw new WhatsAppServiceError("Message text is required.", 400, "INVALID_MESSAGE");

  const { connection, token } = await requireBusinessConnection(input.businessId);
  const message = await prisma.whatsAppMessage.create({
    data: {
      businessId: input.businessId,
      contactId: contact.id,
      direction: "OUTBOUND",
      messageType: "TEXT",
      status: "QUEUED",
      bodyPreview: text.slice(0, 500),
    },
  });

  try {
    const result = await sendTextMessage(connection.phoneNumberId, token, contact.phone, text);
    const updated = await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        metaMessageId: result.messageId,
        status: "SENT",
        sentAt: new Date(),
      },
    });
    await prisma.whatsAppContact.update({
      where: { id: contact.id },
      data: { lastOutboundAt: new Date() },
    });
    return updated;
  } catch (err: any) {
    await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        status: "FAILED",
        errorCode: err?.code ? String(err.code) : null,
        errorMessage: err?.message || "WhatsApp send failed",
      },
    });
    throw new WhatsAppServiceError(err?.message || "WhatsApp send failed", 502, "SEND_FAILED");
  }
}

export async function scheduleTemplateAutomation(input: {
  businessId: string;
  contactId: string;
  templateId: string;
  variables?: string[];
  headerVariables?: string[];
  purpose?: string;
  scheduledAt: Date;
  createdBy?: string;
}) {
  const [contact, template] = await Promise.all([
    prisma.whatsAppContact.findFirst({
      where: { id: input.contactId, businessId: input.businessId },
    }),
    prisma.whatsAppTemplate.findFirst({
      where: { id: input.templateId, businessId: input.businessId },
    }),
  ]);
  if (!contact) throw new WhatsAppServiceError("Contact not found.", 404, "CONTACT_NOT_FOUND");
  if (!template) throw new WhatsAppServiceError("Template not found.", 404, "TEMPLATE_NOT_FOUND");
  if (contact.consentStatus !== "OPTED_IN") {
    throw new WhatsAppServiceError(
      "This customer has not opted in to WhatsApp messages from this business.",
      409,
      "CONSENT_REQUIRED",
    );
  }
  if (template.status !== "APPROVED") {
    throw new WhatsAppServiceError("Only approved templates can be scheduled.", 409, "TEMPLATE_NOT_APPROVED");
  }
  if (template.category === "MARKETING" && (!contact.marketingOptIn || contact.marketingOptOut)) {
    throw new WhatsAppServiceError(
      "This customer has not opted in to marketing messages from this business.",
      409,
      "MARKETING_OPT_OUT",
    );
  }

  // Validate variable counts before storing the schedule.
  buildSendComponents(template, input.variables || [], input.headerVariables || []);

  if (!Number.isFinite(input.scheduledAt.getTime())) {
    throw new WhatsAppServiceError("Choose a valid schedule date and time.", 400, "INVALID_SCHEDULE");
  }
  if (input.scheduledAt.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000) {
    throw new WhatsAppServiceError("Schedules can be at most one year ahead.", 400, "INVALID_SCHEDULE");
  }

  return prisma.whatsAppAutomation.create({
    data: {
      businessId: input.businessId,
      contactId: input.contactId,
      templateId: input.templateId,
      variables: input.variables || [],
      headerVariables: input.headerVariables || [],
      purpose: input.purpose || template.useCase || null,
      scheduledAt: input.scheduledAt,
      createdBy: input.createdBy || null,
    },
  });
}

export async function cancelAutomation(businessId: string, automationId: string) {
  const automation = await prisma.whatsAppAutomation.findFirst({
    where: { id: automationId, businessId },
  });
  if (!automation) throw new WhatsAppServiceError("Scheduled message not found.", 404, "NOT_FOUND");
  if (automation.status !== "SCHEDULED") {
    throw new WhatsAppServiceError("Only scheduled messages can be cancelled.", 409, "NOT_CANCELLABLE");
  }
  return prisma.whatsAppAutomation.update({
    where: { id: automation.id },
    data: { status: "CANCELLED" },
  });
}

function normalizeVariableMap(value: unknown): WhatsAppVariableMapping[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new WhatsAppServiceError("Variable mapping must be an array.", 400, "INVALID_VARIABLE_MAP");
  }
  return value.slice(0, 10).map((entry: any) => {
    const type = String(entry?.type || "").toUpperCase() === "TEXT" ? "TEXT" : "TOKEN";
    const tokenOrText = String(entry?.value || "").trim();
    if (type === "TOKEN" && !AUTOMATION_TOKENS.includes(tokenOrText as any)) {
      throw new WhatsAppServiceError(
        "Choose a valid automation value for each template variable.",
        400,
        "INVALID_VARIABLE_MAP",
      );
    }
    if (type === "TEXT" && !tokenOrText) {
      throw new WhatsAppServiceError(
        "Fixed variable text cannot be empty.",
        400,
        "INVALID_VARIABLE_MAP",
      );
    }
    return { type, value: tokenOrText };
  });
}

function resolveAutomationValue(
  entry: WhatsAppVariableMapping,
  context: {
    business: { name: string; slug: string; googleReviewUrl?: string | null };
    contact: { name?: string | null };
    automation?: AutomationContext;
  },
): string {
  if (entry.type === "TEXT") return entry.value;
  switch (entry.value) {
    case "CUSTOMER_NAME":
      return context.contact.name?.trim() || "there";
    case "BUSINESS_NAME":
      return context.business.name;
    case "REVIEW_URL":
      return (
        context.business.googleReviewUrl?.trim() ||
        `${getEnv().FRONTEND_URL.replace(/\/$/, "")}/r/${context.business.slug}`
      );
    case "RATING":
      return context.automation?.rating ? `${context.automation.rating}/5` : "";
    case "DATE":
      return new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    default:
      return "";
  }
}

function assertMappingCount(
  label: string,
  mapping: WhatsAppVariableMapping[],
  expected: number,
): void {
  if (mapping.length > 0 && mapping.length !== expected) {
    throw new WhatsAppServiceError(
      `${label} has ${expected} variable(s), so provide exactly ${expected} mapping value(s).`,
      400,
      "VARIABLE_COUNT_MISMATCH",
    );
  }
  if (mapping.length === 0 && expected > 0) {
    throw new WhatsAppServiceError(
      `${label} has ${expected} variable(s). Map each variable before saving the automation.`,
      400,
      "VARIABLE_COUNT_MISMATCH",
    );
  }
}

export async function listAutomationRules(businessId: string) {
  return prisma.whatsAppAutomationRule.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          status: true,
          category: true,
          useCase: true,
          parameterCount: true,
          headerParameterCount: true,
        },
      },
    },
  });
}

export async function createAutomationRule(input: {
  businessId: string;
  name: string;
  trigger: string;
  templateId: string;
  delayMinutes?: number;
  variableMap?: unknown;
  headerVariableMap?: unknown;
}) {
  const trigger = String(input.trigger || "").toUpperCase();
  if (!AUTOMATION_TRIGGERS.includes(trigger as WhatsAppAutomationTrigger)) {
    throw new WhatsAppServiceError("Choose a valid automation trigger.", 400, "INVALID_TRIGGER");
  }
  const name = String(input.name || "").trim();
  if (!name) throw new WhatsAppServiceError("Name the automation.", 400, "INVALID_NAME");

  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: input.templateId, businessId: input.businessId },
  });
  if (!template) throw new WhatsAppServiceError("Template not found.", 404, "TEMPLATE_NOT_FOUND");
  if (template.status !== "APPROVED") {
    throw new WhatsAppServiceError(
      "Only approved templates can be used in automations.",
      409,
      "TEMPLATE_NOT_APPROVED",
    );
  }

  const delayMinutes = Math.max(0, Math.min(60 * 24 * 30, Number(input.delayMinutes || 0)));
  const variableMap = normalizeVariableMap(input.variableMap);
  const headerVariableMap = normalizeVariableMap(input.headerVariableMap);
  assertMappingCount("The template body", variableMap, template.parameterCount);
  assertMappingCount("The template header", headerVariableMap, template.headerParameterCount);

  if (trigger === "OPT_IN_RECEIVED" && variableMap.some((v) => v.type === "TOKEN" && v.value === "RATING")) {
    throw new WhatsAppServiceError(
      "A new opt-in has no rating. Remove the rating variable from this automation.",
      400,
      "INVALID_VARIABLE_MAP",
    );
  }

  return prisma.whatsAppAutomationRule.create({
    data: {
      businessId: input.businessId,
      name,
      trigger,
      templateId: template.id,
      delayMinutes,
      variableMap: variableMap as any,
      headerVariableMap: headerVariableMap as any,
    },
    include: { template: true },
  });
}

export async function setAutomationRuleActive(
  businessId: string,
  ruleId: string,
  active: boolean,
) {
  const rule = await prisma.whatsAppAutomationRule.findFirst({
    where: { id: ruleId, businessId },
  });
  if (!rule) throw new WhatsAppServiceError("Automation not found.", 404, "NOT_FOUND");
  return prisma.whatsAppAutomationRule.update({
    where: { id: rule.id },
    data: { active },
  });
}

export async function deleteAutomationRule(businessId: string, ruleId: string) {
  const rule = await prisma.whatsAppAutomationRule.findFirst({
    where: { id: ruleId, businessId },
  });
  if (!rule) throw new WhatsAppServiceError("Automation not found.", 404, "NOT_FOUND");
  await prisma.whatsAppAutomationRule.delete({ where: { id: rule.id } });
  return { deleted: true };
}

/**
 * Event-driven automations. Callers must not let a WhatsApp failure break the
 * customer-facing action (feedback submit, opt-in form); failures are logged
 * without phone numbers or message text.
 */
export async function triggerWhatsAppAutomations(input: {
  businessId: string;
  trigger: WhatsAppAutomationTrigger;
  contactId: string;
  context?: AutomationContext;
}): Promise<{ queued: number }> {
  const [rules, business, contact] = await Promise.all([
    prisma.whatsAppAutomationRule.findMany({
      where: { businessId: input.businessId, trigger: input.trigger, active: true },
      include: { template: true },
    }),
    prisma.business.findUnique({
      where: { id: input.businessId },
      select: { name: true, slug: true, googleReviewUrl: true },
    }),
    prisma.whatsAppContact.findFirst({
      where: { id: input.contactId, businessId: input.businessId },
    }),
  ]);
  if (!business || !contact || contact.consentStatus !== "OPTED_IN") return { queued: 0 };

  let queued = 0;
  for (const rule of rules) {
    const template = rule.template;
    if (template.status !== "APPROVED") continue;
    if (template.category === "MARKETING" && (!contact.marketingOptIn || contact.marketingOptOut)) {
      continue;
    }

    const variableMap = normalizeVariableMap(rule.variableMap);
    const headerVariableMap = normalizeVariableMap(rule.headerVariableMap);
    const variables = variableMap.map((entry) =>
      resolveAutomationValue(entry, { business, contact, automation: input.context }),
    );
    const headerVariables = headerVariableMap.map((entry) =>
      resolveAutomationValue(entry, { business, contact, automation: input.context }),
    );
    if (variables.some((v) => !v) || headerVariables.some((v) => !v)) continue;

    const dedupeKey = `${input.trigger}:${input.context?.feedbackId || input.contactId}:${rule.id}`;
    try {
      await prisma.whatsAppAutomation.create({
        data: {
          businessId: input.businessId,
          contactId: contact.id,
          templateId: template.id,
          variables,
          headerVariables,
          purpose: template.useCase || "CUSTOM",
          scheduledAt: new Date(Date.now() + rule.delayMinutes * 60_000),
          dedupeKey,
        },
      });
      await prisma.whatsAppAutomationRule.update({
        where: { id: rule.id },
        data: { lastTriggeredAt: new Date() },
      });
      queued++;
    } catch (err: any) {
      // P2002 means this trigger already queued the same rule. Ignore it.
      if (err?.code !== "P2002") throw err;
    }
  }
  return { queued };
}

export async function getWhatsAppAudienceCounts(businessId: string) {
  const [total, optedIn, marketingOptIn, optedOut] = await Promise.all([
    prisma.whatsAppContact.count({ where: { businessId } }),
    prisma.whatsAppContact.count({ where: { businessId, consentStatus: "OPTED_IN" } }),
    prisma.whatsAppContact.count({
      where: { businessId, consentStatus: "OPTED_IN", marketingOptIn: true, marketingOptOut: false },
    }),
    prisma.whatsAppContact.count({ where: { businessId, consentStatus: "OPTED_OUT" } }),
  ]);
  return { total, optedIn, marketingOptIn, optedOut };
}

export async function createWhatsAppCampaign(input: {
  businessId: string;
  templateId: string;
  audience: string;
  scheduledAt: Date;
  variableMap?: unknown;
  headerVariableMap?: unknown;
  createdBy?: string;
}) {
  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: input.templateId, businessId: input.businessId },
  });
  if (!template) throw new WhatsAppServiceError("Template not found.", 404, "TEMPLATE_NOT_FOUND");
  if (template.status !== "APPROVED") {
    throw new WhatsAppServiceError("Only approved templates can be sent.", 409, "TEMPLATE_NOT_APPROVED");
  }

  const audience = String(input.audience || "ALL_OPTED_IN").toUpperCase();
  if (!["ALL_OPTED_IN", "MARKETING_OPT_IN"].includes(audience)) {
    throw new WhatsAppServiceError("Choose a valid audience.", 400, "INVALID_AUDIENCE");
  }
  if (template.category === "MARKETING" && audience !== "MARKETING_OPT_IN") {
    throw new WhatsAppServiceError(
      "Offers and other Marketing templates can only be sent to customers who separately opted in to promotions.",
      400,
      "MARKETING_AUDIENCE_REQUIRED",
    );
  }

  const variableMap = normalizeVariableMap(input.variableMap);
  const headerVariableMap = normalizeVariableMap(input.headerVariableMap);
  assertMappingCount("The template body", variableMap, template.parameterCount);
  assertMappingCount("The template header", headerVariableMap, template.headerParameterCount);
  if ([...variableMap, ...headerVariableMap].some((v) => v.type === "TOKEN" && v.value === "RATING")) {
    throw new WhatsAppServiceError(
      "A campaign has no single rating. Remove the rating variable or use fixed text.",
      400,
      "INVALID_VARIABLE_MAP",
    );
  }

  if (!Number.isFinite(input.scheduledAt.getTime())) {
    throw new WhatsAppServiceError("Choose a valid schedule date and time.", 400, "INVALID_SCHEDULE");
  }
  if (input.scheduledAt.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000) {
    throw new WhatsAppServiceError("Schedules can be at most one year ahead.", 400, "INVALID_SCHEDULE");
  }

  const contacts = await prisma.whatsAppContact.findMany({
    where: {
      businessId: input.businessId,
      consentStatus: "OPTED_IN",
      ...(audience === "MARKETING_OPT_IN" ? { marketingOptIn: true, marketingOptOut: false } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  if (contacts.length === 0) {
    throw new WhatsAppServiceError(
      "No customers match this audience yet. Add contacts or collect opt-ins first.",
      409,
      "EMPTY_AUDIENCE",
    );
  }

  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    select: { name: true, slug: true, googleReviewUrl: true },
  });
  if (!business) throw new WhatsAppServiceError("Business not found.", 404, "BUSINESS_NOT_FOUND");

  const batchId = randomUUID();
  const rows = contacts.map((contact, index) => {
    const context = { business, contact };
    return {
      businessId: input.businessId,
      contactId: contact.id,
      templateId: template.id,
      variables: variableMap.map((entry) => resolveAutomationValue(entry, context)),
      headerVariables: headerVariableMap.map((entry) => resolveAutomationValue(entry, context)),
      purpose: template.useCase || "CAMPAIGN",
      scheduledAt: new Date(input.scheduledAt.getTime() + index * 30_000),
      createdBy: input.createdBy || null,
      batchId,
    };
  });
  const invalid = rows.find(
    (row) => row.variables.some((v) => !v) || row.headerVariables.some((v) => !v),
  );
  if (invalid) {
    throw new WhatsAppServiceError(
      "One or more contacts cannot fill the template variables. Use fixed text for missing values.",
      400,
      "INVALID_VARIABLE_MAP",
    );
  }

  await prisma.whatsAppAutomation.createMany({ data: rows });
  return {
    batchId,
    queued: rows.length,
    firstSendAt: rows[0]?.scheduledAt,
    lastSendAt: rows[rows.length - 1]?.scheduledAt,
    audience,
  };
}

export async function listWhatsAppConversations(businessId: string) {
  const contacts = await prisma.whatsAppContact.findMany({
    where: {
      businessId,
      OR: [{ lastInboundAt: { not: null } }, { lastOutboundAt: { not: null } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  if (contacts.length === 0) return [];

  const recent = await prisma.whatsAppMessage.findMany({
    where: { businessId, contactId: { in: contacts.map((c) => c.id) } },
    orderBy: { createdAt: "desc" },
    take: contacts.length * 3,
    select: {
      id: true,
      contactId: true,
      direction: true,
      status: true,
      bodyPreview: true,
      createdAt: true,
    },
  });
  const lastByContact = new Map<string, (typeof recent)[number]>();
  for (const message of recent) {
    if (message.contactId && !lastByContact.has(message.contactId)) {
      lastByContact.set(message.contactId, message);
    }
  }

  return contacts.map((contact) => {
    const lastInbound = contact.lastInboundAt?.getTime() || 0;
    const lastOutbound = contact.lastOutboundAt?.getTime() || 0;
    return {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      consentStatus: contact.consentStatus,
      marketingOptIn: contact.marketingOptIn,
      marketingOptOut: contact.marketingOptOut,
      lastInboundAt: contact.lastInboundAt,
      lastOutboundAt: contact.lastOutboundAt,
      serviceWindowOpen: Boolean(lastInbound && Date.now() - lastInbound <= SERVICE_WINDOW_MS),
      needsReply: Boolean(lastInbound && lastInbound > lastOutbound),
      lastMessage: lastByContact.get(contact.id) || null,
    };
  });
}

export async function listWhatsAppConversationMessages(
  businessId: string,
  contactId: string,
) {
  const contact = await prisma.whatsAppContact.findFirst({
    where: { id: contactId, businessId },
  });
  if (!contact) throw new WhatsAppServiceError("Contact not found.", 404, "CONTACT_NOT_FOUND");
  const messages = await prisma.whatsAppMessage.findMany({
    where: { businessId, contactId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const lastInbound = contact.lastInboundAt?.getTime() || 0;
  return {
    contact,
    messages,
    serviceWindowOpen: Boolean(lastInbound && Date.now() - lastInbound <= SERVICE_WINDOW_MS),
  };
}

export async function getPublicWhatsAppBusiness(slug: string) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      country: true,
      whatsAppConnection: { select: { status: true } },
    },
  });
  if (!business) throw new WhatsAppServiceError("Business not found.", 404, "BUSINESS_NOT_FOUND");
  return {
    name: business.name,
    slug: business.slug,
    logoUrl: business.logoUrl,
    primaryColor: business.primaryColor,
    country: business.country,
    whatsappConnected: business.whatsAppConnection?.status === "CONNECTED",
  };
}

export async function registerPublicWhatsAppOptIn(input: {
  businessSlug: string;
  phone: string;
  name?: string | null;
  consent: boolean;
  marketingConsent?: boolean;
  feedbackId?: string | null;
  source?: string;
  referrer?: string | null;
}) {
  if (input.consent !== true) {
    throw new WhatsAppServiceError(
      "Please tick the box to confirm you want WhatsApp messages from this business.",
      400,
      "CONSENT_REQUIRED",
    );
  }
  const business = await prisma.business.findUnique({
    where: { slug: input.businessSlug },
    select: { id: true, name: true },
  });
  if (!business) throw new WhatsAppServiceError("Business not found.", 404, "BUSINESS_NOT_FOUND");

  if (input.feedbackId) {
    const feedback = await prisma.feedback.findFirst({
      where: { id: input.feedbackId, businessId: business.id },
      select: { id: true },
    });
    if (!feedback) {
      throw new WhatsAppServiceError("Feedback record not found.", 404, "FEEDBACK_NOT_FOUND");
    }
  }

  const contact = await upsertContactWithConsent({
    businessId: business.id,
    phone: input.phone,
    name: input.name,
    source: input.source || "public_optin_page",
    note: input.referrer
      ? `Customer submitted the public opt-in form (${input.referrer})`
      : "Customer submitted the public opt-in form",
    consentConfirmed: true,
    marketingConsent: input.marketingConsent === true,
  });

  if (input.feedbackId) {
    await prisma.feedback.updateMany({
      where: { id: input.feedbackId, businessId: business.id },
      data: {
        customerPhone: contact.phone,
        whatsappConsent: true,
        whatsappMarketingConsent: input.marketingConsent === true,
        whatsappConsentAt: new Date(),
      },
    });
  }

  const result = await triggerWhatsAppAutomations({
    businessId: business.id,
    trigger: "OPT_IN_RECEIVED",
    contactId: contact.id,
    context: { customerName: contact.name, feedbackId: input.feedbackId || null },
  });

  return { contactId: contact.id, automationsQueued: result.queued };
}

export async function processDueWhatsAppAutomations(limit = 50): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const due = await prisma.whatsAppAutomation.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const automation of due) {
    const claimed = await prisma.whatsAppAutomation.updateMany({
      where: { id: automation.id, status: "SCHEDULED" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count === 0) continue;

    try {
      await sendTemplateToContact({
        businessId: automation.businessId,
        contactId: automation.contactId,
        templateId: automation.templateId,
        variables: automation.variables,
        headerVariables: automation.headerVariables,
      });
      await prisma.whatsAppAutomation.update({
        where: { id: automation.id },
        data: { status: "SENT", sentAt: new Date(), error: null },
      });
      sent++;
    } catch (err: any) {
      const isSkip =
        err?.code === "CONSENT_REQUIRED" ||
        err?.code === "MARKETING_OPT_OUT" ||
        err?.code === "TEMPLATE_NOT_APPROVED";
      await prisma.whatsAppAutomation.update({
        where: { id: automation.id },
        data: {
          status: isSkip ? "SKIPPED" : "FAILED",
          error: err?.message || "Send failed",
        },
      });
      if (isSkip) skipped++;
      else failed++;
    }
  }

  return { processed: due.length, sent, failed, skipped };
}

/* -------------------------------------------------------------------------- */
/* Owner-facing overview                                                      */
/* -------------------------------------------------------------------------- */

export async function getWhatsAppOverview(businessId: string) {
  const [
    business,
    connection,
    templates,
    contactsCount,
    optedInCount,
    marketingOptedInCount,
    contactList,
    messages,
    automations,
    automationRules,
  ] = await Promise.all([
      prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true, slug: true, country: true, currency: true },
      }),
      prisma.whatsAppConnection.findUnique({ where: { businessId } }),
      prisma.whatsAppTemplate.findMany({
        where: { businessId },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 100,
      }),
      prisma.whatsAppContact.count({ where: { businessId } }),
      prisma.whatsAppContact.count({ where: { businessId, consentStatus: "OPTED_IN" } }),
      prisma.whatsAppContact.count({
        where: { businessId, consentStatus: "OPTED_IN", marketingOptIn: true, marketingOptOut: false },
      }),
      prisma.whatsAppContact.findMany({
        where: { businessId },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      prisma.whatsAppMessage.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { contact: { select: { id: true, phone: true, name: true } } },
      }),
      prisma.whatsAppAutomation.findMany({
        where: { businessId },
        orderBy: { scheduledAt: "desc" },
        take: 20,
        include: {
          contact: { select: { id: true, phone: true, name: true } },
          template: { select: { id: true, name: true, status: true } },
        },
      }),
      prisma.whatsAppAutomationRule.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              status: true,
              category: true,
              useCase: true,
              parameterCount: true,
              headerParameterCount: true,
            },
          },
        },
      }),
    ]);

  if (!business) throw new WhatsAppServiceError("Business not found.", 404, "BUSINESS_NOT_FOUND");

  const [outboundSent, delivered, read, failed, inbound] = await Promise.all([
    prisma.whatsAppMessage.count({ where: { businessId, direction: "OUTBOUND", status: "SENT" } }),
    prisma.whatsAppMessage.count({ where: { businessId, direction: "OUTBOUND", status: "DELIVERED" } }),
    prisma.whatsAppMessage.count({ where: { businessId, direction: "OUTBOUND", status: "READ" } }),
    prisma.whatsAppMessage.count({ where: { businessId, direction: "OUTBOUND", status: "FAILED" } }),
    prisma.whatsAppMessage.count({ where: { businessId, direction: "INBOUND" } }),
  ]);

  return {
    business,
    connection: serializeConnection(connection),
    templates,
    contacts: {
      total: contactsCount,
      optedIn: optedInCount,
      marketingOptedIn: marketingOptedInCount,
      list: contactList,
    },
    messages,
    automations,
    automationRules,
    stats: { outboundSent, delivered, read, failed, inbound },
    pricing:
      business.country === "IN"
        ? WHATSAPP_PRICING.india
        : { ...WHATSAPP_PRICING.other, effectiveFrom: null, verifiedOn: null },
  };
}

export async function listBusinessContacts(businessId: string) {
  return prisma.whatsAppContact.findMany({
    where: { businessId },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}
