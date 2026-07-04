import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_JSON = path.join(__dirname, '..', '..', 'generated-leads.json');
const CONTACTS_JSON = path.join(__dirname, '..', '..', 'contacts.json');
const ALL_LEADS_CSV = path.join(__dirname, '..', '..', 'all-leads.csv');
const ALL_CONTACTS_CSV = path.join(__dirname, '..', '..', 'all-contacts.csv');

const data = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf-8'));
const leads: any[] = data.leads || [];
console.log(`Loaded ${leads.length} leads`);

// ─── STEP 1: Merge duplicate categories ────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  'Auto Repair / Car Service': 'Auto Repair',
  'Beauty Parlour': 'Salon & Spa',
  'Gym & Fitness Center': 'Gym & Fitness',
  'Home Services': 'Auto Repair', // should not exist but merge anyway
  'Skin Clinic / Dermatologist': 'Skin Clinic',
  'Yoga Studio': 'Yoga & Wellness',
};
let merged = 0;
for (const l of leads) {
  if (CATEGORY_MAP[l.category]) {
    l.category = CATEGORY_MAP[l.category];
    merged++;
  }
}
console.log(`Merged ${merged} leads into correct categories`);

// ─── STEP 2: Clean emails (rating saved as email bug) ──────────────────────
function isValidEmail(e: string): boolean {
  if (!e || e.length < 5) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
let badEmails = 0;
for (const l of leads) {
  if (l.email && !isValidEmail(l.email)) {
    l.email = '';
    badEmails++;
  }
}
console.log(`Cleaned ${badEmails} invalid emails`);

// ─── STEP 3: Clean hallucinated phones ─────────────────────────────────────
function normPhone(p: string): string {
  let c = p.replace(/[\s\-\+\(\)\.]/g, '');
  if (c.startsWith('91') && c.length === 12) c = c.slice(2);
  if (c.startsWith('0') && c.length === 11) c = c.slice(1);
  return c;
}
function isValidPhone(p: string): boolean {
  if (!p || p.length < 10) return false;
  const c = p.replace(/[\s\-\+\(\)\.]/g, '');
  if (c.length === 10) return /^[6-9]\d{9}$/.test(c);
  if (c.length === 11 && c.startsWith('0')) return /^0[6-9]\d{9}$/.test(c);
  if (c.length === 12 && c.startsWith('91')) return /^91[6-9]\d{9}$/.test(c);
  return false;
}
function isSuspiciousPhone(p: string): boolean {
  if (!p) return false;
  const c = p.replace(/\D/g, '');
  if (/0{4,}$/.test(c)) return true;
  if (/(.)\1{3,}/.test(c.slice(-6))) return true;
  if (/^70690\d{5}$/.test(c)) return true;
  if (/^70460\d{5}$/.test(c)) return true;
  if (/^92275\d{5}$/.test(c)) return true;
  if (/^88660\d{5}$/.test(c)) return true;
  if (/^74330\d{5}$/.test(c)) return true;
  return false;
}

// Count phone frequencies
const phoneCounts = new Map<string, number>();
for (const l of leads) {
  const p = l.phone || '';
  if (p) phoneCounts.set(p, (phoneCounts.get(p) || 0) + 1);
}
const fakePhones = new Set<string>();
phoneCounts.forEach((count, phone) => {
  if (count >= 3) fakePhones.add(phone);
});

let cleanedPhones = 0;
for (const l of leads) {
  if (l.phone) {
    const p = normPhone(l.phone);
    if (!isValidPhone(p) || fakePhones.has(p) || isSuspiciousPhone(p)) {
      l.phone = '';
      cleanedPhones++;
    } else {
      l.phone = p;
    }
  }
}
console.log(`Cleaned ${cleanedPhones} fake/invalid phones`);

// ─── STEP 4: Area-level name dedup (same name + same area = keep first) ────
const seenNameArea = new Set<string>();
let deduped = 0;
const dedupedLeads = leads.filter(l => {
  const key = `${l.name.toLowerCase().trim()}|${l.area}`;
  if (seenNameArea.has(key)) { deduped++; return false; }
  seenNameArea.add(key);
  return true;
});
console.log(`Removed ${deduped} area-level duplicates`);

// ─── STEP 5: Recalculate scores ────────────────────────────────────────────
for (const l of dedupedLeads) {
  let s = Math.round((l.rating || 0) * 5);
  const rc = l.reviewCount || 0;
  if (rc >= 500) s += 20;
  else if (rc >= 200) s += 18;
  else if (rc >= 100) s += 15;
  else if (rc >= 50) s += 12;
  else if (rc >= 20) s += 8;
  else if (rc >= 5) s += 4;
  if (l.phone && l.phone.length >= 10) s += 15;
  if (l.websiteUri) s += 10;
  if (l.email) s += 10;
  if (l.estYear) {
    const y = 2026 - l.estYear;
    if (y <= 1) s += 15;
    else if (y <= 3) s += 12;
    else if (y <= 5) s += 8;
    else if (y <= 10) s += 4;
  }
  if (l.businessStatus === 'OPERATIONAL') s += 5;
  l.score = Math.min(s, 100);
}
dedupedLeads.sort((a: any, b: any) => b.score - a.score);

// ─── STEP 6: Regroup by category ───────────────────────────────────────────
const grouped: Record<string, any[]> = {};
for (const l of dedupedLeads) {
  if (!grouped[l.category]) grouped[l.category] = [];
  grouped[l.category].push(l);
}

const output = {
  generatedAt: new Date().toISOString(),
  totalLeads: dedupedLeads.length,
  byCategory: grouped,
  leads: dedupedLeads,
};
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2), 'utf-8');

