-- Backfill invoices that predate the GST/numbering work so every row has a
-- sequential number and an inclusive-GST breakup. New invoices are numbered at
-- creation time; this only touches rows that are still missing a number.

DO $$
DECLARE
  r          RECORD;
  ist        TIMESTAMP;
  start_year INT;
  fy         TEXT;
  seq        INT;
  taxable    INT;
BEGIN
  FOR r IN
    SELECT id, "createdAt", amount
    FROM "Invoice"
    WHERE "invoiceNumber" IS NULL
    ORDER BY "createdAt" ASC, id ASC
  LOOP
    -- Indian financial year (Apr-Mar) using IST, matching financialYearLabel().
    ist := r."createdAt" + INTERVAL '5 hours 30 minutes';
    start_year := EXTRACT(YEAR FROM ist)::INT;
    IF EXTRACT(MONTH FROM ist)::INT < 4 THEN
      start_year := start_year - 1;
    END IF;
    fy := start_year::TEXT || '-' || LPAD(((start_year + 1) % 100)::TEXT, 2, '0');

    INSERT INTO "InvoiceCounter" (id, value)
    VALUES ('invoice:' || fy, 1)
    ON CONFLICT (id) DO UPDATE SET value = "InvoiceCounter".value + 1
    RETURNING value INTO seq;

    -- GST is inclusive of the collected amount; 18% standard rate.
    taxable := ROUND(r.amount / 1.18)::INT;

    UPDATE "Invoice"
    SET "invoiceNumber" = 'BV/' || fy || '/' || LPAD(seq::TEXT, 4, '0'),
        "taxableAmount" = taxable,
        "taxAmount"     = r.amount - taxable
    WHERE id = r.id;
  END LOOP;
END $$;
