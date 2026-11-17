import assert from "assert";
import crypto from "crypto";
import {
  buildTemplateComponents,
  countPlaceholders,
  validateTemplatePolicy,
} from "./whatsapp.service";
import { verifyMetaSignature } from "./whatsapp.meta";

function expectThrow(fn: () => void, messagePart: string) {
  let caught: any = null;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  assert(caught, `Expected an error containing "${messagePart}"`);
  assert(
    String(caught.message || "").includes(messagePart),
    `Expected "${caught.message}" to contain "${messagePart}"`,
  );
}

// Placeholder parsing ---------------------------------------------------------
assert.deepStrictEqual(countPlaceholders("Hi {{1}}, order {{2}} is ready."), { count: 2 });
assert.deepStrictEqual(countPlaceholders("No variables here."), { count: 0 });
assert.deepStrictEqual(countPlaceholders("Repeat {{1}} and {{1}}."), { count: 1 });
assert(countPlaceholders("Gap {{1}} then {{3}}.").error, "Gap placeholders should be rejected");
assert(countPlaceholders("Start {{2}} then {{1}}.").error === undefined);

// Template components ---------------------------------------------------------
const built = buildTemplateComponents({
  headerText: "Hi {{1}}",
  bodyText: "Thank you {{1}} for visiting {{2}}.",
  footerText: "Reply STOP to opt out.",
  bodyExamples: ["Riya", "Sunrise Cafe"],
  headerExample: "Riya",
});
assert.strictEqual(built.parameterCount, 2);
assert.strictEqual(built.headerParameterCount, 1);
assert.deepStrictEqual((built.components as any[])[0], {
  type: "header",
  format: "TEXT",
  text: "Hi {{1}}",
  example: { header_text: ["Riya"] },
});
assert.deepStrictEqual((built.components as any[])[1], {
  type: "body",
  text: "Thank you {{1}} for visiting {{2}}.",
  example: { body_text: [["Riya", "Sunrise Cafe"]] },
});
assert.deepStrictEqual((built.components as any[])[2], {
  type: "footer",
  text: "Reply STOP to opt out.",
});

expectThrow(
  () =>
    buildTemplateComponents({
      bodyText: "Thank you {{1}} for visiting {{2}}.",
      bodyExamples: ["Riya"],
    }),
  "example value",
);
expectThrow(
  () =>
    buildTemplateComponents({
      headerText: "{{1}} and {{2}}",
      bodyText: "Body",
      headerExample: "Riya",
    }),
  "only one variable",
);

// Policy guards ---------------------------------------------------------------
validateTemplatePolicy({
  category: "UTILITY",
  useCase: "REVIEW_REQUEST",
  bodyText: "Hi {{1}}, thanks for visiting {{2}}. Would you share an honest review?",
});
expectThrow(
  () =>
    validateTemplatePolicy({
      category: "UTILITY",
      useCase: "REVIEW_REQUEST",
      bodyText: "Get 20% off for leaving a 5-star review.",
    }),
  "incentives",
);
expectThrow(
  () =>
    validateTemplatePolicy({
      category: "UTILITY",
      useCase: "OFFER",
      bodyText: "Sale this weekend.",
    }),
  "Marketing category",
);
expectThrow(
  () =>
    validateTemplatePolicy({
      category: "MARKETING",
      useCase: "PAYMENT_REMINDER",
      bodyText: "Your payment is pending.",
    }),
  "Utility category",
);
// Meta may treat a review request as Marketing. It is allowed, but the send
// path requires separate marketing opt-in for that category.
validateTemplatePolicy({
  category: "MARKETING",
  useCase: "REVIEW_REQUEST",
  bodyText: "Hi {{1}}, would you share an honest review of your visit to {{2}}?",
});
expectThrow(
  () =>
    validateTemplatePolicy({
      category: "UTILITY",
      useCase: "REVIEW_REQUEST",
      bodyText: "Please review us.",
    }),
  "at least one variable",
);
validateTemplatePolicy({
  category: "MARKETING",
  useCase: "CUSTOM",
  bodyText: "A general announcement.",
});

// Webhook signature -----------------------------------------------------------
process.env.WHATSAPP_APP_SECRET = "test_app_secret_for_signature";
const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
const validSignature =
  "sha256=" + crypto.createHmac("sha256", process.env.WHATSAPP_APP_SECRET).update(body).digest("hex");
assert.strictEqual(verifyMetaSignature(body, validSignature), true);
assert.strictEqual(verifyMetaSignature(body, "sha256=deadbeef"), false);
assert.strictEqual(verifyMetaSignature(body, undefined), false);
assert.strictEqual(
  verifyMetaSignature(body, validSignature.replace("sha256=", "")),
  false,
  "Signature must include the sha256= prefix",
);

console.log("WhatsApp unit tests passed");
