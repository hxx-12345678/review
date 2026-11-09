import assert from "node:assert/strict";
import {
  businessServesAlcohol,
  getDefaultCategoryIds,
  getEffectiveCategoryIds,
  getMCQCategories,
  getSignatureItems,
} from "./industry-categories";

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

test("restaurant default options exclude Drinks & Bar", () => {
  const ids = getMCQCategories("RESTAURANT").map((category) => category.id);
  assert.ok(ids.includes("food"));
  assert.ok(ids.includes("operations"));
  assert.ok(!ids.includes("drinks"));
});

test("bar-style restaurants get Drinks & Bar automatically", () => {
  assert.equal(businessServesAlcohol("The Gallery Kitchen & Bar"), true);
  assert.equal(businessServesAlcohol("The Gallery Cafe"), false);
  const ids = getMCQCategories("RESTAURANT", { businessName: "The Gallery Kitchen & Bar" }).map(
    (category) => category.id,
  );
  assert.ok(ids.includes("drinks"));
});

test("an alcohol word inside a dish does not imply a bar programme", () => {
  assert.equal(businessServesAlcohol("The Gallery Cafe", ["Beer Battered Fish"]), false);
  assert.equal(businessServesAlcohol("The Gallery Cafe", ["Cocktail Prawns"]), false);
  assert.equal(businessServesAlcohol("The Gallery Cafe", ["House IPA"]), true);
  assert.equal(businessServesAlcohol("The Gallery Cafe", ["Wine & Beer"]), true);
  const ids = getMCQCategories("RESTAURANT", {
    businessName: "The Gallery Cafe",
    promptTopics: ["Beer Battered Fish"],
  }).map((category) => category.id);
  assert.ok(!ids.includes("drinks"));
});

test("owner category selection is honoured", () => {
  const categories = getMCQCategories("RESTAURANT", {
    enabledCategoryIds: ["food", "value"],
    businessName: "The Gallery Cafe",
  });
  assert.deepEqual(
    categories.map((category) => category.id),
    ["food", "value"],
  );
});

test("stale/empty selection falls back to industry defaults", () => {
  assert.deepEqual(
    getEffectiveCategoryIds("RESTAURANT", ["treatment"]),
    getDefaultCategoryIds("RESTAURANT"),
  );
});

test("custom topics are appended for that business only", () => {
  const categories = getMCQCategories("RESTAURANT", {
    enabledCategoryIds: ["food"],
    customTopics: ["Jain options", "Parking", "jain options", "Dr. Mehta"],
    businessName: "The Gallery Cafe",
  });
  const custom = categories.find((category) => category.id === "custom_topics");
  assert.ok(custom);
  assert.deepEqual(
    custom!.subOptions.map((option) => option.label),
    ["Jain options", "Parking"],
  );
  assert.ok(custom!.subOptions.every((option) => option.id.startsWith("custom_topic_")));
});

test("custom topics that duplicate built-in options are skipped", () => {
  const categories = getMCQCategories("RESTAURANT", {
    enabledCategoryIds: ["food"],
    customTopics: ["Taste & Flavor"],
    businessName: "The Gallery Cafe",
  });
  assert.equal(categories.some((category) => category.id === "custom_topics"), false);
});

test("generic legacy topics never appear as signature dish chips", () => {
  const items = getSignatureItems([
    "A standout dish",
    "Service speed",
    "Atmosphere",
    "Value",
    "Quality",
    "Friendly staff",
    "Truffle Burger",
    "House IPA",
    "Crème Brûlée",
  ]);
  assert.deepEqual(items, ["Truffle Burger", "House IPA", "Crème Brûlée"]);
});

test("dental signatures keep real treatments", () => {
  assert.deepEqual(
    getSignatureItems(["Root Canal", "Friendly staff", "Wait time", "HydraFacial"]),
    ["Root Canal", "HydraFacial"],
  );
});

test("the two seeded restaurant formats get different option sets", () => {
  const cafe = getMCQCategories("RESTAURANT", { businessName: "The Gallery Cafe" }).map((c) => c.id);
  const bar = getMCQCategories("RESTAURANT", { businessName: "The Gallery Kitchen & Bar" }).map(
    (c) => c.id,
  );
  assert.ok(!cafe.includes("drinks"));
  assert.ok(bar.includes("drinks"));
});

console.log(`\n${passed} client review-option tests passed`);
