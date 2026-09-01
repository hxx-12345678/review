import { AlignmentRow, CustomerTruth } from "./types";

export function buildAlignment(truth: CustomerTruth, aiThemes: string[]): AlignmentRow[] {
  const allAttrs = new Map<string, { pct: number; count: number }>();
  for (const p of truth.loves) allAttrs.set(p.phrase.toLowerCase(), { pct: p.pct, count: p.count });
  for (const c of truth.complaints) if (!allAttrs.has(c.phrase.toLowerCase())) allAttrs.set(c.phrase.toLowerCase(), { pct: c.pct, count: c.count });

  const rows: AlignmentRow[] = [];
  for (const [attr, v] of allAttrs.entries()) {
    const aiHit = aiThemes.find((t) => t.toLowerCase().includes(attr)) ? "Strong" : aiThemes.length > 0 ? "Weak" : "Not mentioned";
    let flag: AlignmentRow["flag"] = "—";
    if (v.pct >= 70 && (aiHit === "Weak" || aiHit === "Not mentioned")) flag = "Mismatch";
    else if (v.pct >= 70 && aiHit === "Strong") flag = "Aligned";
    rows.push({ attribute: attr, customersSayPct: v.pct, customersSayCount: v.count, aiAssociates: aiHit as any, flag });
  }
  // Add missingThemes as rows
  for (const m of truth.missingThemes) {
    if (!rows.find((r) => r.attribute === m.toLowerCase())) {
      rows.push({ attribute: m, customersSayPct: 0, customersSayCount: 0, aiAssociates: "Not mentioned", flag: "Mismatch" });
    }
  }
  return rows.slice(0, 8);
}

export function computeGap(customerReputation: number, aiScore: number) {
  return Math.max(0, customerReputation - aiScore);
}
