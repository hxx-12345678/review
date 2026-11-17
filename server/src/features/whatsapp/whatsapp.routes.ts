import { NextFunction, Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { getEnv } from "../../config/env";
import { authRequired, AuthRequest } from "../../middleware/auth";
import { publicWhatsAppLimiter } from "../../middleware/rate-limit";
import { MetaApiError, getWhatsAppPlatformConfig } from "./whatsapp.meta";
import {
  WhatsAppServiceError,
  cancelAutomation,
  confirmPaymentMethod,
  connectBusinessWhatsApp,
  createAutomationRule,
  createBusinessTemplate,
  createWhatsAppCampaign,
  deleteAutomationRule,
  getPublicWhatsAppBusiness,
  getWhatsAppOverview,
  listAutomationRules,
  listBusinessContacts,
  listWhatsAppConversationMessages,
  listWhatsAppConversations,
  processDueWhatsAppAutomations,
  registerConnectedPhoneNumber,
  registerPublicWhatsAppOptIn,
  scheduleTemplateAutomation,
  sendTemplateToContact,
  sendTextReply,
  setAutomationRuleActive,
  setContactOptOut,
  syncBusinessConnection,
  syncBusinessTemplates,
  updateBusinessTemplate,
  upsertContactWithConsent,
} from "./whatsapp.service";

const router = Router();

const idSchema = z.string().min(1).max(100);

const connectSchema = z.object({
  businessId: idSchema,
  code: z.string().min(10).max(4096),
  wabaId: z.string().min(5).max(100),
  phoneNumberId: z.string().min(5).max(100),
  businessPortfolioId: z.string().min(5).max(100).optional().nullable(),
});

const registerSchema = z.object({
  businessId: idSchema,
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
});

const templateSchema = z.object({
  businessId: idSchema,
  name: z.string().min(1).max(512),
  language: z.string().min(2).max(20).default("en"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  useCase: z
    .enum(["REVIEW_REQUEST", "PAYMENT_REMINDER", "OFFER", "FEEDBACK", "OWNER_REPORT", "CUSTOM"])
    .default("CUSTOM"),
  headerText: z.string().max(60).optional(),
  bodyText: z.string().min(1).max(1024),
  footerText: z.string().max(60).optional(),
  bodyExamples: z.array(z.string().max(200)).max(10).optional(),
  headerExample: z.string().max(200).optional(),
});

const updateTemplateSchema = z.object({
  businessId: idSchema,
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).optional(),
  useCase: z
    .enum(["REVIEW_REQUEST", "PAYMENT_REMINDER", "OFFER", "FEEDBACK", "OWNER_REPORT", "CUSTOM"])
    .optional(),
  headerText: z.string().max(60).optional(),
  bodyText: z.string().min(1).max(1024),
  footerText: z.string().max(60).optional(),
  bodyExamples: z.array(z.string().max(200)).max(10).optional(),
  headerExample: z.string().max(200).optional(),
});

const contactSchema = z.object({
  businessId: idSchema,
  phone: z.string().min(5).max(30),
  name: z.string().max(100).optional(),
  consentConfirmed: z.literal(true),
  marketingConsent: z.boolean().optional(),
  consentSource: z.string().max(60).optional(),
  consentNote: z.string().max(300).optional(),
});

const sendSchema = z.object({
  businessId: idSchema,
  contactId: z.string().min(1).optional(),
  phone: z.string().min(5).max(30).optional(),
  name: z.string().max(100).optional(),
  consentConfirmed: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  consentSource: z.string().max(60).optional(),
  consentNote: z.string().max(300).optional(),
  templateId: idSchema,
  variables: z.array(z.string().max(1000)).max(10).default([]),
  headerVariables: z.array(z.string().max(300)).max(1).default([]),
});

const variableMapSchema = z
  .array(
    z.object({
      type: z.enum(["TOKEN", "TEXT"]),
      value: z.string().min(1).max(300),
    }),
  )
  .max(10)
  .default([]);

const automationRuleSchema = z.object({
  businessId: idSchema,
  name: z.string().min(1).max(100),
  trigger: z.enum(["FEEDBACK_RECEIVED", "OPT_IN_RECEIVED"]),
  templateId: idSchema,
  delayMinutes: z.number().int().min(0).max(60 * 24 * 30).default(0),
  variableMap: variableMapSchema,
  headerVariableMap: variableMapSchema,
});

const campaignSchema = z.object({
  businessId: idSchema,
  templateId: idSchema,
  audience: z.enum(["ALL_OPTED_IN", "MARKETING_OPT_IN"]),
  scheduledAt: z.string().min(1),
  variableMap: variableMapSchema,
  headerVariableMap: variableMapSchema,
});

const publicOptInSchema = z.object({
  businessSlug: z.string().min(1).max(200),
  phone: z.string().min(5).max(30),
  name: z.string().max(100).optional(),
  consent: z.literal(true),
  marketingConsent: z.boolean().optional(),
  feedbackId: z.string().min(1).max(100).optional(),
  source: z.string().max(60).optional(),
  referrer: z.string().max(500).optional(),
});

const replySchema = z.object({
  businessId: idSchema,
  contactId: idSchema,
  text: z.string().min(1).max(4000),
});

const automationSchema = z.object({
  businessId: idSchema,
  contactId: idSchema,
  templateId: idSchema,
  variables: z.array(z.string().max(1000)).max(10).default([]),
  headerVariables: z.array(z.string().max(300)).max(1).default([]),
  purpose: z
    .enum(["REVIEW_REQUEST", "PAYMENT_REMINDER", "OFFER", "FEEDBACK", "OWNER_REPORT", "CUSTOM"])
    .optional(),
  scheduledAt: z.string().min(1),
});

async function assertBusiness(businessId: string, userId?: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
    select: { id: true, name: true, country: true },
  });
  if (!business) {
    throw new WhatsAppServiceError("Business not found.", 404, "BUSINESS_NOT_FOUND");
  }
  return business;
}

