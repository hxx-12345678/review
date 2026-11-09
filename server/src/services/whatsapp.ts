import { getEnv } from "../config/env";

export async function sendWhatsAppNotification(
  toPhone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const env = getEnv();
  if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { success: false, error: "WhatsApp API not configured (WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID required in server/.env)" };
  }

  const cleanedPhone = toPhone.replace(/\D/g, "");
  if (cleanedPhone.length < 10) {
    return { success: false, error: "Invalid recipient phone number" };
  }

  let recipient = cleanedPhone;
  if (cleanedPhone.length === 10) {
    recipient = `91${cleanedPhone}`;
  } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith("0")) {
    recipient = `91${cleanedPhone.slice(1)}`;
  }

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
        type: "text",
        text: { preview_url: false, body: message.slice(0, 4000) },
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
