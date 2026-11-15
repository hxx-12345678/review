/**
 * Deterministic business-type inference from Google Places data.
 *
 * Google's `types` array is a strong signal, but generic values such as
 * `store` or `service` are deliberately ambiguous. We combine the primary
 * type, every secondary type, and the business name, then return evidence so
 * the owner can see why a profile was suggested and correct it in one click.
 *
 * This is a suggestion only. The onboarding UI never blocks manual choice and
 * the server validates the final value against the Prisma Industry enum.
 */

import {
  defaultCategoryIds,
  type ReviewIndustry,
} from "./review-options";

export type InferenceConfidence = "high" | "medium" | "low";

export interface BusinessTypeInference {
  industry: ReviewIndustry;
  label: string;
  confidence: InferenceConfidence;
  evidence: string[];
  primaryType: string | null;
  types: string[];
  defaultCategoryIds: string[];
}

export const REVIEW_INDUSTRY_LABELS: Record<ReviewIndustry, string> = {
  RESTAURANT: "Restaurant",
  CAFE: "Café / Coffee shop",
  BAKERY: "Bakery / Desserts",
  QUICK_SERVICE: "Quick service / Takeaway",
  HOTEL: "Hotel / Lodging",
  DENTAL: "Dental practice",
  SALON: "Salon / Spa",
  MEDICAL: "Medical clinic",
  AUTO: "Auto repair / Garage",
  AUTO_DEALER: "Automobile showroom / Dealer",
  FITNESS: "Gym / Fitness",
  ELECTRONICS: "Electronics store",
  ELECTRONICS_REPAIR: "Electronics repair",
  ELECTRICAL: "Electrician / Electrical contractor",
  ELECTRICAL_RETAIL: "Electrical shop",
  HOME_SERVICES: "Home services",
  RETAIL: "Retail store",
  EDUCATION: "School / Education",
  PET_CARE: "Pet care / Veterinary",
  REAL_ESTATE: "Real estate",
  PROFESSIONAL_SERVICES: "Professional services",
  OTHER: "Other",
};

const FOOD_PROFILES = new Set<ReviewIndustry>([
  "RESTAURANT",
  "CAFE",
  "BAKERY",
  "QUICK_SERVICE",
]);

const GENERIC_TYPES = new Set([
  "store",
  "point_of_interest",
  "establishment",
  "premise",
  "food",
  "health",
  "business",
  "service",
]);

/**
 * Official Places API (New) type values mapped to the closest review profile.
 * Food/retail/service defaults are intentionally conservative; name signals
 * refine them below.
 */
