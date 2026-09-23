'use client';

import { useState } from 'react';
import type { CompanySize, ComplexityLevel, Ecosystem, MatchResponse } from '@/lib/types';
import { VendorCard } from './VendorCard';
import { AlternativeCard } from './AlternativeCard';
import { StackRecommendationCard } from './StackRecommendationCard';
import { GapReportButton } from './GapReportButton';
import { DownloadIcon } from './Icons';

interface Props {
  result: MatchResponse;
  problem: string;
  companySize: CompanySize;
  complexityTolerance: ComplexityLevel;
  existingStack: Ecosystem[];
  onStartOver: () => void;
}

export function ResultsView({ result, problem, companySize, complexityTolerance, existingStack, onStartOver }: Props) {
  const [generating, setGenerating] = useState(false);

  async function downloadBrief() {
    setGenerating(true);
    try {
      const res = await fetch('/api/rfp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem,
          companySize,
          complexityTolerance,
          existingStack,
          vendors: result.top.map((r) => ({ name: r.vendor.name, category: r.vendor.category, reasonSummary: r.reason })),
        }),
      });
      const data = await res.json();
      const blob = new Blob([data.markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'galymer-requirements-brief.md';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-400">Your results</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-mist-100">Top matches for your problem</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadBrief}
            disabled={generating}
            className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-mist-200 transition hover:border-white/30 disabled:opacity-50"
          >
            <DownloadIcon size={16} />
            {generating ? 'Generating…' : 'Generate requirements brief'}
          </button>
          <button onClick={onStartOver} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-mist-200 hover:border-white/30">
            Start over
          </button>
        </div>
      </div>

      {result.matchingMode === 'keyword-fallback' ? (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-ember-500/20 bg-ember-500/[0.05] px-4 py-2.5 text-xs leading-relaxed text-mist-400">
          <span className="mt-0.5 font-semibold text-ember-400">Keyword fallback active —</span>
          <span>
            no AI classification is configured for this deployment (or the request failed), so these results come from
            literal word-matching against a fixed synonym list, not real semantic understanding. Different phrasing for
            the same problem can score lower than it should. See README for how to enable real semantic matching.
          </span>
        </div>
      ) : (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-signal-500/20 bg-signal-500/[0.05] px-4 py-2.5 text-xs leading-relaxed text-mist-400">
          <span className="mt-0.5 font-semibold text-signal-400">AI-matched —</span>
          <span>these results come from a real Claude classification of your problem's meaning against every vendor's capabilities, not keyword matching.</span>
        </div>
      )}

      {result.notice && (
        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-mist-400">{result.notice}</p>
      )}

      {result.coverageGap && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-ion-400/25 bg-ion-400/[0.05] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-mist-300">
            {result.top.length > 0 ? 'Part of this request ' : 'This request '}
            doesn&apos;t match any category we cover yet — specifically around:{' '}
            <span className="font-medium text-ion-300">{result.coverageGap.join(', ')}</span>.
          </p>
          <GapReportButton problem={problem} coverageGap={result.coverageGap} />
        </div>
      )}

      {result.top.length === 0 && result.belowConfidence.length === 0 && !result.coverageGap && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-mist-400">Nothing in the current dataset scored even a weak match for this problem.</p>
          <GapReportButton problem={problem} coverageGap={null} />
        </div>
      )}

      {result.top.length === 0 && result.belowConfidence.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-medium text-mist-400">Closest available partners (low confidence)</p>
          <p className="mt-1 text-xs text-mist-500">
            None of these cleared our confidence bar for this problem — treat them as a starting point to research, not a
            recommendation.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.belowConfidence.map((r) => (
              <AlternativeCard key={r.vendor.id} result={{ ...r, reason: `${r.vendor.category} · below our confidence bar for this problem` }} />
            ))}
          </div>
        </div>
      )}

      {result.topSummary && (
        <div className="mt-6 space-y-1.5">
          <p className="text-sm leading-relaxed text-mist-300">{result.topSummary}</p>
          {result.top.length > 0 && (
            <p className="text-xs text-mist-500">
              {existingStack.length > 0
                ? `Matched with your existing stack (${existingStack.join(', ')}) applied as a synergy bonus.`
                : 'Matched without existing-stack data — stack-synergy fields below show "Not applicable." Add your stack from the previous step to unlock that bonus.'}
            </p>
          )}
        </div>
      )}

      {result.stack && (
        <div className="mt-6">
          <StackRecommendationCard stack={result.stack} />
        </div>
      )}

      {result.top.length > 0 && (
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {result.top.map((r, i) => (
            <VendorCard key={r.vendor.id} result={r} rank={i + 1} problem={problem} />
          ))}
        </div>
      )}

      {result.alternatives.length > 0 && (
        <div className={result.top.length > 0 ? 'mt-12' : 'mt-8'}>
          <p className="text-sm font-medium text-mist-400">
            {result.top.length > 0 ? 'Other candidates that came close' : 'Relevant partners (below top-pick confidence)'}
          </p>
          <p className="mt-1 text-xs text-mist-500">
            {result.top.length > 0
              ? 'Shown for transparency — not recommended with the same confidence as the top 3.'
              : 'None scored high enough for a confident top-3 pick, but these are relevant — treat them as a starting point to research.'}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.alternatives.map((r) => (
              <AlternativeCard key={r.vendor.id} result={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
