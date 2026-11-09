/**
 * Billing-helper unit tests.
 *
 * Run with:  npx tsx src/utils/billing.test.ts
 *
 * Uses Node's built-in assert (no extra test dependency) so it can run in CI
 * and locally without installing a test framework.
 */
import assert from "node:assert/strict";
import {
  ENTITLED_STATUSES,
  intervalMonths,
  monthlyEquivalentPaise,
  computeTaxBreakup,
  financialYearLabel,
  allocateInvoiceNumber,
  escapeHtml,
  maskEmail,
  priceForCredits,
  getCreditPacks,
} from "./billing";

let passed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err: any) {
    failures.push(name);
    console.error(`  FAIL ${name}\n      ${err?.message || err}`);
  }
}

async function main() {
  console.log("billing helpers");

  await test("entitlements exclude `created`", () => {
    assert.deepEqual([...ENTITLED_STATUSES], ["active", "authenticated", "past_due"]);
    assert.ok(!(ENTITLED_STATUSES as readonly string[]).includes("created"));
  });

  await test("intervalMonths maps every supported interval", () => {
    assert.equal(intervalMonths("month"), 1);
    assert.equal(intervalMonths("year"), 12);
    assert.equal(intervalMonths("quarter"), 3);
    assert.ok(Math.abs(intervalMonths("week") - 12 / 52) < 1e-12);
    assert.ok(Math.abs(intervalMonths("day") - 1 / 30) < 1e-12);
    assert.equal(intervalMonths(undefined), 1);
    assert.equal(intervalMonths("nonsense"), 1);
  });

  await test("monthlyEquivalentPaise normalises across intervals", () => {
    assert.equal(monthlyEquivalentPaise(120000, "year"), 10000); // ₹1,200/yr = ₹100/mo
    assert.equal(monthlyEquivalentPaise(24900, "month"), 24900);
    assert.equal(monthlyEquivalentPaise(249900, "year"), 20825); // ₹2,499/yr ≈ ₹208.25/mo
    assert.equal(monthlyEquivalentPaise(0, "year"), 0);
  });

  await test("a yearly Lite plan is not treated as cheaper than monthly Starter", () => {
    const liteYearlyMonthly = monthlyEquivalentPaise(120000, "year");
    const starterMonthly = monthlyEquivalentPaise(24900, "month");
    assert.ok(liteYearlyMonthly < starterMonthly);
    // Raw price comparison would have said 120000 > 24900 (yearly is "bigger"),
    // which is exactly the cross-interval bug this helper fixes.
    assert.ok(120000 > 24900);
  });

  await test("computeTaxBreakup splits inclusive GST exactly", () => {
    const a = computeTaxBreakup(118000, 18); // ₹1,180 incl. 18%
    assert.equal(a.taxableAmount, 100000);
    assert.equal(a.taxAmount, 18000);
    assert.equal(a.cgst, 9000);
    assert.equal(a.sgst, 9000);
    assert.equal(a.taxableAmount + a.taxAmount, 118000);

    const b = computeTaxBreakup(24900, 18); // ₹249 incl. 18%
    assert.equal(b.taxableAmount + b.taxAmount, 24900);
    assert.equal(b.cgst + b.sgst, b.taxAmount);
    assert.ok(b.cgst <= b.sgst);
  });

  await test("computeTaxBreakup handles zero/negative/zero-rate", () => {
    assert.deepEqual(computeTaxBreakup(0, 18), { taxableAmount: 0, taxAmount: 0, cgst: 0, sgst: 0 });
    assert.deepEqual(computeTaxBreakup(-100, 18), { taxableAmount: 0, taxAmount: 0, cgst: 0, sgst: 0 });
    assert.deepEqual(computeTaxBreakup(10000, 0), { taxableAmount: 10000, taxAmount: 0, cgst: 0, sgst: 0 });
  });

  await test("financialYearLabel rolls over at IST midnight on 1 April", () => {
    // 2026-03-31 23:30 IST -> FY 2025-26
    assert.equal(financialYearLabel(new Date("2026-03-31T18:00:00.000Z")), "2025-26");
    // 2026-04-01 00:00 IST -> FY 2026-27
    assert.equal(financialYearLabel(new Date("2026-03-31T18:30:00.000Z")), "2026-27");
    // Mid-year
    assert.equal(financialYearLabel(new Date("2026-10-20T00:00:00.000Z")), "2026-27");
    // January is still the prior FY
    assert.equal(financialYearLabel(new Date("2027-01-15T00:00:00.000Z")), "2026-27");
  });

  await test("allocateInvoiceNumber is sequential and FY-scoped", async () => {
    let value = 0;
    let exists = false;
    const seenIds: string[] = [];
    const client = {
      invoiceCounter: {
        upsert: async (args: any) => {
          seenIds.push(args.where.id);
          if (!exists) {
            exists = true;
            value = args.create.value;
          } else {
            value += args.update.value.increment;
          }
          return { value };
        },
      },
    };

    const first = await allocateInvoiceNumber(client, new Date("2026-10-20T00:00:00.000Z"));
    const second = await allocateInvoiceNumber(client, new Date("2026-10-21T00:00:00.000Z"));
    assert.equal(first, "BV/2026-27/0001");
    assert.equal(second, "BV/2026-27/0002");
    assert.deepEqual(seenIds, ["invoice:2026-27", "invoice:2026-27"]);

    const nextFy = await allocateInvoiceNumber(
      {
        invoiceCounter: {
          upsert: async () => ({ value: 1 }),
        },
      },
      new Date("2027-04-05T00:00:00.000Z"),
    );
    assert.equal(nextFy, "BV/2027-28/0001");
  });

  await test("escapeHtml neutralises receipt injection", () => {
    assert.equal(
      escapeHtml(`<script>alert("x")</script>&'`),
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;",
    );
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
    assert.equal(escapeHtml(42), "42");
  });

  await test("maskEmail hides the local part", () => {
    assert.equal(maskEmail("john.doe@example.com"), "jo******@example.com");
    assert.equal(maskEmail("a@b.com"), "a*@b.com");
    assert.equal(maskEmail(""), "");
    assert.equal(maskEmail(null), "");
    assert.equal(maskEmail("not-an-email"), "***");
  });

  await test("priceForCredits uses pack price then per-unit rate", () => {
    assert.equal(priceForCredits(100), 9900); // exact pack
    assert.equal(priceForCredits(500), 44900); // exact pack
    assert.equal(priceForCredits(1000), 79900); // exact pack
    assert.equal(priceForCredits(2500), 179900); // exact pack
    assert.equal(priceForCredits(200), 19800); // 200 * 99
    assert.equal(priceForCredits(50), 4950); // 50 * 99 = ₹49.50
    // Every pack is cheaper per credit than the per-unit rate.
    for (const p of getCreditPacks()) {
      assert.ok(p.amount <= p.credits * 99, `${p.label} should not cost more than the per-unit rate`);
      assert.ok(p.amount >= 100, `${p.label} must clear Razorpay's ₹1 minimum`);
    }
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main();
