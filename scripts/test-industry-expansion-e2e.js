/**
 * Industry-expansion end-to-end checks.
 *
 * Creates disposable owner accounts (never a real customer) and verifies that:
 * 1. every new business type is accepted by the API and Prisma enum;
 * 2. the public feedback payload keeps the selected industry;
 * 3. profile-specific answers produce the right operational task category;
 * 4. non-food profiles never inherit the restaurant "Food quality" bucket.
 *
 * Run against a local server started with `npm run dev` in `server/`.
 */

const API_BASE = process.env.API_BASE || "http://localhost:4000/api";

async function request(method, path, data = null, token = null) {
  const headers = {};
  if (data) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`  PASS  ${message}`);
}

const CASES = [
  {
    industry: "CAFE",
    topics: ["Filter Coffee", "Croissant", "Cold Brew"],
    subOptions: ["cafe_speed", "cafe_coffee"],
    text: "Waited 25 minutes for a filter coffee and it arrived cold.",
    expectedCategories: ["speed", "food_quality"],
  },
  {
    industry: "HOTEL",
    topics: ["Deluxe Room", "Breakfast Buffet", "Airport Pickup"],
    subOptions: ["hotel_cleanliness", "hotel_bathroom"],
    text: "The room was dirty and the bathroom towel had stains.",
    expectedCategories: ["cleanliness"],
  },
  {
    industry: "ELECTRONICS_REPAIR",
    topics: ["Phone Screen Replacement", "Laptop Service", "Battery Replacement"],
    subOptions: ["erep_quality", "erep_rework"],
    text: "Phone repair failed; the same problem returned the next day.",
    expectedCategories: ["workmanship", "after_sales"],
  },
  {
    industry: "ELECTRICAL",
    topics: ["House Wiring", "MCB Installation", "Safety Inspection"],
    subOptions: ["electric_safety", "electric_earthing"],
    text: "There was a spark from the switchboard and the wiring looked unsafe.",
    expectedCategories: ["safety"],
  },
  {
    industry: "RETAIL",
    topics: ["School Shoes", "Sports Shoes", "Accessories"],
    subOptions: ["retail_stock", "retail_response"],
    text: "The item was out of stock and staff could not help me find an alternative.",
    expectedCategories: ["stock", "service"],
  },
];

async function run() {
  console.log("============================================================");
  console.log("BEYONDVYU INDUSTRY EXPANSION E2E");
  console.log("============================================================\n");

  const timestamp = Date.now();

  for (const testCase of CASES) {
    console.log(`[${testCase.industry}]`);
    const email = `industry-${testCase.industry.toLowerCase()}-${timestamp}@test-beyondvyu.internal`;
    const password = `Industry#${timestamp}!`;

    const signup = await request("POST", "/auth/signup", {
      email,
      password,
      name: `${testCase.industry} test owner`,
    });
    assert(signup.status === 201, `disposable owner created (${signup.status})`);
    const token = signup.body.token;

    const businessName = `${testCase.industry} Test ${timestamp}`;
    const created = await request("POST", "/businesses", {
      name: businessName,
      industry: testCase.industry,
      promptTopics: testCase.topics,
      phoneNumber: "+15550198234",
    }, token);
    assert(created.status === 201, `business created with industry ${testCase.industry}`);
    const business = created.body.business;
    assert(business.industry === testCase.industry, `industry persisted as ${testCase.industry}`);

    const publicRes = await request("GET", `/feedback/public/${business.slug}`);
    assert(publicRes.status === 200, "public feedback endpoint returned 200");
    assert(publicRes.body.business.industry === testCase.industry, "public payload keeps the industry");

    const submitted = await request("POST", "/feedback/submit", {
      businessSlug: business.slug,
      rating: 1,
      privateNote: testCase.text,
      selectedSubOptions: testCase.subOptions,
      customerName: "Disposable Test Guest",
    });
    assert(submitted.status === 201, "negative feedback submitted");

    const tasks = await request("GET", `/v2/tasks/tasks/${business.id}`, null, token);
    assert(tasks.status === 200, "tasks endpoint returned 200");
    const task = (tasks.body.tasks || []).find((item) => item.referenceId === submitted.body.feedback.id);
    assert(Boolean(task), "an operational task was created");
    assert(
      testCase.expectedCategories.includes(task.category),
      `task category "${task.category}" is one of ${testCase.expectedCategories.join(", ")}`,
    );
    assert(task.category !== "food_quality" || testCase.industry === "CAFE", "no restaurant bucket leaked into this profile");
    console.log(`        category=${task.category} priority=${task.priority} source=${task.source}\n`);
  }

  console.log("============================================================");
  console.log("ALL INDUSTRY EXPANSION E2E CHECKS PASSED");
  console.log("============================================================\n");
}

run().catch((err) => {
  console.error("Industry expansion E2E failed:", err.message);
  process.exit(1);
});
