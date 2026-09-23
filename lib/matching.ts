import { ALL_TAGS, TAG_BY_ID } from './tags';
import type {
  CompanySize,
  ComplexityLevel,
  MatchFactorBreakdown,
  MatchRequest,
  MatchResponse,
  MatchResult,
  StackMember,
  StackRecommendation,
  Vendor,
} from './types';
import { VENDORS } from './vendors';
import { classifyProblemTags } from './semanticClassifier';

/**
 * Deliberately conservative light stemmer: strips gerund/past-tense/plural
 * suffixes so "cleaning"/"cleaned"/"clean" (and "migrating"/"migrated"/
 * "migrate", etc.) collapse to one token, without a full Porter stemmer's
 * risk of over-stemming into false collisions. This does NOT unify
 * derivational forms like "govern"/"governance" -- those are handled by
 * listing both forms explicitly in a tag's keyword list instead, which is
 * safer than guessing a generic suffix rule for every case.
 */
function stem(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

/**
 * Two-word taxonomy phrases written as one word with no space at all --
 * "callcenter", "helpdesk" -- are a common, entirely normal way for someone
 * typing a quick problem description to write a compound term. The
 * word-presence matcher below requires each word of a phrase to appear as
 * its own token, so "callcenter" (one token) would otherwise never satisfy
 * a concept group written as "call center" (two tokens), even though a
 * human reading it would recognize it instantly. Precomputed once from the
 * taxonomy itself (not a hand-picked list) so it stays in sync as tags
 * change -- see tokenize().
 */
const COMPOUND_EXPANSIONS: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const tag of ALL_TAGS) {
    for (const group of tag.concepts) {
      for (const phrase of group) {
        const words = phrase.toLowerCase().split(/\s+/);
        if (words.length === 2 && words.every((w) => w.length > 2)) {
          const compound = words.join('');
          if (!map.has(compound)) map.set(compound, words.map(stem));
        }
      }
    }
  }
  return map;
})();

function tokenize(text: string): Set<string> {
  const rawWords = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const tokens = new Set<string>();
  for (const w of rawWords) {
    tokens.add(stem(w));
    const expansion = COMPOUND_EXPANSIONS.get(w);
    if (expansion) for (const e of expansion) tokens.add(e);
  }
  return tokens;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'with', 'we', 'our', 'is', 'are',
  'need', 'want', 'looking', 'help', 'us', 'that', 'this', 'be', 'have', 'has', 'it', 'as', 'by',
  'across', 'into', 'currently', 'right', 'now', 'team', 'teams', 'company', 'business', 'build',
  'get', 'use', 'using', 'also', 'so', 'can', 'not', 'but', 'about', 'from', 'at', 'up', 'just',
  'which', 'who', 'what', 'when', 'where', 'why', 'how', 'very', 'really', 'much', 'more', 'most',
  'partner', 'partners', 'vendor', 'vendors', 'one', 'her', 'him', 'them', 'their', 'her',
  'because', 'they', 'every', 'thats', 'implement', 'problem', 'better', 'less', 'answer',
]);

/**
 * Every word that appears in any tag's concept phrases, stemmed once at
 * module load. Used only to spot INPUT words that the taxonomy has no
 * concept for at all (see detectCoverageGap) -- not used for scoring.
 */
const GLOBAL_VOCAB: Set<string> = (() => {
  const vocab = new Set<string>();
  for (const tag of ALL_TAGS) {
    for (const group of tag.concepts) {
      for (const phrase of group) {
        for (const w of phrase.toLowerCase().split(/\s+/)) vocab.add(stem(w));
      }
    }
  }
  return vocab;
})();

/**
 * Flags significant words from the problem text that the tag taxonomy has
 * NO concept for anywhere (not just in the tags that ended up matching).
 * This is what lets a partial match stay honest: "clean our data" can score
 * well against Master Data & Governance while "car configurators" in the
 * same sentence is correctly called out as uncovered, rather than silently
 * dropped. Deliberately conservative -- short/common words are excluded so
 * this doesn't fire on stray connector words.
 */
function detectCoverageGap(problem: string): string[] | null {
  const words = problem
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  const seen = new Set<string>();
  const gap: string[] = [];
  for (const w of words) {
    // A no-space compound ("callcenter") that the taxonomy covers as two
    // words ("call center") is not an uncovered gap -- see COMPOUND_EXPANSIONS.
    if (COMPOUND_EXPANSIONS.has(w)) continue;
    const s = stem(w);
    if (GLOBAL_VOCAB.has(s) || seen.has(s)) continue;
    seen.add(s);
    gap.push(w);
  }
  return gap.length > 0 ? gap : null;
}

