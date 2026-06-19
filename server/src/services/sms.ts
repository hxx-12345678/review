import { getEnv } from "../config/env";

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms(phoneNumber: string, message: string): Promise<SmsResult> {
  const env = getEnv();
  if (!env.SMS_API_KEY) {
    console.warn("SMS not sent: SMS_API_KEY not configured");
    return { success: false, error: "SMS not configured" };
  }

  const cleanedPhone = phoneNumber.replace(/\D/g, "");
  if (cleanedPhone.length < 10) {
    return { success: false, error: "Invalid phone number" };
  }

  // Indian mobile numbers: 10 digits. Full E.164 format: 91 + 10 digits = 12 digits
  let fullNumber: string;
  if (cleanedPhone.length === 10) {
    fullNumber = `91${cleanedPhone}`;
  } else if (cleanedPhone.length === 12 && cleanedPhone.startsWith("91")) {
    fullNumber = cleanedPhone;
  } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith("0")) {
    fullNumber = `91${cleanedPhone.substring(1)}`;
  } else {
    return { success: false, error: "Invalid phone number format" };
  }

  const encodedMessage = encodeURIComponent(message);

  let url = `${env.SMS_BASE_URL}?apikey=${env.SMS_API_KEY}&senderid=${env.SMS_SENDER_ID}&number=${fullNumber}&message=${encodedMessage}&format=json`;

  if (env.SMS_TEMPLATE_ID && message.includes("OTP")) {
    url += `&template_id=${env.SMS_TEMPLATE_ID}`;
  }

  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(15000) });
    const data: any = await res.json();

    if (data.status === "OK" || data.status === "SUBMITTED") {
      return { success: true, messageId: data.msgid || data.data?.[0]?.id };
    }

    return { success: false, error: data.message || "SMS send failed" };
  } catch (err: any) {
    console.error("SMS send error:", err);
    return { success: false, error: err.message || "SMS send failed" };
  }
}