function handleError(res: Response, err: any) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: "Invalid input", details: err.errors });
  }
  if (err instanceof WhatsAppServiceError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  if (err instanceof MetaApiError) {
    return res.status(err.status >= 400 && err.status < 600 ? err.status : 502).json({
      error: err.message,
      code: "META_API_ERROR",
      metaCode: err.code ?? null,
    });
  }
  console.error("WhatsApp route error:", err?.message || err);
  return res.status(500).json({ error: "Internal server error" });
}

router.get("/overview/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    await assertBusiness(businessId, req.userId);
    const overview = await getWhatsAppOverview(businessId);
    res.json({ ...overview, platform: getWhatsAppPlatformConfig() });
  } catch (err) {
    handleError(res, err);
  }
});

router.get("/public/business/:slug", publicWhatsAppLimiter, async (req, res: Response) => {
  try {
    const business = await getPublicWhatsAppBusiness(String(req.params.slug || ""));
    res.json({ business });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/public/opt-in", publicWhatsAppLimiter, async (req, res: Response) => {
  try {
    const data = publicOptInSchema.parse(req.body);
    const result = await registerPublicWhatsAppOptIn({
      businessSlug: data.businessSlug,
      phone: data.phone,
      name: data.name,
      consent: data.consent,
      marketingConsent: data.marketingConsent,
      feedbackId: data.feedbackId,
      source: data.source,
      referrer: data.referrer,
    });
    // Do not echo the phone number back to an unauthenticated caller.
    res.status(201).json({ success: true, automationsQueued: result.automationsQueued });
  } catch (err) {
    handleError(res, err);
  }
});

router.get("/contacts/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    await assertBusiness(businessId, req.userId);
    const contacts = await listBusinessContacts(businessId);
    res.json({ contacts });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/connect", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = connectSchema.parse(req.body);
    await assertBusiness(data.businessId, req.userId);
    const platform = getWhatsAppPlatformConfig();
    if (!platform.configured) {
      throw new WhatsAppServiceError(
        "WhatsApp Embedded Signup is not enabled on this deployment yet.",
        503,
        "PLATFORM_NOT_CONFIGURED",
      );
    }

    const result = await connectBusinessWhatsApp({
      businessId: data.businessId,
      code: data.code,
      wabaId: data.wabaId,
      phoneNumberId: data.phoneNumberId,
      businessPortfolioId: data.businessPortfolioId,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/register", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    await assertBusiness(data.businessId, req.userId);
    const result = await registerConnectedPhoneNumber(data.businessId, data.pin);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/sync", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const body = z.object({ businessId: idSchema }).parse(req.body);
    await assertBusiness(body.businessId, req.userId);
    const result = await syncBusinessConnection(body.businessId);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/payment-method-confirmed", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const body = z.object({ businessId: idSchema }).parse(req.body);
    await assertBusiness(body.businessId, req.userId);
    await confirmPaymentMethod(body.businessId);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/templates", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = templateSchema.parse(req.body);
    await assertBusiness(data.businessId, req.userId);
    const template = await createBusinessTemplate(data.businessId, data);
    res.status(201).json({ success: true, template });
  } catch (err) {
    handleError(res, err);
  }
});

router.patch("/templates/:templateId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTemplateSchema.parse(req.body);
    await assertBusiness(data.businessId, req.userId);
    const template = await updateBusinessTemplate(
      data.businessId,
      String(req.params.templateId || ""),
      data,
    );
    res.json({ success: true, template });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/templates/sync", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const body = z.object({ businessId: idSchema }).parse(req.body);
    await assertBusiness(body.businessId, req.userId);
    const result = await syncBusinessTemplates(body.businessId);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/contacts", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = contactSchema.parse(req.body);
    await assertBusiness(data.businessId, req.userId);
    const contact = await upsertContactWithConsent({
      businessId: data.businessId,
      phone: data.phone,
      name: data.name,
      source: data.consentSource,
      note: data.consentNote,
      consentConfirmed: data.consentConfirmed,
      marketingConsent: data.marketingConsent,
    });
    res.status(201).json({ success: true, contact });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/contacts/:contactId/opt-out", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const body = z.object({ businessId: idSchema }).parse(req.body);
    await assertBusiness(body.businessId, req.userId);
    const contact = await setContactOptOut(body.businessId, req.params.contactId as string);
    res.json({ success: true, contact });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/send", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = sendSchema.parse(req.body);
    await assertBusiness(data.businessId, req.userId);

    let contactId = data.contactId;
    if (!contactId) {
      if (!data.phone) {
        throw new WhatsAppServiceError("Choose a contact or enter a phone number.", 400, "INVALID_INPUT");
      }
      const contact = await upsertContactWithConsent({
        businessId: data.businessId,
        phone: data.phone,
        name: data.name,
        source: data.consentSource,
        note: data.consentNote,
        consentConfirmed: data.consentConfirmed === true,
        marketingConsent: data.marketingConsent,
      });
      contactId = contact.id;
    }

    const message = await sendTemplateToContact({
      businessId: data.businessId,
      contactId,
      templateId: data.templateId,
      variables: data.variables,
      headerVariables: data.headerVariables,
    });
    res.json({ success: true, message });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/reply", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = replySchema.parse(req.body);
    await assertBusiness(data.businessId, req.userId);
    const message = await sendTextReply({
      businessId: data.businessId,
      contactId: data.contactId,
      text: data.text,
    });
    res.json({ success: true, message });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/automations", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = automationSchema.parse(req.body);
    await assertBusiness(data.businessId, req.userId);
    const scheduledAt = new Date(data.scheduledAt);
    const automation = await scheduleTemplateAutomation({
      businessId: data.businessId,
      contactId: data.contactId,
      templateId: data.templateId,
      variables: data.variables,
      headerVariables: data.headerVariables,
      purpose: data.purpose,
      scheduledAt,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, automation });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete("/automations/:automationId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const body = z.object({ businessId: idSchema }).parse(req.body);
    await assertBusiness(body.businessId, req.userId);
    const automation = await cancelAutomation(body.businessId, req.params.automationId as string);
    res.json({ success: true, automation });
  } catch (err) {
    handleError(res, err);
  }
});

