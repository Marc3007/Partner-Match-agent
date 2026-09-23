import { ALL_TAGS } from './tags';

/**
 * Real semantic matching: a single Claude API call per query that judges
 * relevance by MEANING against the tag taxonomy, replacing the local
 * bag-of-words proxy in lib/matching.ts's tagOverlap()/detectCoverageGap().
 *
 * Design choice (per docs/ARCHITECTURE.md): classify against the ~102-tag
 * taxonomy, not the 205-vendor corpus directly. Vendors already carry
 * `problemTags` pointing into this same taxonomy, so a per-tag relevance
 * vector is all downstream scoring (lib/matching.ts's scoreVendor/
 * compareResults/relevance floor/tie-breaking) needs -- nothing else about
 * the scoring pipeline has to change. This also keeps the prompt's size
 * fixed (~102 short lines) regardless of how many vendors are in the
 * dataset, rather than growing with vendor count.
 *
 * Model: Haiku 4.5 -- this is a bounded classification task (score N fixed
 * categories against one paragraph), not open-ended reasoning, so the
 * fastest/cheapest current-generation model is the right fit for a
 * per-query call. Override with ANTHROPIC_CLASSIFIER_MODEL if needed.
 */

export interface SemanticClassification {
  /** tagId -> relevance score in [0, 1], judged by meaning. */
  scores: Map<string, number>;
  /**
   * Specific, substantive capabilities the model identified in the problem
   * text that have no reasonable match anywhere in the tag taxonomy --
   * NOT generic nouns that simply don't appear in tag phrasing. Replaces
   * the local word-list heuristic in detectCoverageGap() when this path is
   * active, since a real understanding of the taxonomy's coverage is
   * exactly what a keyword stoplist can't provide.
   */
  uncoveredConcepts: string[];
  model: string;
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Shared call path for every Claude-backed helper in this file: same key
 * lookup, same timeout, same "log the specific reason, never fail silent"
 * behavior. Returns the raw response text (expected to contain a JSON
 * object the caller parses itself) or null on any failure -- callers must
 * treat null as "fall back," never as "empty but valid."
 */
export async function callClaudeForText(prompt: string, maxTokens: number, logPrefix: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(`[${logPrefix}] ANTHROPIC_API_KEY is not set in this environment -- falling back. If you configured it in Vercel, check it is enabled for the environment (Production/Preview/Development) this deployment is actually running in.`);
    return null;
  }

  const model = process.env.ANTHROPIC_CLASSIFIER_MODEL || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error(`[${logPrefix}] request failed:`, err);
    return null;
  }

  if (!res.ok) {
    console.error(`[${logPrefix}] non-OK response:`, res.status, await res.text().catch(() => ''));
    return null;
  }

  try {
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data?.content?.[0]?.text ?? null;
  } catch (err) {
    console.error(`[${logPrefix}] failed to parse response body:`, err);
    return null;
  }
}

export function extractJsonObject(text: string, logPrefix: string): Record<string, unknown> | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`[${logPrefix}] no JSON object found in response text:`, text.slice(0, 300));
    return null;
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`[${logPrefix}] failed to parse JSON:`, err);
    return null;
  }
}

function buildPrompt(problem: string): string {
  const tagList = ALL_TAGS.map((t) => `${t.id}: ${t.label}`).join('\n');
  return `You are classifying a customer's free-text business problem against a fixed taxonomy of technology-capability tags, judging by MEANING and underlying need, not by literal word overlap. The customer may phrase their problem in casual, indirect, or non-technical language -- your job is to understand what they actually need help with.

Problem description:
"""
${problem.slice(0, 2000)}
"""

Tag taxonomy (id: label), one technology capability per line:
${tagList}

Instructions:
1. For EVERY tag above, output a relevance score from 0 to 1: how well that tag's capability would address the customer's actual underlying need. Score high even when none of the tag's own words appear in the problem text, if the real-world need clearly matches (e.g. "our call center is short-staffed and we want an AI bot to pick up calls" should score contact-center-modernization and conversational-ai-agents highly even though the text never says those exact words). Score near 0 for tags that are simply unrelated to the stated problem, however loosely worded.
2. Separately, list any SPECIFIC, substantive capability the customer is clearly asking for that has NO reasonable match anywhere in the taxonomy above -- a genuine coverage gap. Do NOT list generic nouns, process/style descriptors (e.g. "agile," "modern," "clients," "better"), or anything that a tag above already reasonably covers. Only list something here if a real technology category is missing from the taxonomy entirely. Usually this list is empty.

Respond with ONLY a single JSON object, no prose, no markdown fences, in exactly this shape:
{"scores": {"<tag-id>": <0-1>, ...one entry per tag above...}, "uncovered_concepts": ["<short phrase>", ...]}`;
}

