import { getEnv } from "../../config/env";

interface WhatsAppApiResult {
  success: boolean;
  messageId?: string;
  error?: string;
  data?: any;
}

interface FlowResponse {
  flowToken: string;
  flowId: string;
  responseData: Record<string, any>;
  completed: boolean;
}

function getWhatsAppBaseUrl(): string {
  const env = getEnv();
  return `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}`;
}

function getWhatsAppHeaders(): Record<string, string> {
  const env = getEnv();
  return {
    Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function cleanPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.length === 12) return cleaned;
  return cleaned;
}

function buildReviewFlowJson(businessName: string): object {
  return {
    type: "flow",
    flow_id: "review-collection-flow",
    flow_cta: "Rate your experience",
    flow_action: "data_exchange",
    flow_action_payload: {
      screen: "REVIEW_FORM",
      data: {
        business_name: businessName,
      },
    },
  };
}

export async function sendWhatsAppReviewFlow(
  phoneNumber: string,
  businessName: string,
  customerName?: string,
): Promise<WhatsAppApiResult> {
  const env = getEnv();
  if (!env.WHATSAPP_API_TOKEN) {
    return { success: false, error: "WhatsApp API not configured" };
  }

  const to = cleanPhoneNumber(phoneNumber);

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: "review_request_flow",
      language: { code: "en" },
      components: [
        {
          type: "header",
          parameters: [
            { type: "text", text: businessName },
          ],
        },
        {
          type: "body",
          parameters: customerName
            ? [{ type: "text", text: customerName }]
            : [],
        },
        {
          type: "button",
          sub_type: "flow",
          index: 0,
          parameters: [
            {
              type: "action",
              action: {
                data: JSON.stringify({ business_name: businessName }),
              },
            },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(
      `${getWhatsAppBaseUrl()}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: getWhatsAppHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      },
    );
    const data: any = await res.json();

    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id, data };
    }
    return { success: false, error: data.error?.message || "Failed to send", data };
  } catch (err: any) {
    return { success: false, error: err.message || "WhatsApp send failed" };
  }
}

export async function sendWhatsAppDirectReviewFlow(
  phoneNumber: string,
  businessName: string,
  flowToken: string,
  customerName?: string,
): Promise<WhatsAppApiResult> {
  const env = getEnv();
  if (!env.WHATSAPP_API_TOKEN) {
    return { success: false, error: "WhatsApp API not configured" };
  }

  const to = cleanPhoneNumber(phoneNumber);
  const flowJson = buildReviewFlowJson(businessName);

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "flow",
      header: {
        type: "text",
        text: `Rate ${businessName}`,
      },
      body: {
        text: customerName
          ? `Hi ${customerName}, how was your experience at ${businessName}? Tap below to rate us.`
          : `How was your experience at ${businessName}? Tap below to rate us.`,
      },
      footer: {
        text: "Your feedback helps us improve.",
      },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_token: flowToken,
          flow_id: "review-collection-flow",
          flow_cta: "Rate experience",
          flow_action: "data_exchange",
          flow_action_payload: {
            screen: "REVIEW_FORM",
            data: {
              business_name: businessName,
            },
          },
        },
      },
    },
  };

  try {
    const res = await fetch(
      `${getWhatsAppBaseUrl()}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: getWhatsAppHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      },
    );
    const data: any = await res.json();

    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id, data };
    }
    return { success: false, error: data.error?.message || "Failed to send", data };
  } catch (err: any) {
    return { success: false, error: err.message || "WhatsApp send failed" };
  }
}

export function parseFlowResponse(payload: any): FlowResponse | null {
  try {
    const data = payload?.data || payload;
    return {
      flowToken: data.flow_token,
      flowId: data.flow_id,
      responseData: data.response || data.data || {},
      completed: data.completed !== false,
    };
  } catch {
    return null;
  }
}

export function extractReviewFromFlowResponse(responseData: Record<string, any>): {
  rating: number;
  liked?: string;
  improvement?: string;
  customerName?: string;
  customerEmail?: string;
  privateNote?: string;
} {
  return {
    rating: Math.min(5, Math.max(1, Number(responseData.rating) || 5)),
    liked: responseData.liked || undefined,
    improvement: responseData.improvement || undefined,
    customerName: responseData.customer_name || undefined,
    customerEmail: responseData.customer_email || undefined,
    privateNote: responseData.private_note || undefined,
  };
}