/**
 * Document frequency of each concept GROUP across the tag taxonomy, keyed
 * by the group's primary (first) phrase. A generic concept that shows up
 * under many tags (e.g. an "automation" group) is a weak signal on its own;
 * one unique to a tag or two (e.g. a "chargeback" group) is a strong one.
 * Computed once at module load and used to weight matches -- a lightweight
 * TF-IDF-style proxy for real semantic search, kept as a swappable seam
 * (see docs/ARCHITECTURE.md).
 *
 * Weight is per GROUP, not per phrase: adding more synonyms to an existing
 * group must never dilute that group's own weight, or every recall
 * improvement from a new synonym would be offset by a lower score for the
 * concept it was added to. (An earlier version of this file computed weight
 * per flat keyword phrase; scripts/regression-test.ts caught the resulting
 * dilution bug when this file's synonym set was expanded.)
 */
const GROUP_WEIGHT: Map<string, number> = (() => {
  const docFreq = new Map<string, number>();
  for (const tag of ALL_TAGS) {
    for (const group of tag.concepts) {
      const key = group[0].toLowerCase();
      docFreq.set(key, (docFreq.get(key) ?? 0) + 1);
    }
  }
  const weights = new Map<string, number>();
  for (const [key, freq] of docFreq) weights.set(key, 1 / freq);
  return weights;
})();

/**
 * Local, deterministic FALLBACK ONLY, used when no ANTHROPIC_API_KEY is
 * configured (see lib/semanticClassifier.ts for the real path): weighted
 * overlap between a problem tag's concept groups and the caller's free
 * text, plus a full score for tags the caller explicitly selected as chips.
 *
 * A concept group counts as satisfied when ANY of its synonym phrases has
 * every one of its (stemmed) words present somewhere in the input -- not
 * necessarily adjacent, not necessarily in the same order. This is
 * deliberately looser than requiring an exact substring: "we need to clean
 * our data" now matches the concept group containing "clean data" even
 * though "our" sits in between, which a strict adjacency check (the
 * original implementation) would miss. The tradeoff is explicit: this is
 * bag-of-words, not real semantic understanding, so it can be fooled by two
 * unrelated words of a phrase both appearing coincidentally, and it cannot
 * generalize beyond phrasing someone thought to enumerate as a synonym --
 * see README's "How matching works" section. classifyProblemTags() replaces
 * this per-query whenever an API key is available; this function only runs
 * as the honestly-labeled degraded path (see `matchingMode` on
 * MatchResponse).
 */
function tagOverlap(tagId: string, inputTokens: Set<string>, selectedTagIds: Set<string>): number {
  if (selectedTagIds.has(tagId)) return 1;
  const tag = TAG_BY_ID[tagId];
  if (!tag) return 0;
  let matchedWeight = 0;
  let totalWeight = 0;
  for (const group of tag.concepts) {
    const weight = GROUP_WEIGHT.get(group[0].toLowerCase()) ?? 1;
    totalWeight += weight;
    const satisfied = group.some((phrase) => {
      const words = phrase.toLowerCase().split(/\s+/).map(stem);
      return words.every((w) => inputTokens.has(w));
    });
    if (satisfied) matchedWeight += weight;
  }
  return totalWeight === 0 ? 0 : matchedWeight / totalWeight;
}

function semanticMatch(
  vendor: Vendor,
  inputTokens: Set<string>,
  selectedTagIds: Set<string>,
  llmScores: Map<string, number> | null
): number {
  if (vendor.problemTags.length === 0) return 0;
  const overlaps = vendor.problemTags
    .map((t) => {
      if (selectedTagIds.has(t)) return 1;
      if (llmScores) return llmScores.get(t) ?? 0;
      return tagOverlap(t, inputTokens, selectedTagIds);
    })
    .sort((a, b) => b - a);
  const best = overlaps[0] ?? 0;
  const second = overlaps[1] ?? 0;
  return Math.min(1, best * 0.75 + second * 0.25);
}

const COMPLEXITY_RANK: Record<ComplexityLevel, number> = { low: 0, medium: 1, high: 2 };

function complexityFit(vendor: Vendor, tolerance: ComplexityLevel): number {
  if (!vendor.implementationComplexity) return 0.5;
  const diff = Math.abs(COMPLEXITY_RANK[tolerance] - COMPLEXITY_RANK[vendor.implementationComplexity]);
  if (diff === 0) return 1;
  if (diff === 1) return 0.55;
  return 0.15;
}

