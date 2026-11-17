import { prisma } from "../../config/database";
import { getEnv } from "../../config/env";
import { normalizePhoneNumber } from "../../utils/phone";
import { sendTemplateToContact } from "../whatsapp/whatsapp.service";

interface WhatsAppApiResult {
  success: boolean;
  messageId?: string;
  error?: string;
  data?: any;
}

/**
 * Legacy multi-platform entry point.
 *
 * The old implementation used a single global BEYONDVYU number and hard-coded
 * placeholder template/flow names, so it could never work for a real client.
 * This now routes through the business's own connected WhatsApp account and a
 * template the business actually had approved by Meta.
 */
export async function sendWhatsAppReviewFlow(
  businessId: string,
  phoneNumber: string,
  customerName?: string,
): Promise<WhatsAppApiResult> {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, slug: true, country: true },
    });
    if (!business) return { success: false, error: "Business not found" };

    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        businessId,
        status: "APPROVED",
        category: "UTILITY",
        OR: [
          { useCase: "REVIEW_REQUEST" },
          { name: { contains: "review", mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!template) {
      return {
        success: false,
        error:
          "No approved review-request Utility template is connected. Create a review-request template in WhatsApp automation and wait for Meta approval.",
      };
    }

    const country = business.country === "US" ? "US" : "IN";
    const normalized = normalizePhoneNumber(phoneNumber, country);
    if (!normalized.isValid) return { success: false, error: "Invalid customer phone number" };

    const contact = await prisma.whatsAppContact.findUnique({
      where: { businessId_phone: { businessId, phone: normalized.digits } },
    });
    if (!contact) {
      return {
        success: false,
        error:
          "Customer has not opted in. Add them as a WhatsApp contact with consent before sending a review request.",
      };
    }

    const env = getEnv();
    const reviewUrl = `${env.FRONTEND_URL.split(",")[0].trim()}/r/${business.slug}`;
    const candidates = [customerName || "there", business.name, reviewUrl];
    const variables = Array.from({ length: template.parameterCount }, (_, index) => candidates[index] || "");
    const headerVariables = template.headerParameterCount > 0 ? [business.name] : [];

    const message = await sendTemplateToContact({
      businessId,
      contactId: contact.id,
      templateId: template.id,
      variables,
      headerVariables,
    });

    return { success: true, messageId: message.metaMessageId || undefined, data: message };
  } catch (err: any) {
    return { success: false, error: err?.message || "WhatsApp send failed" };
  }
}
