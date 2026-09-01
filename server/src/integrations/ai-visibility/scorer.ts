import { EngineResult, SubScores } from "./types";

export function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(n))); }

export function scoreFromCompleteness(opts: {
  hasWebsite: boolean;
  hasHours: boolean;
  photoCount: number;
  reviewCount: number;
  reviewsLast30: number;
  avgRating: number;
}): SubScores {
  const consistency = clamp((opts.hasWebsite ? 35 : 0) + (opts.hasHours ? 25 : 0) + Math.min(opts.photoCount * 2, 30) + 10);
  const reviewFreshness = opts.reviewsLast30 >= 10 ? 85 : opts.reviewsLast30 >= 5 ? 62 : opts.reviewsLast30 >= 2 ? 54 : 30;
  const reputationStrength = clamp((opts.avgRating / 5) * 60 + Math.min(opts.reviewCount, 100) * 0.3 + reviewFreshness * 0.1);
  const coverage = clamp(Math.min(opts.reviewCount, 50) * 1.2 + (opts.reviewsLast30 > 0 ? 20 : 0));
  const alignment = clamp(48 + (opts.hasWebsite ? 10 : -10) + (opts.reviewsLast30 >= 5 ? 8 : 0));
  const aiDiscoverability = clamp(consistency * 0.3 + reviewFreshness * 0.3 + reputationStrength * 0.2 + coverage * 0.2);
  return { aiDiscoverability, reputationStrength, reviewFreshness, consistency, coverage, alignment };
}

export function engineMentionRate(results: EngineResult[]): number {
  if (!results.length) return 0;
  const mentioned = results.filter((r) => r.mentioned).length;
  return clamp((mentioned / results.length) * 100);
}

export function compositeScore(sub: SubScores, mentionRate: number, citationRate: number): number {
  // 0.35 mention + 0.20 citation + 0.15 consistency + 0.15 reviewStrength + 0.15 alignment
  const raw = 0.35 * mentionRate + 0.20 * citationRate + 0.15 * sub.consistency + 0.15 * sub.reputationStrength + 0.15 * sub.alignment;
  return clamp(raw);
}

export function customerReputationFromFeedback(positivePct: number) {
  return clamp(positivePct * 0.85 + 15); // map 0-100 positive to 15-100 reputation
}