// ─── STEP 7: Rebuild contacts ──────────────────────────────────────────────
const contacts = dedupedLeads.filter((l: any) => l.phone || l.email).map((l: any) => ({
  name: l.name, phone: l.phone, email: l.email,
  category: l.category, area: l.area, source: l.source, addedAt: new Date().toISOString(),
}));
fs.writeFileSync(CONTACTS_JSON, JSON.stringify(contacts, null, 2), 'utf-8');

// ─── STEP 8: Rebuild CSVs ──────────────────────────────────────────────────
const csvHeaders = ['Name','Category','Area','Address','Phone','Email','Rating','Reviews','Website','Instagram','Facebook','Est.Year','Score','Source'];
const csvRows = dedupedLeads.map((l: any) =>
  `"${l.name.replace(/"/g, '""')}","${l.category}","${l.area}","${l.address.replace(/"/g, '""')}","${l.phone || ''}","${l.email || ''}",${l.rating || 0},${l.reviewCount || 0},"${l.websiteUri || ''}","${l.socialInstagram || ''}","${l.socialFacebook || ''}",${l.estYear || ''},${l.score},"${l.source}"`
);
fs.writeFileSync(ALL_LEADS_CSV, [csvHeaders.join(','), ...csvRows].join('\n'), 'utf-8');

const contactHeaders = ['Name','Phone','Email','Category','Area','Source'];
const contactRows = dedupedLeads.filter((l: any) => l.phone || l.email).map((l: any) =>
  `"${l.name.replace(/"/g, '""')}","${l.phone || ''}","${l.email || ''}","${l.category}","${l.area}","${l.source}"`
);
fs.writeFileSync(ALL_CONTACTS_CSV, [contactHeaders.join(','), ...contactRows].join('\n'), 'utf-8');

// ─── FINAL STATS ───────────────────────────────────────────────────────────
console.log(`\n=== FINAL STATS ===`);
console.log(`Total: ${dedupedLeads.length}`);
console.log(`With phone: ${dedupedLeads.filter((l: any) => l.phone).length}`);
console.log(`With email: ${dedupedLeads.filter((l: any) => l.email).length}`);
console.log(`\n=== BY CATEGORY ===`);
Object.keys(grouped).sort().forEach(cat => {
  const cl = grouped[cat];
  console.log(`${cat}: ${cl.length} total, ${cl.filter((l: any) => l.phone).length} phone, ${cl.filter((l: any) => l.email).length} email`);
});
console.log(`\ncontacts.json: ${contacts.length}`);
console.log(`all-leads.csv: ${csvRows.length} rows`);
console.log(`all-contacts.csv: ${contactRows.length} rows`);
