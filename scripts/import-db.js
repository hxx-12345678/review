#!/usr/bin/env node
/**
 * import-db.js — Restore JSON dump to target PostgreSQL database
 *
 * Usage:
 *   node scripts/import-db.js <dump-file> [target-db-url]
 *
 * Examples:
 *   node scripts/import-db.js ./reviewos-backup-2026-07-20.json
 *   node scripts/import-db.js ./reviewos-backup-2026-07-20.json "postgresql://..."
 *
 * What it does:
 *   1. Connects to target database
 *   2. Drops all existing data (DROP SCHEMA public CASCADE)
 *   3. Runs Prisma migrations to create fresh schema
 *   4. Inserts all records from the dump file
 *   5. Verifies with row counts
 *
 * Prerequisites:
 *   - Run from project root
 *   - server/node_modules must be available
 *   - Target database must exist and be accessible
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { createRequire } = require('module');
const { createInterface } = require('readline');

const SERVER_DIR = path.resolve(__dirname, '..', 'server');
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

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

function warn(msg) {
  console.log(`  ⚠  ${msg}`);
}

function ok(msg) {
  console.log(`  ✓  ${msg}`);
}

// ── Model dependency order (parents before children) ──
const MODEL_ORDER = [
  'SubscriptionPlan',
  'User',
  'Session',
  'Business',
  'GoogleAccount',
  'GoogleReview',
  'QrCode',
  'Feedback',
  'ReviewDraft',
  'ReviewClick',
  'GeneratedReply',
  'ActivityLog',
  'WhatsAppTemplate',
  'WhatsAppFlow',
  'WhatsAppFlowResponse',
  'ReviewTask',
  'InstagramMention',
  'CrossPlatformMessage',
  'Subscription',
  'Invoice',
];

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   ReviewOS Database Import Tool              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // 1. Get arguments
  const dumpFile = process.argv[2];
  if (!dumpFile) {
    console.error('  ✗  Usage: node scripts/import-db.js <dump-file> [target-db-url]');
    console.error('  Example: node scripts/import-db.js ./reviewos-backup-2026-07-20.json');
    process.exit(1);
  }
  if (!fs.existsSync(dumpFile)) {
    console.error(`  ✗  Dump file not found: ${dumpFile}`);
    process.exit(1);
  }

  let dbUrl = process.argv[3];
  if (!dbUrl) {
    dbUrl = await getInput('Enter TARGET database URL: ');
  }
  if (!dbUrl) {
    console.error('  ✗  No target database URL. Aborting.');
    process.exit(1);
  }
  dbUrl = dbUrl.replace(/^postgres:\/\//, 'postgresql://');

  // 2. Load dump file
  log('1/6', 'Loading dump file...');
  let dump;
  try {
    const raw = fs.readFileSync(dumpFile, 'utf-8');
    dump = JSON.parse(raw);
    ok(`Loaded: ${dumpFile}`);
    const totalModels = Object.keys(dump.models).length;
    const totalRecords = Object.values(dump.models).reduce((sum, r) => sum + r.length, 0);
    log('  →', `Dump contains ${totalRecords} records across ${totalModels} models`);
  } catch (err) {
    console.error(`  ✗  Failed to parse dump file: ${err.message}`);
    process.exit(1);
  }

  // 3. Connect to target database
  log('2/6', 'Connecting to target database...');
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    await prisma.$connect();
    // Verify it's accessible
    const dbName = await prisma.$queryRawUnsafe('SELECT current_database()');
    ok(`Connected to database: ${dbName[0].current_database}`);
  } catch (err) {
    console.error(`  ✗  Failed to connect to target: ${err.message}`);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }

  // 4. Drop existing schema (clean slate)
  log('3/6', 'Cleaning target database...');
  try {
    await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await prisma.$executeRawUnsafe('CREATE SCHEMA public');
    await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO public');
    ok('Schema reset (dropped + recreated public)');
  } catch (err) {
    console.error(`  ✗  Failed to reset schema: ${err.message}`);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }

  // 5. Run Prisma migrations to create fresh schema
  log('4/6', 'Running Prisma migrations to create schema...');
  try {
    const result = execSync('npx prisma migrate deploy', {
      cwd: SERVER_DIR,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8',
      timeout: 120000,
    });
    // Print only the summary lines from prisma output
    const lines = result.split('\n').filter(l => l.includes('migration') || l.includes('already') || l.includes('applied') || l.includes('Success'));
    lines.forEach(l => console.log(`  ${l.trim()}`));
    ok('Schema created via Prisma migrations');
  } catch (err) {
    console.error(`  ✗  Failed to run migrations: ${err.stdout || err.message}`);
    if (err.stderr) console.error(`  stderr: ${err.stderr}`);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }

  // 6. Insert data in dependency order
  log('5/6', 'Restoring data...');
  let totalInserted = 0;
  const modelCounts = {};
  const errors = [];

  for (const modelName of MODEL_ORDER) {
    const records = dump.models[modelName];
    if (!records || records.length === 0) {
      modelCounts[modelName] = 0;
      continue;
    }

    const modelProp = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    if (typeof prisma[modelProp]?.create !== 'function') {
      warn(`Model "${modelProp}" not available on Prisma client, skipping`);
      modelCounts[modelName] = 0;
      continue;
    }

    let inserted = 0;
    for (const record of records) {
      try {
        await prisma[modelProp].create({ data: record });
        inserted++;
      } catch (err) {
        errors.push({ model: modelName, id: record.id, error: err.message });
        // Continue with remaining records
      }
    }

    modelCounts[modelName] = inserted;
    totalInserted += inserted;
    log('  →', `${modelName}: ${inserted}/${records.length} inserted`);
  }

  // Report any errors
  if (errors.length > 0) {
    warn(`${errors.length} records failed to insert:`);
    for (const e of errors.slice(0, 5)) {
      console.log(`    ${e.model}[${e.id}]: ${e.error}`);
    }
    if (errors.length > 5) {
      warn(`... and ${errors.length - 5} more errors`);
    }
  }

  // 7. Verification: count rows in target
  log('6/6', 'Verifying restoration...');
  console.log('');
  console.log('  Row counts (target database):');
  console.log('  ─────────────────────────────────');
  let targetTotal = 0;
  for (const modelName of MODEL_ORDER) {
    const modelProp = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    if (typeof prisma[modelProp]?.count !== 'function') continue;
    try {
      const count = await prisma[modelProp].count();
      const targetCount = modelCounts[modelName] || 0;
      const status = count === targetCount ? '✓' : '⚠';
      console.log(`  ${status} ${modelName}: ${count}`);
      targetTotal += count;
    } catch {
      // skip if model doesn't exist
    }
  }
  console.log('  ─────────────────────────────────');
  console.log(`  Total: ${targetTotal} records`);

  await prisma.$disconnect().catch(() => {});

  console.log('');
  if (targetTotal > 0 && errors.length === 0) {
    ok('Import complete! All data restored successfully.');
  } else if (targetTotal > 0 && errors.length > 0) {
    warn(`Import completed with ${errors.length} errors. Most data was restored.`);
  } else {
    warn('No data was restored. Check errors above.');
  }
  console.log('');
}

main().catch((err) => {
  console.error(`\n  ✗  Fatal error: ${err.message}`);
  process.exit(1);
});