const SIZE_ADJACENCY: Record<CompanySize, CompanySize[]> = {
  startup: ['mid_market'],
  mid_market: ['startup', 'enterprise'],
  enterprise: ['mid_market'],
};

interface FactorResult {
  value: number;
  /** false = `value` is a neutral filler standing in for missing data, and
   * must be rendered as "Not enough data" / "Not applicable", never as a
   * real percentage (see MatchFactorAvailability in lib/types.ts). */
  available: boolean;
}

function companySizeFit(vendor: Vendor, size: CompanySize): FactorResult {
  if (vendor.companySizeFit.length === 0) return { value: 0.4, available: false };
  if (vendor.companySizeFit.includes(size)) return { value: 1, available: true };
  const adjacent = SIZE_ADJACENCY[size];
  if (vendor.companySizeFit.some((s) => adjacent.includes(s))) return { value: 0.5, available: true };
  return { value: 0.15, available: true };
}

function ecosystemSynergyBonus(vendor: Vendor, existingStack: MatchRequest['existingStack']): FactorResult {
  // No stack on file at all -- there is nothing to compare against, so this
  // factor is not applicable, not a real "no synergy" measurement.
  if (existingStack.length === 0) return { value: 0, available: false };
  if (vendor.vendorEcosystem === 'independent') return { value: 0, available: true };
  return { value: existingStack.includes(vendor.vendorEcosystem) ? 1 : 0, available: true };
}

const WEIGHTS = { semantic: 0.55, complexity: 0.2, companySize: 0.15, ecosystem: 0.1 };

function scoreVendor(
  vendor: Vendor,
  req: MatchRequest,
  inputTokens: Set<string>,
  selectedTagIds: Set<string>,
  llmScores: Map<string, number> | null
): MatchResult {
  const sizeFit = companySizeFit(vendor, req.companySize);
  const ecoFit = ecosystemSynergyBonus(vendor, req.existingStack);
  const factors: MatchFactorBreakdown = {
    semanticMatch: semanticMatch(vendor, inputTokens, selectedTagIds, llmScores),
    complexityFit: complexityFit(vendor, req.complexityTolerance),
    companySizeFit: sizeFit.value,
    ecosystemSynergyBonus: ecoFit.value,
  };
  const raw =
    WEIGHTS.semantic * factors.semanticMatch +
    WEIGHTS.complexity * factors.complexityFit +
    WEIGHTS.companySize * factors.companySizeFit +
    WEIGHTS.ecosystem * factors.ecosystemSynergyBonus;
  const weightSum = WEIGHTS.semantic + WEIGHTS.complexity + WEIGHTS.companySize + (req.existingStack.length > 0 ? WEIGHTS.ecosystem : 0);
  const score = raw / weightSum;

  return {
    vendor,
    score,
    factors,
    factorAvailability: { companySizeFit: sizeFit.available, ecosystemSynergyBonus: ecoFit.available },
    ecosystemBonusApplied: factors.ecosystemSynergyBonus > 0,
    reason: '', // filled in for alternatives once the top picks' categories are known (see buildReason)
  };
}

/**
 * Deterministic tie-break, most heavily-weighted factor first, ending in an
 * alphabetical fallback. Two vendors can legitimately land on the exact
 * same score -- this decides which renders as #1 vs #2 using only the four
 * disclosed scoring factors, the same ones shown in the explainability
 * breakdown. Market share, consulting alliances and review scores are never
 * consulted here, same as in the score itself (see the "How it works"
 * section on the landing page).
 */
function compareResults(a: MatchResult, b: MatchResult): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.factors.semanticMatch !== a.factors.semanticMatch) return b.factors.semanticMatch - a.factors.semanticMatch;
  if (b.factors.complexityFit !== a.factors.complexityFit) return b.factors.complexityFit - a.factors.complexityFit;
  if (b.factors.companySizeFit !== a.factors.companySizeFit) return b.factors.companySizeFit - a.factors.companySizeFit;
  return a.vendor.name.localeCompare(b.vendor.name);
}

const RELEVANCE_FLOOR = 0.32;
const ALTERNATIVE_FLOOR = 0.18;

function buildReason(factors: MatchFactorBreakdown, vendor: Vendor, topCategories: Set<string>, hasTop: boolean): string {
  if (factors.complexityFit < 0.4) {
    return `Good problem fit, but ${vendor.name}'s typical implementation complexity does not match your team's stated tolerance.`;
  }
  if (factors.companySizeFit < 0.4) {
    return `Good problem fit, but ${vendor.name} is typically deployed at a different company size than yours.`;
  }
  if (hasTop && !topCategories.has(vendor.category)) {
    return `Adjacent category (${vendor.category}) -- could complement your stack rather than replace the top picks.`;
  }
  if (factors.semanticMatch < RELEVANCE_FLOOR) {
    return hasTop
      ? `Same category, but a narrower fit for the specific problem you described than the top picks.`
      : `A relevant partner, but no vendor scored high enough on problem fit for a confident top pick this time.`;
  }
  return hasTop ? `Solid fit, but scored just behind the top picks overall.` : `A relevant partner for this problem, just below our confidence bar for a top pick.`;
}

