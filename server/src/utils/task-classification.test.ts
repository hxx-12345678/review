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

test("all categories are declared and labelled consistently", () => {
  assert.equal(new Set(TASK_CATEGORIES).size, TASK_CATEGORIES.length);
});
