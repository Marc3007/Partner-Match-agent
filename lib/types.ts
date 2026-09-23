export type Tier = 'core_validated' | 'consulting_backed' | 'standard';

export type Ecosystem =
  | 'Microsoft'
  | 'AWS'
  | 'Google'
  | 'SAP'
  | 'Salesforce'
  | 'Oracle'
  | 'IBM'
  | 'Adobe'
  | 'independent';

export type ComplexityLevel = 'low' | 'medium' | 'high';

export type CompanySize = 'startup' | 'mid_market' | 'enterprise';

export interface ConsultingValidation {
  accenture: boolean;
  deloitte: boolean;
  pwc: boolean;
  bain: boolean;
}

export interface CaseStudy {
  title: string;
  industry: string;
  summary: string;
  sourceUrl: string | null;
  verified: boolean;
}

export interface DeliveryPartner {
  name: string;
  proofType: 'case_study' | 'press_release' | 'active_engagement';
  note: string;
}

export interface MarketShare {
  valuePct: number | null;
  scope: string | null;
  source: string | null;
  year: number | null;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  tier: Tier;
  /** Corporate parent/umbrella grouping -- equals `name` when the vendor
   * has no sibling products in the dataset. See lib/matching.ts for why
   * this exists: two products of the same company must never be shown as
   * independent "different vendors" in a recommendation. */
  parentCompany: string;
  enriched: boolean;
  problemTags: string[];
  consultingValidation: ConsultingValidation;
  consultingSignalCount: number;
  vendorEcosystem: Ecosystem;
  implementationComplexity: ComplexityLevel | null;
  typicalProjectDurationWeeks: [number, number] | null;
  companySizeFit: CompanySize[];
  integrationEcosystem: string[];
  existingStackSynergyNote: string | null;
  marketShare: MarketShare;
  reviewScoreG2: number | null;
  caseStudies: CaseStudy[];
  deliveryPartners: DeliveryPartner[];
  confidenceScore: number | null;
  /** Public URL the enrichment agent grounded problemTags/complexity/etc. in.
   * Null for vendors enriched before source tracking existed or hand-added
   * (e.g. the CPQ category) rather than researched. */
  sourceUrl: string | null;
  lastVerified: string;
}

export interface MatchFactorBreakdown {
  semanticMatch: number;
  complexityFit: number;
  companySizeFit: number;
  ecosystemSynergyBonus: number;
}

/**
 * Whether a factor's number is a real computed value or a neutral filler
 * used only so the weighted-sum formula still works. The UI must render
 * `false` as "Not enough data" / "Not applicable" rather than a percentage
 * bar -- a filler value must never look like a genuine measurement.
 */
export interface MatchFactorAvailability {
  companySizeFit: boolean;
  ecosystemSynergyBonus: boolean;
}

export interface MatchResult {
  vendor: Vendor;
  score: number;
  factors: MatchFactorBreakdown;
  factorAvailability: MatchFactorAvailability;
  reason: string;
  ecosystemBonusApplied: boolean;
}

export interface StackMember {
  vendor: Vendor;
  /** Display label -- "Salesforce (Service Cloud)" when the vendor is a
   * product of a company that has another entry folded into this same
   * stack member, otherwise just the vendor name. */
  label: string;
}

export interface StackRecommendation {
  title: string;
  categories: string[];
  vendors: StackMember[];
  rationale: string;
}

export interface MatchRequest {
  problem: string;
  industry?: string;
  companySize: CompanySize;
  complexityTolerance: ComplexityLevel;
  existingStack: Ecosystem[];
}

export interface MatchResponse {
  top: MatchResult[];
  alternatives: MatchResult[];
  stack: StackRecommendation | null;
  /** One sentence tying the top picks together, always present (even with
   * no cross-category stack) -- see lib/matching.ts buildTopSummary(). */
  topSummary: string;
  notice: string | null;
  /** Populated ONLY when `top` is empty: the best-scoring vendors even
   * though none cleared the relevance floor, so the UI can show "closest
   * available, low confidence" instead of a bare empty screen. Never
   * rendered with the same confidence styling as `top`. */
  belowConfidence: MatchResult[];
  /** Significant words from the problem text that don't appear anywhere in
   * the tag taxonomy's vocabulary -- a signal that part of the request
   * (e.g. "car configurator") isn't represented by any category yet, even
   * when another part of the same request matched well. Null when nothing
   * meaningful was left over. See lib/matching.ts's detectCoverageGap(). */
  coverageGap: string[] | null;
  /**
   * Which matching mechanism actually produced this response -- disclosed
   * rather than implied. 'llm-semantic' means a real Claude API call judged
   * relevance by meaning (see lib/semanticClassifier.ts); 'keyword-fallback'
   * means no ANTHROPIC_API_KEY was configured (or the request failed) and
   * the local bag-of-words word-presence matcher in lib/matching.ts ran
   * instead. The UI must never call the fallback "semantic" or "AI-powered."
   */
  matchingMode: 'llm-semantic' | 'keyword-fallback';
}