export async function classifyProblemTags(problem: string): Promise<SemanticClassification | null> {
  const text = await callClaudeForText(buildPrompt(problem), 4096, 'semanticClassifier');
  if (!text) return null;

  const parsed = extractJsonObject(text, 'semanticClassifier') as { scores?: Record<string, unknown>; uncovered_concepts?: unknown } | null;
  if (!parsed) return null;

  const validIds = new Set(ALL_TAGS.map((t) => t.id));
  const scores = new Map<string, number>();
  for (const [tagId, value] of Object.entries(parsed.scores ?? {})) {
    if (!validIds.has(tagId)) continue;
    const n = typeof value === 'number' ? value : NaN;
    if (!Number.isFinite(n)) continue;
    scores.set(tagId, Math.max(0, Math.min(1, n)));
  }
  if (scores.size === 0) return null;

  const uncoveredConcepts = Array.isArray(parsed.uncovered_concepts)
    ? parsed.uncovered_concepts.filter((c): c is string => typeof c === 'string').slice(0, 5)
    : [];

  const model = process.env.ANTHROPIC_CLASSIFIER_MODEL || DEFAULT_MODEL;
  return { scores, uncoveredConcepts, model };
}

export interface RationaleVendorInput {
  id: string;
  name: string;
  category: string;
  /** Human-readable tag labels (not raw ids), e.g. "Headless commerce" --
   * grounds the rationale in the vendor's actual, real capabilities rather
   * than letting the model invent plausible-sounding but unsupported ones. */
  tagLabels: string[];
}

function buildRationalePrompt(problem: string, vendors: RationaleVendorInput[]): string {
  const vendorList = vendors
    .map((v) => `- id: ${v.id}\n  name: ${v.name}\n  category: ${v.category}\n  known capabilities: ${v.tagLabels.join(', ')}`)
    .join('\n');
  return `A customer described this problem:
"""
${problem.slice(0, 2000)}
"""

These vendors were matched as strong candidates. For EACH one, write exactly ONE concise sentence (max ~25 words) explaining why it could plausibly address the customer's SPECIFIC problem, grounded only in the "known capabilities" listed for that vendor -- never invent a capability that isn't listed, and never write generic praise that could apply to any vendor ("a great choice", "highly rated"). Reference the customer's actual situation, not just a restatement of the tag list.

Vendors:
${vendorList}

Respond with ONLY a single JSON object, no prose, no markdown fences, in exactly this shape:
{"<vendor id>": "<one sentence>", ...one entry per vendor above...}`;
}

/**
 * One-sentence, plain-language "why this fits" explanation per top match,
 * generated once per query for all top picks together (not one call per
 * vendor). Context/explanation only -- runs strictly AFTER scoring and
 * ranking are final, so it can never influence which vendors made top-3 or
 * in what order (see runMatch() in lib/matching.ts). Returns null on any
 * failure; callers must fall back to a deterministic, tag-based sentence
 * (buildFallbackRationale in lib/matching.ts) rather than show nothing.
 */
export async function generateMatchRationales(problem: string, vendors: RationaleVendorInput[]): Promise<Map<string, string> | null> {
  if (vendors.length === 0) return null;
  const text = await callClaudeForText(buildRationalePrompt(problem, vendors), 1024, 'matchRationale');
  if (!text) return null;

  const parsed = extractJsonObject(text, 'matchRationale');
  if (!parsed) return null;

  const validIds = new Set(vendors.map((v) => v.id));
  const rationales = new Map<string, string>();
  for (const [id, value] of Object.entries(parsed)) {
    if (!validIds.has(id) || typeof value !== 'string') continue;
    const sentence = value.trim().slice(0, 240);
    if (sentence) rationales.set(id, sentence);
  }
  return rationales.size > 0 ? rationales : null;
}