export async function runMatch(req: MatchRequest, selectedTagIds: string[] = []): Promise<MatchResponse> {
  const inputTokens = tokenize(req.problem);
  const selected = new Set(selectedTagIds);
  const enrichedVendors = VENDORS.filter((v) => v.enriched);

  // Real semantic classification, once per query (not per vendor) -- see
  // lib/semanticClassifier.ts. Falls back to the local token matcher (null)
  // when no ANTHROPIC_API_KEY is configured, or on any request failure --
  // never silently produces zero results just because the network call
  // failed. Which path actually ran is disclosed via `matchingMode` below,
  // never presented as if both were equally the same thing.
  const classification = await classifyProblemTags(req.problem).catch((err) => {
    console.error('[runMatch] classification threw unexpectedly:', err);
    return null;
  });
  const llmScores = classification?.scores ?? null;
  const matchingMode: MatchResponse['matchingMode'] = classification ? 'llm-semantic' : 'keyword-fallback';

  const results = enrichedVendors
    .map((v) => scoreVendor(v, req, inputTokens, selected, llmScores))
    .sort(compareResults);

  // A real relevance floor: complexity/company-size fit alone can never
  // promote a vendor into view. Below the floor, a vendor is excluded
  // entirely rather than padded in as a weak "alternative" -- fewer, honest
  // results beat three confident-looking cards for the wrong category.
  //
  // Within that, never let two products of the SAME company occupy two of
  // the three slots -- keep only the best-scoring product per
  // `parentCompany` (see lib/types.ts). Showing e.g. "Salesforce" and
  // "Salesforce Service Cloud" as two independent recommendations
  // double-counts one vendor decision as two.
  const top: MatchResult[] = [];
  const topParents = new Set<string>();
  for (const r of results) {
    if (top.length >= 3) break;
    if (r.factors.semanticMatch < RELEVANCE_FLOOR) continue;
    if (topParents.has(r.vendor.parentCompany)) continue;
    topParents.add(r.vendor.parentCompany);
    top.push(r);
  }
  const topIds = new Set(top.map((r) => r.vendor.id));
  const topCategories = new Set(top.map((r) => r.vendor.category));

  // The stack is built ONLY from the (already parent-deduped) top picks --
  // never from outside candidates. Reaching outside top3 risks pulling in a
  // redundant sibling of a company already represented there (e.g. bare
  // "Salesforce" alongside "Salesforce Service Cloud"), which is the same
  // contradiction as showing one company as both recommended and not.
  const stack = buildStackRecommendation(top);

  const alternatives = results
    .filter((r) => !topIds.has(r.vendor.id))
    .filter((r) => r.factors.semanticMatch >= ALTERNATIVE_FLOOR)
    .filter((r) => {
      // Suppress a bare umbrella entry (its own product line's parent, e.g.
      // plain "Salesforce") once a product of that same company already
      // appears as recommended above -- never show one company as both
      // "recommended" and "didn't make it" on the same results screen.
      const isFlagshipEntry = r.vendor.name === r.vendor.parentCompany;
      return !(isFlagshipEntry && topParents.has(r.vendor.parentCompany));
    })
    .slice(0, 5)
    .map((r) => ({ ...r, reason: buildReason(r.factors, r.vendor, topCategories, top.length > 0) }));

  // Never a bare dead end -- but only reach for this fallback when
  // `alternatives` is ALSO empty. Alternatives already means "real,
  // above-ALTERNATIVE_FLOOR candidates just below top-3 confidence", so if
  // any exist, showing them is the honest answer; a separate "closest
  // available, low confidence" tier at that point would just duplicate the
  // same vendors under a second heading (a real bug caught by testing).
  // This only fires for the case neither `top` nor `alternatives` covers:
  // something with a little topical signal (semanticMatch > 0) but not
  // enough to clear even the alternative floor.
  const belowConfidence =
    top.length === 0 && alternatives.length === 0 ? results.filter((r) => r.factors.semanticMatch > 0).slice(0, 3) : [];

  // When real classification ran, trust its judgment of what's a genuine
  // capability gap (it understands the taxonomy's actual coverage) over the
  // local stopword heuristic, which can only tell "word not in vocabulary,"
  // not "word is generic vs. substantive" -- exactly the false-positive
  // pattern ("clients", "persons" flagged as gaps) that motivated this.
  const coverageGap = classification
    ? classification.uncoveredConcepts.length > 0
      ? classification.uncoveredConcepts
      : null
    : detectCoverageGap(req.problem);

  // The top.length === 0 cases are handled by dedicated UI (the
  // belowConfidence section and/or the coverageGap callout, each with their
  // own explanation and a "report this gap" action) -- `notice` only covers
  // the case those two don't: a partial top (1-2 confident matches),
  // where padding to 3 with a weaker fit would be dishonest.
  const notice =
    top.length > 0 && top.length < 3
      ? `Only ${top.length} confident match${top.length === 1 ? '' : 'es'} found for this problem in the current dataset -- showing ${top.length} rather than padding to 3 with a weaker fit.`
      : null;

  return {
    top,
    alternatives,
    stack,
    topSummary: buildTopSummary(top, alternatives, stack, req),
    notice,
    belowConfidence,
    coverageGap,
    matchingMode,
  };
}

