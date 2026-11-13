import { getEnv } from "../config/env";
import { normalizePhoneNumber } from "../utils/phone";

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms(
  phoneNumber: string,
  message: string,
  templateId?: string,
  defaultCountry: "IN" | "US" = "IN"
): Promise<SmsResult> {
  const normalized = normalizePhoneNumber(phoneNumber, defaultCountry);
  if (!normalized.isValid) {
    return { success: false, error: "Invalid phone number format" };
  }

  const env = getEnv();

  // U.S. / NANP destination -> Twilio (A2P 10DLC compliant)
  if (normalized.country === "US") {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      console.warn(`[SMS] Twilio credentials not configured for US destination ${normalized.e164}`);
      return {
        success: false,
        error: "Twilio SMS not configured for U.S. numbers (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required in server/.env)",
      };
    }

    try {
      const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const bodyParams = new URLSearchParams();
      bodyParams.append("To", normalized.e164);
      bodyParams.append("Body", message);

      if (env.TWILIO_MESSAGING_SERVICE_SID) {
        bodyParams.append("MessagingServiceSid", env.TWILIO_MESSAGING_SERVICE_SID);
      } else if (env.TWILIO_PHONE_NUMBER) {
        bodyParams.append("From", env.TWILIO_PHONE_NUMBER);
      }

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(15000),
      });

      const data: any = await res.json();
      if (res.ok && data.sid) {
        return { success: true, messageId: data.sid };
      }
      return { success: false, error: data.message || "Twilio SMS send failed" };
    } catch (err: any) {
      console.error("Twilio SMS send error:", err);
      return { success: false, error: err.message || "Twilio SMS send failed" };
    }
  }

  // India destination -> Indian DLT gateway
  if (!env.SMS_API_KEY) {
    console.warn("SMS not sent: SMS_API_KEY not configured");
    return { success: false, error: "SMS not configured" };
  }

  const fullNumber = normalized.digits;
  const encodedMessage = encodeURIComponent(message);

  let url = `${env.SMS_BASE_URL}?apikey=${env.SMS_API_KEY}&senderid=${env.SMS_SENDER_ID}&number=${fullNumber}&message=${encodedMessage}&format=json`;

  // TRAI DLT: every commercial SMS must carry its registered Template ID or
  // carriers block it at scrubbing. Never mix categories — an OTP template ID
  // on a review-request message is a category mismatch (block + violation).
  const resolvedTemplateId = templateId || (message.includes("OTP") ? env.SMS_TEMPLATE_ID : undefined);
  if (resolvedTemplateId) {
    url += `&template_id=${resolvedTemplateId}`;
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