router.get("/conversations/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    await assertBusiness(businessId, req.userId);
    const conversations = await listWhatsAppConversations(businessId);
    res.json({ conversations });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(
  "/conversations/:businessId/:contactId",
  authRequired,
  async (req: AuthRequest, res: Response) => {
    try {
      const businessId = req.params.businessId as string;
      await assertBusiness(businessId, req.userId);
      const conversation = await listWhatsAppConversationMessages(
        businessId,
        String(req.params.contactId || ""),
      );
      res.json(conversation);
    } catch (err) {
      handleError(res, err);
    }
  },
);

router.get("/automation-rules/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    await assertBusiness(businessId, req.userId);
    const rules = await listAutomationRules(businessId);
    res.json({ rules });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/automation-rules", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = automationRuleSchema.parse(req.body);
    await assertBusiness(data.businessId, req.userId);
    const rule = await createAutomationRule(data);
    res.status(201).json({ success: true, rule });
  } catch (err) {
    handleError(res, err);
  }
});

router.patch(
  "/automation-rules/:ruleId",
  authRequired,
  async (req: AuthRequest, res: Response) => {
    try {
      const body = z.object({ businessId: idSchema, active: z.boolean() }).parse(req.body);
      await assertBusiness(body.businessId, req.userId);
      const rule = await setAutomationRuleActive(
        body.businessId,
        String(req.params.ruleId || ""),
        body.active,
      );
      res.json({ success: true, rule });
    } catch (err) {
      handleError(res, err);
    }
  },
);

router.delete(
  "/automation-rules/:ruleId",
  authRequired,
  async (req: AuthRequest, res: Response) => {
    try {
      const body = z.object({ businessId: idSchema }).parse(req.body);
      await assertBusiness(body.businessId, req.userId);
      const result = await deleteAutomationRule(
        body.businessId,
        String(req.params.ruleId || ""),
      );
      res.json({ success: true, ...result });
    } catch (err) {
      handleError(res, err);
    }
  },
);

router.post("/campaigns", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = campaignSchema.parse(req.body);
    await assertBusiness(data.businessId, req.userId);
    const campaign = await createWhatsAppCampaign({
      businessId: data.businessId,
      templateId: data.templateId,
      audience: data.audience,
      scheduledAt: new Date(data.scheduledAt),
      variableMap: data.variableMap,
      headerVariableMap: data.headerVariableMap,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, campaign });
  } catch (err) {
    handleError(res, err);
  }
});

async function cronOrAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const secret = req.headers["x-cron-secret"];
  const expected = getEnv().WHATSAPP_CRON_SECRET;
  if (expected && typeof secret === "string" && secret === expected) {
    return next();
  }
  return authRequired(req, res, next);
}

router.post("/process-due", cronOrAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await processDueWhatsAppAutomations();
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