const TYPE_TO_INDUSTRY: Record<string, ReviewIndustry> = {
  // Food & drink
  cafe: "CAFE",
  coffee_shop: "CAFE",
  coffee_stand: "CAFE",
  coffee_roastery: "CAFE",
  tea_house: "CAFE",
  tea_store: "CAFE",
  cafeteria: "CAFE",
  internet_cafe: "CAFE",
  cat_cafe: "CAFE",
  dog_cafe: "CAFE",
  juice_shop: "CAFE",
  acai_shop: "CAFE",
  bakery: "BAKERY",
  cake_shop: "BAKERY",
  pastry_shop: "BAKERY",
  dessert_shop: "BAKERY",
  donut_shop: "BAKERY",
  confectionery: "BAKERY",
  candy_store: "BAKERY",
  chocolate_shop: "BAKERY",
  ice_cream_shop: "BAKERY",
  fast_food_restaurant: "QUICK_SERVICE",
  meal_takeaway: "QUICK_SERVICE",
  meal_delivery: "QUICK_SERVICE",
  food_court: "QUICK_SERVICE",
  sandwich_shop: "QUICK_SERVICE",
  pizza_delivery: "QUICK_SERVICE",
  hamburger_restaurant: "QUICK_SERVICE",
  snack_bar: "QUICK_SERVICE",
  kebab_shop: "QUICK_SERVICE",
  shawarma_restaurant: "QUICK_SERVICE",
  falafel_restaurant: "QUICK_SERVICE",
  restaurant: "RESTAURANT",
  fine_dining_restaurant: "RESTAURANT",
  pizza_restaurant: "RESTAURANT",
  breakfast_restaurant: "RESTAURANT",
  brunch_restaurant: "RESTAURANT",
  buffet_restaurant: "RESTAURANT",
  steak_house: "RESTAURANT",
  seafood_restaurant: "RESTAURANT",
  sushi_restaurant: "RESTAURANT",
  ramen_restaurant: "RESTAURANT",
  noodle_shop: "RESTAURANT",
  italian_restaurant: "RESTAURANT",
  indian_restaurant: "RESTAURANT",
  chinese_restaurant: "RESTAURANT",
  japanese_restaurant: "RESTAURANT",
  korean_restaurant: "RESTAURANT",
  thai_restaurant: "RESTAURANT",
  vietnamese_restaurant: "RESTAURANT",
  mexican_restaurant: "RESTAURANT",
  middle_eastern_restaurant: "RESTAURANT",
  mediterranean_restaurant: "RESTAURANT",
  greek_restaurant: "RESTAURANT",
  french_restaurant: "RESTAURANT",
  spanish_restaurant: "RESTAURANT",
  afghani_restaurant: "RESTAURANT",
  african_restaurant: "RESTAURANT",
  american_restaurant: "RESTAURANT",
  asian_restaurant: "RESTAURANT",
  barbecue_restaurant: "RESTAURANT",
  brazilian_restaurant: "RESTAURANT",
  dessert_restaurant: "RESTAURANT",
  diner: "RESTAURANT",
  gastropub: "RESTAURANT",
  bar_and_grill: "RESTAURANT",
  bar: "RESTAURANT",
  pub: "RESTAURANT",
  brewery: "RESTAURANT",
  brewpub: "RESTAURANT",
  cocktail_bar: "RESTAURANT",
  wine_bar: "RESTAURANT",
  sports_bar: "RESTAURANT",
  lounge_bar: "RESTAURANT",
  hookah_bar: "RESTAURANT",
  beer_garden: "RESTAURANT",
  // Lodging
  hotel: "HOTEL",
  motel: "HOTEL",
  resort_hotel: "HOTEL",
  extended_stay_hotel: "HOTEL",
  budget_hotel: "HOTEL",
  guest_house: "HOTEL",
  bed_and_breakfast: "HOTEL",
  inn: "HOTEL",
  hostel: "HOTEL",
  campground: "HOTEL",
  rv_park: "HOTEL",
  lodging: "HOTEL",
  // Health
  dentist: "DENTAL",
  dental_clinic: "DENTAL",
  doctor: "MEDICAL",
  medical_clinic: "MEDICAL",
  medical_center: "MEDICAL",
  hospital: "MEDICAL",
  physiotherapist: "MEDICAL",
  chiropractor: "MEDICAL",
  medical_lab: "MEDICAL",
  // Beauty
  beauty_salon: "SALON",
  hair_salon: "SALON",
  nail_salon: "SALON",
  barber_shop: "SALON",
  spa: "SALON",
  massage: "SALON",
  skin_care_clinic: "SALON",
  hair_care: "SALON",
  // Fitness
  gym: "FITNESS",
  fitness_center: "FITNESS",
  yoga_studio: "FITNESS",
  pilates_studio: "FITNESS",
  personal_trainer: "FITNESS",
  sports_complex: "FITNESS",
  swimming_pool: "FITNESS",
  rock_climbing_gym: "FITNESS",
  martial_arts_school: "FITNESS",
  // Auto
  car_repair: "AUTO",
  car_wash: "AUTO",
  tire_shop: "AUTO",
  auto_parts_store: "AUTO",
  auto_body_shop: "AUTO",
  car_dealer: "AUTO_DEALER",
  used_car_dealer: "AUTO_DEALER",
  new_car_dealer: "AUTO_DEALER",
  truck_dealer: "AUTO_DEALER",
  motorcycle_dealer: "AUTO_DEALER",
  recreational_vehicle_dealer: "AUTO_DEALER",
  boat_dealer: "AUTO_DEALER",
  // Electronics
  electronics_store: "ELECTRONICS",
  cell_phone_store: "ELECTRONICS",
  mobile_phone_store: "ELECTRONICS",
  computer_store: "ELECTRONICS",
  home_appliance_store: "ELECTRONICS",
  appliance_store: "ELECTRONICS",
  camera_store: "ELECTRONICS",
  audio_visual_equipment_store: "ELECTRONICS",
  video_game_store: "ELECTRONICS",
  // Electrical / trade retail
  electrician: "ELECTRICAL",
  hardware_store: "ELECTRICAL_RETAIL",
  home_improvement_store: "ELECTRICAL_RETAIL",
  building_materials_store: "ELECTRICAL_RETAIL",
  lumber_store: "ELECTRICAL_RETAIL",
  plumbing_supply_store: "ELECTRICAL_RETAIL",
  electrical_supply_store: "ELECTRICAL_RETAIL",
  // Home services
  plumber: "HOME_SERVICES",
  painter: "HOME_SERVICES",
  roofing_contractor: "HOME_SERVICES",
  general_contractor: "HOME_SERVICES",
  locksmith: "HOME_SERVICES",
  moving_company: "HOME_SERVICES",
  storage: "HOME_SERVICES",
  laundry: "HOME_SERVICES",
  dry_cleaning: "HOME_SERVICES",
  cleaning_service: "HOME_SERVICES",
  pest_control_service: "HOME_SERVICES",
  landscaper: "HOME_SERVICES",
  gardener: "HOME_SERVICES",
  flooring_contractor: "HOME_SERVICES",
  hvac_contractor: "HOME_SERVICES",
  // Retail
  store: "RETAIL",
  shopping_mall: "RETAIL",
  department_store: "RETAIL",
  supermarket: "RETAIL",
  grocery_store: "RETAIL",
  convenience_store: "RETAIL",
  clothing_store: "RETAIL",
  shoe_store: "RETAIL",
  jewelry_store: "RETAIL",
  book_store: "RETAIL",
  florist: "RETAIL",
  gift_shop: "RETAIL",
  furniture_store: "RETAIL",
  pet_store: "PET_CARE",
  toy_store: "RETAIL",
  sporting_goods_store: "RETAIL",
  garden_center: "RETAIL",
  liquor_store: "RETAIL",
  pharmacy: "RETAIL",
  drugstore: "RETAIL",
  // Education
  school: "EDUCATION",
  primary_school: "EDUCATION",
  secondary_school: "EDUCATION",
  university: "EDUCATION",
  preschool: "EDUCATION",
  educational_institution: "EDUCATION",
  academy: "EDUCATION",
  tutoring_service: "EDUCATION",
  language_school: "EDUCATION",
  driving_school: "EDUCATION",
  music_school: "EDUCATION",
  art_school: "EDUCATION",
  dance_school: "EDUCATION",
  // Pet care
  veterinary_care: "PET_CARE",
  veterinarian: "PET_CARE",
  pet_groomer: "PET_CARE",
  pet_boarding_service: "PET_CARE",
  animal_shelter: "PET_CARE",
  dog_park: "PET_CARE",
  // Real estate
  real_estate_agency: "REAL_ESTATE",
  real_estate_consultant: "REAL_ESTATE",
  // Professional services
  lawyer: "PROFESSIONAL_SERVICES",
  accounting: "PROFESSIONAL_SERVICES",
  accounting_firm: "PROFESSIONAL_SERVICES",
  insurance_agency: "PROFESSIONAL_SERVICES",
  travel_agency: "PROFESSIONAL_SERVICES",
  finance: "PROFESSIONAL_SERVICES",
  bank: "PROFESSIONAL_SERVICES",
  consultant: "PROFESSIONAL_SERVICES",
  notary: "PROFESSIONAL_SERVICES",
  employment_agency: "PROFESSIONAL_SERVICES",
  marketing_agency: "PROFESSIONAL_SERVICES",
  advertising_agency: "PROFESSIONAL_SERVICES",
  architect: "PROFESSIONAL_SERVICES",
};

