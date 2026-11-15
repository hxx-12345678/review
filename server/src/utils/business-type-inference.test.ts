import assert from "node:assert/strict";
import test from "node:test";
import { inferBusinessType } from "./business-type-inference";

function industry(input: Parameters<typeof inferBusinessType>[0]) {
  return inferBusinessType(input).industry;
}

test("Google primary types map to the right review profile", () => {
  assert.equal(industry({ name: "Blue Tokai", primaryType: "cafe", types: ["cafe", "food", "store"] }), "CAFE");
  assert.equal(industry({ name: "The Bake House", primaryType: "bakery", types: ["bakery", "store"] }), "BAKERY");
  assert.equal(industry({ name: "Burger Point", primaryType: "fast_food_restaurant" }), "QUICK_SERVICE");
  assert.equal(industry({ name: "Taj Palace", primaryType: "hotel" }), "HOTEL");
  assert.equal(industry({ name: "Smile Dental", primaryType: "dentist" }), "DENTAL");
  assert.equal(industry({ name: "City Hospital", primaryType: "hospital" }), "MEDICAL");
  assert.equal(industry({ name: "Glow Salon", primaryType: "hair_salon" }), "SALON");
  assert.equal(industry({ name: "Iron Gym", primaryType: "gym" }), "FITNESS");
});

test("restaurant and bar types stay on the restaurant profile", () => {
  const result = inferBusinessType({
    name: "The Gallery Kitchen & Bar",
    primaryType: "bar",
    types: ["bar", "restaurant", "food"],
  });
  assert.equal(result.industry, "RESTAURANT");
  assert.ok(result.defaultCategoryIds.includes("drinks"));
});

test("auto repair vs new-car showroom are separated", () => {
  assert.equal(industry({ name: "Sharma Auto Garage", primaryType: "car_repair" }), "AUTO");
  assert.equal(industry({ name: "Sharma Motors Showroom", primaryType: "car_dealer" }), "AUTO_DEALER");
});

test("electronics sales vs repair are separated by name and type", () => {
  assert.equal(
    industry({ name: "Croma Electronics", primaryType: "electronics_store", types: ["electronics_store", "store"] }),
    "ELECTRONICS",
  );
  assert.equal(
    industry({ name: "Mobile Repair Hub", primaryType: "electronics_store", types: ["electronics_store", "store"] }),
    "ELECTRONICS_REPAIR",
  );
  assert.equal(industry({ name: "Phone Repair Centre", primaryType: "store", types: ["store"] }), "ELECTRONICS_REPAIR");
});

test("electrician vs electrical shop are separated", () => {
  assert.equal(industry({ name: "Ravi Electrician", primaryType: "electrician" }), "ELECTRICAL");
  assert.equal(
    industry({ name: "Sri Electricals", primaryType: "hardware_store", types: ["hardware_store", "store"] }),
    "ELECTRICAL_RETAIL",
  );
  assert.equal(
    industry({ name: "City Hardware", primaryType: "hardware_store", types: ["hardware_store", "store"] }),
    "RETAIL",
  );
});

test("generic Google types fall back to name evidence", () => {
  const result = inferBusinessType({ name: "Little Bakery", primaryType: "store", types: ["store", "food"] });
  assert.equal(result.industry, "BAKERY");
  assert.ok(result.evidence.some((item) => item.includes("name mentions")));
});

test("no usable signal falls back to OTHER with low confidence", () => {
  const result = inferBusinessType({ name: "Zenith Ventures", primaryType: "establishment", types: ["establishment"] });
  assert.equal(result.industry, "OTHER");
  assert.equal(result.confidence, "low");
});

test("inference returns category defaults for the suggested profile", () => {
  const cafe = inferBusinessType({ name: "Corner Coffee", primaryType: "cafe" });
  assert.ok(cafe.defaultCategoryIds.includes("beverages"));
  assert.ok(!cafe.defaultCategoryIds.includes("operations"));

  const hotel = inferBusinessType({ name: "Lake View Motel", primaryType: "motel" });
  assert.ok(hotel.defaultCategoryIds.includes("room"));
  assert.ok(!hotel.defaultCategoryIds.includes("food"));
});
