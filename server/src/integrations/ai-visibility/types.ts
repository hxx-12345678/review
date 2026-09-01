export type EngineName = "chatgpt" | "gemini" | "perplexity" | "google_ai" | "claude";

export interface EngineResult {
  engine: EngineName;
  query: string;
  mentioned: boolean;
  cited: boolean;
  rank?: number;
  snippet?: string;
  citations: string[];
  latencyMs: number;
}

export interface SubScores {
  aiDiscoverability: number;
  reputationStrength: number;
  reviewFreshness: number;
  consistency: number;
  coverage: number;
  alignment: number;
}

export interface CompetitorShadow {
  name: string;
  score: number;
  gapReasons: string[];
}

export interface AlignmentRow {
  attribute: string;
  customersSayPct: number;
  customersSayCount: number;
  aiAssociates: "Strong" | "Medium" | "Weak" | "Not mentioned";
  flag: "Aligned" | "Mismatch" | "—";
}

export interface CustomerTruth {
  loves: { phrase: string; count: number; pct: number }[];
  complaints: { phrase: string; count: number; pct: number }[];
  differentiator?: string;
  missingThemes: string[];
  monthDelta?: { waitingTimeDown?: number };
}

export interface FixAction {
  id: string;
  title: string;
  why: string;
  generateType: "description" | "service_section" | "faq" | "inconsistency" | "response_plan";
  content?: string;
}

export interface VisibilityCheckPayload {
  score: number;
  customerReputation: number;
  gap: number;
  subScores: SubScores;
  queries: string[];
  engineResults: EngineResult[];
  competitors: CompetitorShadow[];
  customerTruth: CustomerTruth;
  alignmentTable: AlignmentRow[];
  fixes: FixAction[];
}
