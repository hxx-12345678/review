#!/usr/bin/env node
/**
 * export-db.js — Export PostgreSQL database to portable JSON dump
 *
 * Usage:
 *   node scripts/export-db.js                (prompts for source DB URL)
 *   node scripts/export-db.js "postgresql://user:pass@host:5432/dbname"
 *
 * Output:  reviewos-backup-YYYY-MM-DD.json
 *
 * Prerequisites:
 *   - Run from project root or any dir with access to server/node_modules
 *   - @prisma/client must be installed (existing)
 *   - The source database must be running and accessible
 */

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const { createInterface } = require('readline');

const SERVER_DIR = path.resolve(__dirname, '..', 'server');
const OUTPUT_DIR = path.resolve(__dirname, '..');
const serverRequire = createRequire(path.join(SERVER_DIR, 'noop.js'));
const { PrismaClient } = serverRequire('@prisma/client');

// ── Helpers ──────────────────────────────────────────────────────────

function getInput(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function formatDate() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

function warn(msg) {
  console.log(`  ⚠  ${msg}`);
}

function ok(msg) {
  console.log(`  ✓  ${msg}`);
}

// ── Model dependency order (parents before children for insertion) ──
// This must match server/prisma/schema.prisma model names EXACTLY.
const MODEL_ORDER = [
  'SubscriptionPlan',      // 0 deps
  'User',                  // 0 deps
  'Session',               // depends: User
  'Business',              // depends: User
  'GoogleAccount',         // depends: Business
  'GoogleReview',          // depends: GoogleAccount, Business
  'QrCode',                // depends: Business
  'Feedback',              // depends: Business
  'ReviewDraft',           // depends: Feedback, Business
  'ReviewClick',           // depends: Feedback, Business
  'GeneratedReply',        // depends: Feedback, Business
  'ActivityLog',           // depends: User, Business
  'WhatsAppTemplate',      // depends: Business
  'WhatsAppFlow',          // depends: Business, WhatsAppTemplate
  'WhatsAppFlowResponse',  // depends: WhatsAppFlow, Business
  'ReviewTask',            // depends: Business
  'InstagramMention',      // depends: Business
  'CrossPlatformMessage',  // depends: Business
  'Subscription',          // depends: User, SubscriptionPlan
  'Invoice',               // depends: Subscription
];

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   ReviewOS Database Export Tool              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // 1. Get source database URL
  let dbUrl = process.argv[2];
  if (!dbUrl) {
    dbUrl = await getInput('Enter SOURCE database URL: ');
  }
  if (!dbUrl) {
    console.error('  ✗  No database URL provided. Aborting.');
    process.exit(1);
  }
  dbUrl = dbUrl.replace(/^postgres:\/\//, 'postgresql://');

  // 2. Validate connection by doing a simple query via Prisma
  log('1/4', 'Connecting to source database...');
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    // Quick connectivity check: count users
    const userCount = await prisma.user.count();
    ok(`Connected. Source has data (e.g. ${userCount} users)`);
  } catch (err) {
    console.error(`  ✗  Failed to connect: ${err.message}`);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }

  // 3. Export data from each model
  log('2/4', 'Exporting data from all models...');
  const dump = {
    version: 1,
    exportedAt: new Date().toISOString(),
    models: {},
  };

  for (const modelName of MODEL_ORDER) {
    const modelProp = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    if (typeof prisma[modelProp]?.findMany !== 'function') {
      warn(`Model "${modelProp}" not found on Prisma client, skipping`);
      continue;
    }
    const records = await prisma[modelProp].findMany();
    dump.models[modelName] = records;
    log('  →', `${modelName}: ${records.length} records`);
  }

  // 4. Write to file
  log('3/4', 'Writing dump file...');
  const filename = `reviewos-backup-${formatDate()}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  const json = JSON.stringify(dump, null, 2);
  fs.writeFileSync(filepath, json, 'utf-8');
  const sizeMB = (Buffer.byteLength(json, 'utf-8') / (1024 * 1024)).toFixed(2);
  ok(`Created: ${filename} (${sizeMB} MB)`);

  // 5. Summary
  log('4/4', 'Summary');
  let totalRecords = 0;
  for (const [name, records] of Object.entries(dump.models)) {
    const count = records.length;
    if (count > 0) {
      console.log(`  ${name}: ${count}`);
      totalRecords += count;
    }
  }
  console.log(`  ──────────────`);
  console.log(`  Total: ${totalRecords} records across ${Object.keys(dump.models).length} models`);
  console.log('');

  await prisma.$disconnect().catch(() => {});
  ok('Export complete. Next: transfer this JSON file and run import-db.js');
  console.log('');
}

main().catch((err) => {
  console.error(`\n  ✗  Fatal error: ${err.message}`);
  process.exit(1);
});