/**
 * One sentence, always present whenever there's at least one result (top OR
 * alternatives), tying the cards together into a single coherent
 * recommendation rather than a set of unrelated results.
 */
function buildTopSummary(top: MatchResult[], alternatives: MatchResult[], stack: StackRecommendation | null, req: MatchRequest): string {
  if (top.length === 0) {
    if (alternatives.length === 0) return '';
    const altCategories = Array.from(new Set(alternatives.map((r) => r.vendor.category)));
    return `No vendor scored high enough on problem fit for a confident top-3 pick this time, but these partners in ${altCategories.join(', ')} are relevant to the problem you described.`;
  }
  const categories = Array.from(new Set(top.map((r) => r.vendor.category)));

  if (stack) {
    return `These top picks include a complementary set -- ${stack.title} -- covering ${stack.categories.join(', ')} for the same underlying problem, combined into one stack rather than one winner-takes-all platform.`;
  }
  if (categories.length === 1) {
    return `These are the closest matches within ${categories[0]} for the problem you described, ranked by problem fit, implementation complexity and company-size fit${
      req.existingStack.length > 0 ? ', with your existing stack applied as a tie-breaking bonus' : ''
    }.`;
  }
  return `These were ranked together as the closest overall matches across ${categories.join(', ')} for the problem you described.`;
}

/**
 * Detects a complementary stack strictly among the (already parent-deduped)
 * top picks themselves, by checking for a genuine, published
 * integrationEcosystem link from one top pick to another in a different
 * category -- e.g. Cognigy + Salesforce Service Cloud + Twilio, if all
 * three happened to be top picks in different categories.
 *
 * This deliberately never reaches outside the top picks to add a vendor:
 * doing so previously reintroduced the exact bug this exists to prevent --
 * pulling in a redundant sibling of a company already represented in top3
 * (e.g. bare "Salesforce" alongside "Salesforce Service Cloud"). A stack
 * member set is therefore always a subset of top3, so its parents are
 * already guaranteed unique by the caller's dedup step.
 */
function buildStackRecommendation(top: MatchResult[]): StackRecommendation | null {
  const categories = new Set(top.map((r) => r.vendor.category));
  if (top.length < 2 || categories.size < 2) return null;

  const vendors = top.map((r) => r.vendor);
  // A link only being enriched on one side (e.g. Zendesk lists "Slack" but
  // Slack's own note doesn't mention Zendesk back) is still a real,
  // published integration -- check both directions before ruling a pair out.
  const linksTo = (a: Vendor, b: Vendor) => a.integrationEcosystem.includes(b.name);
  const linked = vendors.filter((v) =>
    vendors.some((other) => other.id !== v.id && other.category !== v.category && (linksTo(v, other) || linksTo(other, v)))
  );

  if (linked.length < 2) return null;

  const members: StackMember[] = linked.map((v) => ({
    vendor: v,
    label: v.name === v.parentCompany ? v.name : `${v.parentCompany} (${v.name.replace(`${v.parentCompany} `, '')})`,
  }));

  const stackCategories = Array.from(new Set(members.map((m) => m.vendor.category)));
  return {
    title: members.map((m) => m.label).join(' + '),
    categories: stackCategories,
    vendors: members,
    rationale: `These partners appear in each other's published integration ecosystem, so they can be combined into a single working stack across ${stackCategories.join(', ')} instead of picking one winner-takes-all platform.`,
  };
}
