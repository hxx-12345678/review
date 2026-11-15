import assert from "node:assert/strict";
import {
  businessServesAlcohol,
  customTopicId,
  defaultCategoryIds,
  effectiveCategoryIds,
  sanitizeCustomReviewTopics,
  sanitizeEnabledCategories,
  sanitizeSelectedSubOptions,
} from "./review-options";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✔ ${name}`);
  } catch (err) {
    console.error(`✘ ${name}`);
    throw err;
  }
}

test("restaurant defaults exclude Drinks & Bar", () => {
  const ids = defaultCategoryIds("RESTAURANT");
  assert.ok(ids.includes("food"));
  assert.ok(ids.includes("operations"));
  assert.ok(!ids.includes("drinks"));
});

test("bar / brewery names opt into Drinks & Bar", () => {
  assert.equal(businessServesAlcohol("The Gallery Kitchen & Bar"), true);
  assert.equal(businessServesAlcohol("House of Brews", ["Craft IPA"]), true);
  assert.equal(businessServesAlcohol("Barbeque Nation"), false);
  assert.ok(defaultCategoryIds("RESTAURANT", { name: "The Gallery Kitchen & Bar" }).includes("drinks"));
});

test("an alcohol word inside a dish does not imply a bar programme", () => {
  assert.equal(businessServesAlcohol("The Gallery Cafe", ["Beer Battered Fish"]), false);
  assert.equal(businessServesAlcohol("The Gallery Cafe", ["Cocktail Prawns"]), false);
  assert.equal(businessServesAlcohol("The Gallery Cafe", ["House IPA"]), true);
  const kept = sanitizeSelectedSubOptions(
    "RESTAURANT",
    [],
    [],
    "The Gallery Cafe",
    ["Beer Battered Fish"],
    ["drink_cocktails", "food_taste"],
  );
  assert.deepEqual(kept, ["food_taste"]);
});

test("enabled categories are industry-scoped", () => {
  assert.deepEqual(sanitizeEnabledCategories("RESTAURANT", ["food", "drinks", "treatment"]), [
    "food",
    "drinks",
  ]);
  assert.deepEqual(sanitizeEnabledCategories("DENTAL", ["food", "treatment"]), ["treatment"]);
});

test("empty or stale config falls back to industry defaults", () => {
  assert.deepEqual(effectiveCategoryIds("RESTAURANT", []), defaultCategoryIds("RESTAURANT"));
  assert.deepEqual(effectiveCategoryIds("DENTAL", ["food"]), defaultCategoryIds("DENTAL"));
  assert.deepEqual(effectiveCategoryIds("DENTAL", ["treatment"]), ["treatment"]);
});

test("custom topics are cleaned, de-duplicated and policy-filtered", () => {
  const topics = sanitizeCustomReviewTopics([
    "Jain options",
    "  jain OPTIONS ",
    "Parking",
    "Ask for Rajesh",
    "Dr. Mehta",
    "x",
    "Staff names",
  ]);
  assert.deepEqual(topics, ["Jain options", "Parking"]);
  assert.equal(customTopicId("Jain options"), "custom_topic_jain-options");
});

test("selected IDs outside the business's enabled categories are dropped", () => {
  const kept = sanitizeSelectedSubOptions(
    "RESTAURANT",
    ["food", "service"], // bar disabled explicitly
    ["Jain options"],
    "The Gallery Cafe",
    ["Truffle Burger"],
    ["food_taste", "service_speed", "drink_cocktails", "dent_pain", customTopicId("Jain options")],
  );
  assert.deepEqual(kept, [
    "food_taste",
    "service_speed",
    customTopicId("Jain options"),
  ]);
});

test("bar businesses keep drink selections", () => {
  const kept = sanitizeSelectedSubOptions(
    "RESTAURANT",
    [],
    [],
    "The Gallery Kitchen & Bar",
    ["House IPA"],
    ["drink_cocktails", "food_taste"],
  );
  assert.deepEqual(kept, ["drink_cocktails", "food_taste"]);
});

test("cross-industry IDs are rejected", () => {
  const kept = sanitizeSelectedSubOptions(
    "DENTAL",
    [],
    [],
    "Brightsmile Dental Studio",
    [],
    ["dent_pain", "food_taste", "drink_wine"],
  );
  assert.deepEqual(kept, ["dent_pain"]);
});

test("new food profiles keep their own category IDs", () => {
  assert.deepEqual(sanitizeEnabledCategories("CAFE", ["beverages", "food", "treatment"]), [
    "beverages",
    "food",
  ]);
  assert.deepEqual(sanitizeEnabledCategories("BAKERY", ["products", "hygiene", "drinks"]), [
    "products",
    "hygiene",
  ]);
  assert.deepEqual(sanitizeEnabledCategories("QUICK_SERVICE", ["speed", "packaging"]), [
    "speed",
    "packaging",
  ]);
  assert.deepEqual(sanitizeEnabledCategories("HOTEL", ["room", "facilities", "food"]), [
    "room",
    "facilities",
  ]);
});

test("repair, retail, and service profiles reject each other's IDs", () => {
  const electronics = sanitizeSelectedSubOptions(
    "ELECTRONICS",
    [],
    [],
    "Croma Electronics",
    [],
    ["elec_quality", "elec_repair_quality", "erep_quality", "retail_stock"],
  );
  assert.deepEqual(electronics, ["elec_quality", "elec_repair_quality"]);

  const repair = sanitizeSelectedSubOptions(
    "ELECTRONICS_REPAIR",
    [],
    [],
    "Mobile Repair Hub",
    [],
    ["erep_quality", "elec_quality", "electric_safety"],
  );
  assert.deepEqual(repair, ["erep_quality"]);

  const electrical = sanitizeSelectedSubOptions(
    "ELECTRICAL",
    [],
    [],
    "SafeWire Electricals",
    [],
    ["electric_safety", "elecshop_genuine", "retail_stock"],
  );
  assert.deepEqual(electrical, ["electric_safety"]);
});

test("new profile aliases normalize to the right taxonomy", () => {
  assert.equal(defaultCategoryIds("COFFEE_SHOP").includes("beverages"), true);
  assert.equal(defaultCategoryIds("MOTEL").includes("room"), true);
  assert.equal(defaultCategoryIds("MOBILE_REPAIR").includes("data"), true);
  assert.equal(defaultCategoryIds("ELECTRICIAN").includes("safety"), true);
  assert.equal(defaultCategoryIds("SCHOOL").includes("teaching"), true);
  assert.equal(defaultCategoryIds("VET").includes("care"), true);
});

console.log(`\n${passed} review-option tests passed`);
