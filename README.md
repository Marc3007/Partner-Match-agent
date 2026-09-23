# Galymer

Independent, vendor-agnostic technology partner matching. Describe a business
problem once; Galymer scores technology partners on **problem fit**,
**implementation complexity fit**, **company size fit**, and **existing-stack
synergy** — and shows the breakdown. Market share, consulting-alliance
status, and community review scores are displayed as context on every result
card, and are never inputs to the ranking.

This repository is the MVP implementation of the "Technology Partner
Matching Agent" project brief — an English-language rebuild with a working
matching engine, a curated English dataset, and the full UI concept (top-3
in full color, close alternatives visibly de-emphasized).

## Running locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

```bash
npm run build   # production build
npm run start   # serve the production build
```

No environment variables or external services are required to run the MVP —
the matching engine and dataset are both local to this app.

## Project structure

```
app/
  page.tsx              Landing page
  match/page.tsx         3-step matching flow (client component)
  api/match/route.ts      POST -> runs the scoring engine, returns top 3 + alternatives + stack
  api/feedback/route.ts   POST -> records helpful/not-helpful feedback (in-memory, MVP)
  api/rfp/route.ts        POST -> generates a first-draft requirements brief (Markdown)
components/              UI components (cards, forms, logo, charts)
lib/
  types.ts               Shared TypeScript types
  vendors.ts              English, translated & enriched partner dataset
  tags.ts                 Canonical problem-tag taxonomy used for matching
  matching.ts             The scoring engine (see "How matching works" below)
  ecosystems.ts           Ecosystem picker options
docs/
  ARCHITECTURE.md          Proposed Postgres/pgvector schema + enrichment agent design
```

## How matching works today (MVP)

The scoring formula follows the project brief exactly:

```
score = 0.55 * semantic_match
      + 0.20 * complexity_fit
      + 0.15 * company_size_fit
      + 0.10 * ecosystem_synergy_bonus   (only applied when the caller selected an existing stack)
```

- **semantic_match is real Claude classification when `ANTHROPIC_API_KEY` is
  configured** (`lib/semanticClassifier.ts`): one Claude API call per query
  scores every tag in the taxonomy by *meaning*, not word overlap, so
  paraphrases and compound wording the taxonomy's synonym list never
  anticipated ("callcenter" as one word, "clean up our records," a
  reconciliation problem that never says "financial close") are understood
  correctly. **Without a key configured (or if the request fails), it falls
  back** to a local, deterministic bag-of-words matcher: each vendor's
  canonical `problemTags` (`lib/tags.ts`) carry **concept groups** (synonym
  clusters), and the caller's free text is matched by checking whether every
  word of some phrase in a concept group appears anywhere in the input. This
  fallback is real, but it is bag-of-words, not language understanding --
  it can be fooled by unrelated words coincidentally co-occurring, and it
  cannot generalize past phrasing someone thought to enumerate. **Which one
  actually ran is never hidden**: `MatchResponse.matchingMode` is
  `'llm-semantic'` or `'keyword-fallback'`, and the results screen shows a
  different, honest banner for each -- see `docs/ARCHITECTURE.md`'s "Real
  semantic matching" section for the full design and cost/latency tradeoff,
  and `npm run test:matching` for the regression suite (runs against
  whichever mode is active based on whether `ANTHROPIC_API_KEY` is set in
  the environment).
- Below a relevance floor, a vendor is **excluded** rather than padded in as
  a weak "alternative" — complexity/company-size fit alone can never promote
  an irrelevant vendor into view.
- **Existing-stack synergy** is a bonus, never a gate, exactly as specified:
  it cannot outweigh a poor problem fit, and the UI always explains why it
  was applied.
- A **recommended stack** is proposed when the strongest matches, across
  different categories, reference each other in their published
  `integrationEcosystem` (e.g. a conversational-AI platform + a CRM service
  cloud + a communications API) — combining them instead of forcing a single
  winner. It is only ever built from the actual top-3 picks, never from
  outside candidates (see the dedup point below for why).
- **Every vendor carries a `parentCompany`** (its corporate umbrella --
  "Salesforce Service Cloud" → "Salesforce"; a flagship product's
  `parentCompany` equals its own name). Top-3 selection, the stack builder,
  and the alternatives list all dedup on it, so the same company is never
  shown twice on one results screen -- e.g. never "Salesforce" recommended
  in the stack while a bare "Salesforce" listing simultaneously appears
  under "didn't make it." See `lib/matching.ts` and `lib/types.ts`.
