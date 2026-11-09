/**
 * Turn customer feedback into an actionable operational issue.
 *
 * The classifier is deliberately keyword/ID based rather than AI-based:
 *   - it runs synchronously inside feedback submission,
 *   - it is deterministic and auditable,
 *   - it works for every plan, including when AI credits are exhausted.
 *
 * Release 1 is restaurant-first, so the buckets mirror restaurant operations.
 * Other industries fall through to "other" without breaking anything.
 */

export const TASK_CATEGORIES = [
  "safety",
  "food_quality",
  "service",
  "cleanliness",
  "speed",
  "takeaway",
  "ordering",
  "ambience",
  "value",
  "drinks",
  "other",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  safety: "Safety / allergen",
  food_quality: "Food quality",
  service: "Service",
  cleanliness: "Cleanliness",
  speed: "Speed / wait",
  takeaway: "Takeaway & packaging",
  ordering: "Ordering & billing",
  ambience: "Ambience",
  value: "Value for money",
  drinks: "Drinks & bar",
  other: "Other",
};

/** Explicit option IDs are matched first, in this order. */
const ID_RULES: {
  category: TaskCategory;
  idPrefixes: string[];
  exactIds?: string[];
}[] = [
  { category: "food_quality", idPrefixes: ["food_"] },
  {
    category: "cleanliness",
    idPrefixes: ["amb_"],
    exactIds: ["amb_cleanliness", "home_cleanliness", "fit_cleanliness"],
  },
  {
    category: "speed",
    idPrefixes: ["op_"],
    exactIds: ["op_wait", "op_wait_time", "op_timeliness"],
  },
  {
    category: "takeaway",
    idPrefixes: ["op_"],
    exactIds: ["op_takeout", "op_takeaway", "op_packaging", "op_delivery"],
  },
  { category: "ordering", idPrefixes: ["op_"] },
  {
    category: "service",
    idPrefixes: [
      "service_",
      "dent_",
      "salon_",
      "med_",
      "auto_",
      "fit_",
      "dealer_",
      "elec_",
      "home_",
      "other_",
    ],
  },
  { category: "ambience", idPrefixes: ["amb_"] },
  { category: "value", idPrefixes: ["value_"] },
  { category: "drinks", idPrefixes: ["drink_"] },
];

/** Free-text fallback, ordered from most specific/actionable to most generic. */
const TEXT_RULES: { category: TaskCategory; text: RegExp }[] = [
  {
    category: "cleanliness",
    text: /\b(clean|cleanliness|dirty|hygiene|hygienic|restroom|washroom|toilet|smell|smelly|odou?r|sticky|grimy|hair\s*in)\b/i,
  },
  {
    category: "speed",
    text: /\b(wait|waited|waiting|slow|delay|delayed|late|timing|took\s+(?:so\s+)?long|quick|fast|speed)\b/i,
  },
  {
    category: "takeaway",
    text: /\b(takeaway|take-away|take\s*out|parcel|delivery|packag|container|leak|spill)\b/i,
  },
  {
    category: "ordering",
    text: /\b(order|ordered|wrong|missing|forgot|incorrect|billing|bill|invoice|charge)\b/i,
  },
  {
    category: "service",
    text: /\b(service|staff|waiter|waitress|manager|rude|behavio?ur|attitude|friendly|attentive|ignored|unprofessional|hospitality)\b/i,
  },
  {
    category: "value",
    text: /\b(price|pricing|cost|costly|expensive|overpriced|value|worth|cheap)\b/i,
  },
  {
    category: "drinks",
    text: /\b(drink|drinks|cocktail|cocktails|mocktail|wine|beer|beverage|bar|whisk(?:y|ey)|spirits)\b/i,
  },
  {
    category: "ambience",
    text: /\b(ambience|ambiance|atmosphere|music|noise|noisy|lighting|light|seating|comfort|chair|table|decor|crowded)\b/i,
  },
  {
    // Food-specific attributes only. Generic words like "food" are handled
    // afterwards so "waited for the food" classifies as speed, not food.
    category: "food_quality",
    text: /\b(taste|tasty|flavour|flavor|seasoning|portion|stale|cold|undercooked|overcooked|raw|bland|cooked|fresh|freshness|presentation)\b/i,
  },
];

const GENERIC_FOOD_TEXT = /\b(food|meal|dish|cuisine)\b/i;

export interface ClassifyFeedbackInput {
  rating: number;
  selectedIds?: string[] | null;
  text?: string | null;
  isCriticalSafety?: boolean;
}

export interface FeedbackClassification {
  category: TaskCategory;
  label: string;
  /** Stable key used to merge recurring issues of the same category. */
  issueKey: string;
}

function result(category: TaskCategory): FeedbackClassification {
  return {
    category,
    label: TASK_CATEGORY_LABELS[category],
    issueKey: category,
  };
}

export function classifyFeedback(input: ClassifyFeedbackInput): FeedbackClassification {
  if (input.isCriticalSafety) {
    return result("safety");
  }

  const ids = (input.selectedIds || []).filter((id) => typeof id === "string");

  // Match the customer's explicit option choices first.
  for (const rule of ID_RULES) {
    const matched = ids.some((id) => {
      if (rule.exactIds?.includes(id)) return true;
      // When a rule has exact IDs it must not claim every sibling prefix
      // (e.g. `op_` belongs to ordering only after wait/takeaway checks).
      if (rule.exactIds) return false;
      return rule.idPrefixes.some((prefix) => id.startsWith(prefix));
    });
    if (matched) return result(rule.category);
  }

  const text = (input.text || "").trim();
  if (text) {
    for (const rule of TEXT_RULES) {
      if (rule.text.test(text)) return result(rule.category);
    }
    if (GENERIC_FOOD_TEXT.test(text)) return result("food_quality");
  }

  // A silent low rating is still worth tracking so repeat patterns escalate.
  if (input.rating <= 2 && !text) {
    return { category: "other", label: "Low rating (no detail)", issueKey: "low_rating_no_detail" };
  }

  return result("other");
}
