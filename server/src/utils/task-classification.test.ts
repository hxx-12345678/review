import assert from "node:assert/strict";
import test from "node:test";
import { classifyFeedback, TASK_CATEGORIES } from "./task-classification";

function category(input: Parameters<typeof classifyFeedback>[0]) {
  return classifyFeedback(input).category;
}

test("critical safety always wins, even with food keywords", () => {
  const result = classifyFeedback({
    rating: 1,
    selectedIds: ["food_taste"],
    text: "I had an allergic reaction and went to hospital",
    isCriticalSafety: true,
  });
  assert.equal(result.category, "safety");
  assert.equal(result.issueKey, "safety");
});

test("food tags map to food quality", () => {
  assert.equal(category({ rating: 4, selectedIds: ["food_taste"] }), "food_quality");
  assert.equal(category({ rating: 4, selectedIds: ["food_portion"] }), "food_quality");
});

test("service tags map to service", () => {
  assert.equal(category({ rating: 3, selectedIds: ["service_friendly"] }), "service");
});

test("operation wait tags map to speed, not generic ordering", () => {
  assert.equal(category({ rating: 2, selectedIds: ["op_wait"] }), "speed");
});

test("takeaway and packaging tags map to takeaway", () => {
  assert.equal(category({ rating: 3, selectedIds: ["op_takeout"] }), "takeaway");
});

test("other operation tags map to ordering", () => {
  assert.equal(category({ rating: 3, selectedIds: ["op_accuracy"] }), "ordering");
});

test("cleanliness tags map to cleanliness before ambience", () => {
  assert.equal(category({ rating: 2, selectedIds: ["amb_cleanliness"] }), "cleanliness");
  assert.equal(category({ rating: 2, selectedIds: ["amb_atmosphere"] }), "ambience");
});

test("value and drinks tags map to their own buckets", () => {
  assert.equal(category({ rating: 3, selectedIds: ["value_pricing"] }), "value");
  assert.equal(category({ rating: 4, selectedIds: ["drink_cocktails"] }), "drinks");
});

test("silent low ratings still get a recurrence key", () => {
  const result = classifyFeedback({ rating: 1, selectedIds: [] });
  assert.equal(result.category, "other");
  assert.equal(result.issueKey, "low_rating_no_detail");
});

test("text keywords classify without tags", () => {
  assert.equal(category({ rating: 2, text: "We waited 40 minutes for the food" }), "speed");
  assert.equal(category({ rating: 2, text: "The washroom was dirty and smelled" }), "cleanliness");
  assert.equal(category({ rating: 2, text: "The waiter was rude to us" }), "service");
  assert.equal(category({ rating: 2, text: "The order was wrong and a dish was missing" }), "ordering");
  assert.equal(category({ rating: 2, text: "Way too expensive for the portion" }), "value");
  assert.equal(category({ rating: 2, text: "The cocktail was watery" }), "drinks");
  assert.equal(category({ rating: 2, text: "The paneer was stale and cold" }), "food_quality");
});

test("positive feedback with no issue falls through to other", () => {
  assert.equal(category({ rating: 5, text: "Loved it, thank you" }), "other");
});

test("restaurant food words still behave exactly as before", () => {
  assert.equal(category({ rating: 2, selectedIds: ["food_taste"] }), "food_quality");
  assert.equal(category({ rating: 2, text: "Loved the coffee" }), "other");
});

test("café tags use café buckets instead of restaurant buckets", () => {
  assert.equal(category({ rating: 4, industry: "CAFE", selectedIds: ["cafe_coffee"] }), "food_quality");
  assert.equal(category({ rating: 3, industry: "CAFE", selectedIds: ["cafe_wifi"] }), "ambience");
  assert.equal(category({ rating: 2, industry: "CAFE", text: "Waited 20 minutes for my coffee" }), "speed");
});

test("bakery, QSR, and hotel never inherit restaurant-only buckets", () => {
  assert.equal(category({ rating: 3, industry: "BAKERY", selectedIds: ["bakery_packaging"] }), "takeaway");
  assert.equal(category({ rating: 3, industry: "QUICK_SERVICE", selectedIds: ["qs_order_accuracy"] }), "ordering");
  assert.equal(category({ rating: 2, industry: "HOTEL", selectedIds: ["hotel_bed"] }), "comfort");
  assert.equal(category({ rating: 2, industry: "HOTEL", selectedIds: ["hotel_ac"] }), "facilities");
});

test("repair shop and new-car dealer are classified separately", () => {
  assert.equal(category({ rating: 2, industry: "AUTO", selectedIds: ["auto_repair"] }), "workmanship");
  assert.equal(category({ rating: 3, industry: "AUTO_DEALER", selectedIds: ["dealer_test_drive"] }), "service");
  assert.equal(category({ rating: 3, industry: "AUTO_DEALER", selectedIds: ["dealer_financing"] }), "billing");
});

test("electronics sales and electronics repair are classified separately", () => {
  assert.equal(category({ rating: 2, industry: "ELECTRONICS", selectedIds: ["elec_quality"] }), "product_quality");
  assert.equal(category({ rating: 2, industry: "ELECTRONICS", selectedIds: ["elec_availability"] }), "stock");
  assert.equal(category({ rating: 2, industry: "ELECTRONICS_REPAIR", selectedIds: ["erep_quality"] }), "workmanship");
  assert.equal(category({ rating: 1, industry: "ELECTRONICS_REPAIR", selectedIds: ["erep_data_privacy"] }), "data_privacy");
});

test("electrician and electrical shop are classified separately", () => {
  assert.equal(category({ rating: 1, industry: "ELECTRICAL", selectedIds: ["electric_safety"] }), "safety");
  assert.equal(category({ rating: 2, industry: "ELECTRICAL", selectedIds: ["electric_quote"] }), "billing");
  assert.equal(category({ rating: 2, industry: "ELECTRICAL_RETAIL", selectedIds: ["elecshop_genuine"] }), "product_quality");
  assert.equal(category({ rating: 2, industry: "ELECTRICAL_RETAIL", selectedIds: ["elecshop_stock"] }), "stock");
  assert.equal(category({ rating: 2, industry: "ELECTRICAL_RETAIL", selectedIds: ["elecshop_billing"] }), "billing");
});

test("retail, education, pet care, real estate, and professional services have specific buckets", () => {
  assert.equal(category({ rating: 2, industry: "RETAIL", selectedIds: ["retail_stock"] }), "stock");
  assert.equal(category({ rating: 3, industry: "EDUCATION", selectedIds: ["edu_teaching"] }), "education_quality");
  assert.equal(category({ rating: 2, industry: "PET_CARE", selectedIds: ["pet_cleanliness"] }), "cleanliness");
  assert.equal(category({ rating: 2, industry: "REAL_ESTATE", selectedIds: ["re_paperwork"] }), "ordering");
  assert.equal(category({ rating: 2, industry: "PROFESSIONAL_SERVICES", selectedIds: ["prof_clarity"] }), "communication");
});

test("all categories are declared and labelled consistently", () => {
  assert.equal(new Set(TASK_CATEGORIES).size, TASK_CATEGORIES.length);
});