const NAME_PATTERNS: { industry: ReviewIndustry; pattern: RegExp; label: string }[] = [
  { industry: "DENTAL", pattern: /\b(dental|dentist|orthodont|smile)\b/i, label: "name mentions dental" },
  { industry: "PET_CARE", pattern: /\b(veterinar|pet\s*(?:clinic|care|store|shop|groom|boarding))\b/i, label: "name mentions pet care" },
  { industry: "HOTEL", pattern: /\b(hotel|motel|resort|guest\s*house|homestay|lodging|suites?)\b/i, label: "name mentions lodging" },
  { industry: "CAFE", pattern: /\b(cafe|café|coffee|espresso|tea\s*house|tea\s*room)\b/i, label: "name mentions café" },
  { industry: "BAKERY", pattern: /\b(bakery|bakehouse|patisserie|pastry|cake\s*shop|dessert|creamery)\b/i, label: "name mentions bakery" },
  { industry: "QUICK_SERVICE", pattern: /\b(qsr|fast\s*food|takeaway|take\s*away|express|food\s*court)\b/i, label: "name mentions quick service" },
  { industry: "ELECTRONICS_REPAIR", pattern: /\b(?:(?:mobile|phone|laptop|computer|tv|television|appliance|electronics?|gadget)\s*(?:repair|service)|(?:repair|service)\s*cent(?:er|re)\s*(?:for\s*)?(?:mobile|phone|laptop|computer|electronics?))\b/i, label: "name mentions electronics repair" },
  { industry: "HOME_SERVICES", pattern: /\b(plumb(?:er|ing)?|paint(?:er|ing)?|roof(?:ing|er)?|contractor|cleaning|pest\s*control|laundry|dry\s*clean|packers?|movers?|hvac|air\s*condition(?:ing|er)?|ac\s*(?:repair|service)|appliance\s*repair)\b/i, label: "name mentions home services" },
  { industry: "ELECTRICAL_RETAIL", pattern: /\b(electricals?|electric\s*shop|wires?|cables?|switchgear)\b/i, label: "name mentions electrical retail" },
  { industry: "ELECTRICAL", pattern: /\b(electrician|electrical\s*(?:contractor|services?|works?))\b/i, label: "name mentions electrician" },
  { industry: "SALON", pattern: /\b(salon|spa|beauty|hair|nails?|barber)\b/i, label: "name mentions salon" },
  { industry: "FITNESS", pattern: /\b(gym|fitness|yoga|pilates|crossfit)\b/i, label: "name mentions fitness" },
  { industry: "AUTO_DEALER", pattern: /\b(dealer|showroom|motors?)\b/i, label: "name mentions dealer" },
  { industry: "AUTO", pattern: /\b(auto|garage|mechanic|car\s*repair|tyre|tire|body\s*shop|workshop)\b/i, label: "name mentions auto repair" },
  { industry: "EDUCATION", pattern: /\b(academy|school|college|institute|tuition|coaching)\b/i, label: "name mentions education" },
  { industry: "REAL_ESTATE", pattern: /\b(real\s*estate|property|realtor|estate\s*agent)\b/i, label: "name mentions real estate" },
  { industry: "PROFESSIONAL_SERVICES", pattern: /\b(law|legal|account|tax|consult|insurance|finance|advisory)\b/i, label: "name mentions professional services" },
  { industry: "MEDICAL", pattern: /\b(clinic|hospital|doctor|medical|physio)\b/i, label: "name mentions medical" },
];