- **Ties** (two vendors landing on the exact same score) are broken using
  the same four disclosed factors, most heavily-weighted first, then
  alphabetically as a last resort -- never by market share, alliances, or
  reviews. See `compareResults()` in `lib/matching.ts`.
- **A result screen never dead-ends.** If nothing clears the relevance
  floor, the closest available vendors (if any have *any* topical signal)
  are still shown under an explicit "low confidence" heading rather than a
  blank page. A genuine coverage gap -- a specific, substantive capability
  the taxonomy has no tag for at all (e.g. "car configurator" before that
  category existed) -- is surfaced with a one-click "report this gap"
  action. When real classification is active, the gap list comes from the
  classifier's own judgment of what's missing (it understands the
  taxonomy's actual coverage); the keyword-fallback path uses
  `detectCoverageGap()`'s stopword heuristic instead, which is cruder by
  necessity (it can only tell "word isn't in any tag's vocabulary," not
  "word is generic vs. substantive"). See `lib/matching.ts` and the
  gap/low-confidence sections in `components/ResultsView.tsx`.

## Dataset scope (important, please read)

The source `partner-database.json` ships with 200 vendors across 20
categories, but almost all matching-relevant fields (`problem_tags`,
`implementation_complexity`, `company_size_fit`, ...) started empty — by
design, per the project brief's own roadmap ("populate `problem_tags` for
the 24 core_validated vendors first").

**All 200 original vendors have now been researched by an automated
bootstrap enrichment pass** (8 parallel agents, one per 25-vendor batch,
each grounded in the vendor's real public capabilities via live web
search rather than prior/general knowledge). Of those, **199 were
successfully tagged** with problem tags, implementation complexity,
company size fit, and integration ecosystem links, translating the
vendor's real capabilities into plain-language *customer problem* phrasing
(e.g. "long customer service wait times", not "contact center software").
Every researched vendor carries a real `sourceUrl` it was grounded in and
a research-time `confidenceScore` — see `Vendor.sourceUrl` in
`lib/types.ts` and `lib/vendors.ts`. **v186 (SAP Fioneer) came back
unmapped**: it sells core banking/insurance software platforms, and no tag
in the current 102-tag taxonomy fits that category — left unenriched
rather than forced into a wrong tag, and tracked as a genuine coverage gap
for the recurring agent (see below) rather than fixed by hand. **v200
(Uptake)** was tagged from prior knowledge only, not a live source (the
research agent's search budget ran out and outbound fetches to its site
were blocked) — flagged with a low confidence score for a follow-up pass
rather than silently treated as equally verified.

**Category 21, "Product Configuration, CPQ & 3D Visualization"** (Configit,
Tacton, Threekit, Elfsquad, Epicor CPQ), was added before the bootstrap
pass, back when this MVP first shipped: a real query ("build and visualize
car configurators") returned zero matches, and re-testing after fixing the
matching algorithm confirmed the gap was genuinely missing category
coverage, not a matching artifact, before any vendors were added for it.
It isn't in the original partner-database.json (which only defines 200
vendors) -- it's appended directly in `lib/vendors.ts` with its own id
range (v201+), hand-curated rather than bootstrap-researched, so it stays
distinguishable from the source dataset.

**Market share, G2 review scores, and case studies are intentionally left
empty for every vendor** in this build, rather than populated with invented
numbers or fabricated named case studies. The project brief is explicit that
these are enrichment-agent outputs sourced from verified public data
(vendor newsrooms, analyst summaries, alliance pages) on a schedule — they
are not something to guess at during a UI build. Result cards show a
"pending verified enrichment" state for these fields, which doubles as a
working demo of the brief's staleness-badge concept. See
`docs/ARCHITECTURE.md` for the proposed enrichment pipeline and schema.

**All further vendor-data corrections go through this automated process,
not hand-edits to individual entries** — see the recurring enrichment
Routine described in `docs/ARCHITECTURE.md`, which re-runs on a schedule
and also consumes reported coverage gaps (the "report this gap" button;
see `/api/gap-report`).

## Feedback loop

`/api/feedback` records helpful/not-helpful signal per result. It's an
in-memory store for this MVP (resets on redeploy) — the production version
is the proprietary training dataset described in the brief, backed by the
`feedback_events` table proposed in `docs/ARCHITECTURE.md`.

## Roadmap (from the project brief, not yet built here)

- Migrate `lib/vendors.ts` into Postgres + pgvector (schema proposed in
  `docs/ARCHITECTURE.md`), with a `field_history` table so every enrichment
  field stays auditable instead of overwritten.
- Build the scheduled enrichment worker (case studies, job-postings demand
  signal, consulting-alliance status, market share) with a confidence-scored
  review queue before anything goes live, per the brief's cadence table and
  the pipeline design in `docs/ARCHITECTURE.md`.
- Wire `/api/rfp` to a real Claude call for a stronger first-draft
  requirements catalogue (currently a structured template, no external call).
- Persist feedback to Postgres and turn it into the proprietary
  helpful/not-helpful training signal described in the brief.
- Re-research v200 (Uptake, low-confidence/no live source) and revisit
  v186 (SAP Fioneer, unmapped) once a core-banking/insurance tag exists.
- Industry-weighted case study matching, once case studies exist.
- If per-query cost/latency from the live Claude classification call (see
  below) becomes a constraint at higher query volume, precompute embeddings
  for the fixed tag taxonomy once and do a `pgvector` similarity lookup
  per query instead of a full classification call -- the seam for this is
  `lib/semanticClassifier.ts`'s `classifyProblemTags()` signature.

## Setting up real semantic matching

Real matching (`matchingMode: 'llm-semantic'`) requires an `ANTHROPIC_API_KEY`
in the environment:

```
# .env.local (already gitignored -- never commit this file)
ANTHROPIC_API_KEY=sk-ant-...
```

Without it, the app still works end-to-end -- `matchingMode` reports
`'keyword-fallback'` and the results screen discloses that plainly rather
than silently degrading. Model defaults to `claude-haiku-4-5-20251001`;
override with `ANTHROPIC_CLASSIFIER_MODEL` if needed. See
`docs/ARCHITECTURE.md`'s "Real semantic matching" section for the full
design.

**On Vercel specifically:** add `ANTHROPIC_API_KEY` under Project Settings →
Environment Variables, spelled exactly that way, enabled for whichever
environment (Production/Preview/Development) you're testing against, then
redeploy -- adding the variable does not retroactively affect an already-running
deployment.

## Setting up gap-report persistence (optional)

`POST /api/gap-report` (queries that found no good category match, reported
via the "Report this gap" button) commits directly to this repo's
`data/gap-reports.jsonl` via the GitHub Contents API when `GITHUB_TOKEN` is
set -- this is what lets the recurring enrichment Routine (see
`docs/ARCHITECTURE.md`) actually see real production submissions. Without a
token, it falls back to writing the local filesystem (works in dev, **not**
on Vercel, whose functions run read-only in production) and finally to an
in-memory array scoped to a single request. Set it up:

1. GitHub → Settings → Developer settings → Fine-grained personal access
   tokens → generate one scoped to **only** this repository
   (`Marc3007/Partner-Match-agent`), with **Contents: Read and write**
   permission and nothing else.
2. Add it in Vercel as `GITHUB_TOKEN`, redeploy.

Every submitted gap report becomes its own commit to `main` -- expected
volume is low (real user-reported gaps, not high-frequency telemetry), so a
commit-per-report is an intentional, simple design, not a queue.

## Match rationale ("why this could fit")

Each top-3 result carries a one-sentence, plain-language explanation of why
that specific vendor could address the stated problem (`MatchResult.matchRationale`).
In `llm-semantic` mode this is generated by a second Claude call
(`generateMatchRationales()` in `lib/semanticClassifier.ts`), grounded only
in that vendor's real `problemTags` and the actual query text -- it runs
strictly *after* scoring and ranking are final, so it is context only and
can never influence which vendors made top-3 or in what order. It never
runs in `keyword-fallback` mode (there's no grounded way to explain "why"
without real classification), and it also serves as its own fallback if the
call itself fails: every top result always gets a deterministic, tag-based
sentence (`buildFallbackRationale()` in `lib/matching.ts`) built only from
that vendor's own real tags, so a top card is never left without an
explanation.

## Trademarks

Galymer is an independent product. It is not affiliated with, sponsored by,
or endorsed by any of the technology vendors it evaluates. Vendor names
referenced in the dataset and UI belong to their respective owners and are
used only in a nominative, comparative sense.
