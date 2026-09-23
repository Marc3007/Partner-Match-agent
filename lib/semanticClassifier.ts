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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Logged deliberately (not just a silent null) -- otherwise "key never
    // configured" and "key configured but the API call failed" are
    // indistinguishable from server logs alone, which is exactly the kind
    // of debugging dead-end that makes a wrong Vercel env var scope
    // (Production vs. Preview) hard to diagnose from the outside.
    console.error('[semanticClassifier] ANTHROPIC_API_KEY is not set in this environment -- falling back to keyword matching. If you configured it in Vercel, check it is enabled for the environment (Production/Preview/Development) this deployment is actually running in.');
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
        max_tokens: 4096,
        messages: [{ role: 'user', content: buildPrompt(problem) }],
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error('[semanticClassifier] request failed:', err);
    return null;
  }

  if (!res.ok) {
    console.error('[semanticClassifier] non-OK response:', res.status, await res.text().catch(() => ''));
    return null;
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }

  const text: string = (data as { content?: { text?: string }[] })?.content?.[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[semanticClassifier] no JSON object found in response text:', text.slice(0, 300));
    return null;
  }

  let parsed: { scores?: Record<string, unknown>; uncovered_concepts?: unknown };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[semanticClassifier] failed to parse JSON:', err);
    return null;
  }

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

  return { scores, uncoveredConcepts, model };
}