function cleanTypes(primaryType?: string | null, types?: string[] | null): { primary: string | null; all: string[] } {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "_");
  const primary = primaryType ? normalize(primaryType) : null;
  const all = Array.from(
    new Set([...(types || []).map(normalize), ...(primary ? [primary] : [])].filter(Boolean)),
  );
  return { primary, all };
}

function nameSignal(name: string, allowed?: Set<ReviewIndustry>) {
  for (const rule of NAME_PATTERNS) {
    if (allowed && !allowed.has(rule.industry)) continue;
    if (rule.pattern.test(name)) return rule;
  }
  return null;
}

function buildResult(
  industry: ReviewIndustry,
  confidence: InferenceConfidence,
  evidence: string[],
  primary: string | null,
  all: string[],
  name: string,
): BusinessTypeInference {
  return {
    industry,
    label: REVIEW_INDUSTRY_LABELS[industry],
    confidence,
    evidence: evidence.slice(0, 5),
    primaryType: primary,
    types: all,
    defaultCategoryIds: defaultCategoryIds(industry, { name }),
  };
}

export function inferBusinessType(input: {
  name?: string | null;
  primaryType?: string | null;
  types?: string[] | null;
}): BusinessTypeInference {
  const name = (input.name || "").trim();
  const { primary, all } = cleanTypes(input.primaryType, input.types);
  const specificTypes = all.filter((type) => !GENERIC_TYPES.has(type));
  const evidence: string[] = [];

  if (primary) evidence.push(`Google primary type: ${primary}`);
  for (const type of specificTypes.filter((type) => type !== primary).slice(0, 3)) {
    evidence.push(`Google type: ${type}`);
  }

  const primaryIndustry =
    primary && !GENERIC_TYPES.has(primary) ? TYPE_TO_INDUSTRY[primary] : undefined;
  const mappedTypes = specificTypes
    .map((type) => ({ type, industry: TYPE_TO_INDUSTRY[type] }))
    .filter((item): item is { type: string; industry: ReviewIndustry } => Boolean(item.industry));

  // 1. A specific primary type is the strongest signal. Refine only within
  //    the same family (e.g. a café named "Coffee House" stays CAFE).
  if (primaryIndustry) {
    if (FOOD_PROFILES.has(primaryIndustry)) {
      const signal = nameSignal(name, FOOD_PROFILES);
      if (signal && signal.industry !== primaryIndustry) {
        evidence.push(signal.label);
        return buildResult(signal.industry, "high", evidence, primary, all, name);
      }
      return buildResult(primaryIndustry, "high", evidence, primary, all, name);
    }

    if (primaryIndustry === "ELECTRONICS") {
      const signal = nameSignal(name, new Set<ReviewIndustry>(["ELECTRONICS_REPAIR"]));
      if (signal) {
        evidence.push(signal.label);
        return buildResult(signal.industry, "high", evidence, primary, all, name);
      }
    }

    if (primaryIndustry === "ELECTRICAL_RETAIL") {
      const signal = nameSignal(name, new Set<ReviewIndustry>(["ELECTRICAL_RETAIL"]));
      if (signal) {
        evidence.push(signal.label);
        return buildResult(signal.industry, "high", evidence, primary, all, name);
      }
      // A hardware/building store that is not explicitly electrical is retail.
      evidence.push("hardware/building store without an electrical name signal");
      return buildResult("RETAIL", "medium", evidence, primary, all, name);
    }

    if (primaryIndustry === "AUTO" && /\b(dealer|showroom)\b/i.test(name)) {
      evidence.push("name mentions dealer/showroom");
      return buildResult("AUTO_DEALER", "high", evidence, primary, all, name);
    }

    return buildResult(primaryIndustry, "high", evidence, primary, all, name);
  }

  // 2. No usable primary type: use the most specific secondary type.
  const byType = mappedTypes.find((item) => item.industry !== "RETAIL") || mappedTypes[0];
  if (byType) {
    if (byType.industry === "ELECTRONICS") {
      const signal = nameSignal(name, new Set<ReviewIndustry>(["ELECTRONICS_REPAIR"]));
      if (signal) {
        evidence.push(signal.label);
        return buildResult(signal.industry, "medium", evidence, primary, all, name);
      }
    }
    if (byType.industry === "ELECTRICAL_RETAIL" && /\b(electricals?|electric\s*shop)\b/i.test(name)) {
      evidence.push("name mentions electrical retail");
      return buildResult("ELECTRICAL_RETAIL", "medium", evidence, primary, all, name);
    }
    return buildResult(byType.industry, "medium", evidence, primary, all, name);
  }

  // 3. Generic Google types only: the name is the only honest signal left.
  const signal = nameSignal(name);
  if (signal) {
    evidence.push(signal.label);
    return buildResult(signal.industry, "medium", evidence, primary, all, name);
  }

  if (specificTypes.length === 0) {
    evidence.push("Google returned only generic types");
  }
  return buildResult("OTHER", "low", evidence, primary, all, name);
}
