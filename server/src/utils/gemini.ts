import { getEnv } from "../config/env";

const GENERIC_BLOCKLIST = [
  "highly recommend",
  "amazing service",
  "best ever",
  "10/10",
  "five stars",
  "great experience",
];

function isTooGeneric(text: string): boolean {
  const lower = text.toLowerCase();
  return GENERIC_BLOCKLIST.some((phrase) => lower.includes(phrase));
}

// Fallback deterministic helper for talking points
export function deriveTalkingPoints(highlights: string): string[] {
  if (!highlights || highlights.trim().length < 3) return [];

  const fragments = highlights
    .split(/[.,;\n]|(?:\band\b)/i)
    .map((f) => f.trim())
    .filter((f) => f.length >= 4 && !isTooGeneric(f));

  const points: string[] = [];
  for (const fragment of fragments) {
    const words = fragment.split(/\s+/).slice(0, 12).join(" ");
    const cleaned = words.charAt(0).toUpperCase() + words.slice(1);
    if (!points.includes(cleaned)) points.push(cleaned);
    if (points.length >= 5) break;
  }

  return points.slice(0, 5);
}

// Fallback deterministic helper for replies
export function buildFallbackReply(rating: number, liked: string | null, improvement: string | null, tone: string): string {
  const thanks = tone === "formal" ? "Thank you" : tone === "friendly" ? "Thanks so much" : "Thank you";

  let body = "";
  if (rating >= 4) {
    body = liked
      ? `We're delighted you enjoyed ${liked.toLowerCase()}. Your kind words mean a lot to our team.`
      : `We're thrilled you had a great experience with us.`;
  } else if (rating === 3) {
    body = `We appreciate your honest feedback and are always looking to improve.`;
  } else {
    body = improvement
      ? `We take your feedback about ${improvement.toLowerCase()} seriously and will work on improving.`
      : `We apologize for not meeting expectations and will use your feedback to improve.`;
  }

  const closing = tone === "formal"
    ? "We look forward to serving you again."
    : tone === "friendly"
      ? "Hope to see you again soon!"
      : "We look forward to your next visit.";

  return `${thanks} for your review. ${body} ${closing}`;
}

interface GeminiConfig {
  responseMimeType?: string;
  responseSchema?: any;
}

export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  config?: GeminiConfig
): Promise<string> {
  const env = getEnv();
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not defined in server environment");
  }

  // Use gemini-2.0-flash-001 (stable versioned release confirmed available for this API key)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`;

  const payload: any = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [
        {
          text: systemInstruction,
        },
      ],
    };
  }

  if (config) {
    payload.generationConfig = {};
    if (config.responseMimeType) {
      payload.generationConfig.responseMimeType = config.responseMimeType;
    }
    if (config.responseSchema) {
      payload.generationConfig.responseSchema = config.responseSchema;
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini API call failed with status ${res.status}: ${errorBody}`);
  }

  const data = (await res.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  return text;
}
