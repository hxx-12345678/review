import { getEnv } from "../config/env";
import { normalizePhoneNumber } from "../utils/phone";

export async function sendWhatsAppNotification(
  toPhone: string,
  message: string,
  defaultCountry: "IN" | "US" = "IN"
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const env = getEnv();
  if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { success: false, error: "WhatsApp API not configured (WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID required in server/.env)" };
  }
  if (!env.WHATSAPP_ALERT_TEMPLATE_NAME) {
    return {
      success: false,
      error:
        "WhatsApp owner alerts need an approved utility template. Set WHATSAPP_ALERT_TEMPLATE_NAME (and WHATSAPP_ALERT_TEMPLATE_LANG) with one body variable.",
    };
  }

  const normalized = normalizePhoneNumber(toPhone, defaultCountry);
  if (!normalized.isValid) {
    return { success: false, error: "Invalid recipient phone number" };
  }

  const recipient = normalized.digits;

  try {
    const res = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: env.WHATSAPP_ALERT_TEMPLATE_NAME,
          language: { code: env.WHATSAPP_ALERT_TEMPLATE_LANG },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: message.slice(0, 900) }],
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data: any = await res.json();
    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || "WhatsApp send failed" };
  } catch (err: any) {
    return { success: false, error: err.message || "WhatsApp send failed" };
  }
}
