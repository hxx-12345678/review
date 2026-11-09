import assert from "node:assert/strict";
import test from "node:test";
import {
  localizeOptionLabel,
  localizeSignatureItemsLabel,
  localizeSpecialMentionPlaceholder,
  mcqText,
} from "./review-localization";

test("English and Hinglish keep the original option label", () => {
  assert.equal(localizeOptionLabel("Taste & Flavor", "english"), "Taste & Flavor");
  assert.equal(localizeOptionLabel("Taste & Flavor", "hinglish"), "Taste & Flavor");
});

test("restaurant option labels are translated for Hindi and Gujarati", () => {
  assert.equal(localizeOptionLabel("Taste & Flavor", "hindi"), "स्वाद और फ़्लेवर");
  assert.equal(localizeOptionLabel("Wait Time", "gujarati"), "રાહ જોવાનો સમય");
  assert.equal(localizeOptionLabel("Order Accuracy", "gujarati"), "ઓર્ડરની ચોકસાઈ");
});

test("unknown or owner-defined labels fall back to English", () => {
  assert.equal(localizeOptionLabel("Jain options", "gujarati"), "Jain options");
  assert.equal(localizeOptionLabel("House special", "hindi"), "House special");
});

test("signature headings are industry-aware", () => {
  assert.match(localizeSignatureItemsLabel("RESTAURANT", "gujarati"), /વાનગીઓ/);
  assert.match(localizeSignatureItemsLabel("DENTAL", "hindi"), /इलाज/);
  assert.equal(localizeSignatureItemsLabel("RESTAURANT", "english"), "");
});

test("special mention placeholders follow mood", () => {
  assert.match(localizeSpecialMentionPlaceholder("RESTAURANT", "negative", "hindi"), /सुधार/);
  assert.match(localizeSpecialMentionPlaceholder("RESTAURANT", "positive", "gujarati"), /વાનગી/);
});

test("MCQ UI strings translate, and English asks the caller for a fallback", () => {
  assert.equal(mcqText("gujarati", "continue"), "ડ્રાફ્ટ તરફ આગળ વધો");
  assert.equal(mcqText("hindi", "back"), "पीछे");
  assert.equal(mcqText("english", "back"), "");
});

test("review-draft screen copy follows the chosen language", () => {
  assert.equal(mcqText("gujarati", "reviewYourReview"), "તમારી સમીક્ષા");
  assert.match(mcqText("hindi", "reviewPostGoogle"), /Google/);
  assert.match(mcqText("hindi", "reviewNegativeHeadline"), /खेद/);
  assert.match(mcqText("gujarati", "footerControl"), /નિયંત્રણ/);
  assert.equal(mcqText("english", "reviewYourReview"), "");
});
