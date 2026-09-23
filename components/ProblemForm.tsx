'use client';

import { useMemo, useState } from 'react';
import { TAG_GROUPS } from '@/lib/tags';
import type { CompanySize, ComplexityLevel } from '@/lib/types';

interface Props {
  problem: string;
  setProblem: (v: string) => void;
  industry: string;
  setIndustry: (v: string) => void;
  companySize: CompanySize;
  setCompanySize: (v: CompanySize) => void;
  complexityTolerance: ComplexityLevel;
  setComplexityTolerance: (v: ComplexityLevel) => void;
  selectedTagIds: string[];
  setSelectedTagIds: (v: string[]) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

const SIZE_OPTIONS: { value: CompanySize; label: string; help: string }[] = [
  { value: 'startup', label: 'Startup', help: 'Under ~200 people' },
  { value: 'mid_market', label: 'Mid-market', help: '~200–2,000 people' },
  { value: 'enterprise', label: 'Enterprise', help: '2,000+ people' },
];

const COMPLEXITY_OPTIONS: { value: ComplexityLevel; label: string; help: string }[] = [
  { value: 'low', label: 'Low', help: 'Fast, self-serve rollout' },
  { value: 'medium', label: 'Medium', help: 'Some IT / integration work' },
  { value: 'high', label: 'High', help: 'Dedicated implementation project' },
];

export function ProblemForm(props: Props) {
  const {
    problem, setProblem, industry, setIndustry, companySize, setCompanySize,
    complexityTolerance, setComplexityTolerance, selectedTagIds, setSelectedTagIds,
    onSubmit, onBack, loading, error,
  } = props;
  const [tagFilter, setTagFilter] = useState('');

  const filteredGroups = useMemo(() => {
    const q = tagFilter.trim().toLowerCase();
    if (!q) return TAG_GROUPS;
    return TAG_GROUPS.map((g) => ({ ...g, tags: g.tags.filter((t) => t.label.toLowerCase().includes(q)) })).filter(
      (g) => g.tags.length > 0
    );
  }, [tagFilter]);

  function toggleTag(id: string) {
    setSelectedTagIds(selectedTagIds.includes(id) ? selectedTagIds.filter((t) => t !== id) : [...selectedTagIds, id]);
  }

  const canSubmit = problem.trim().length >= 8 && !loading;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-400">Step 2 of 2</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-mist-100 sm:text-4xl">
        What problem are you trying to solve?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-mist-400">
        Plain language is fine. One or two sentences is usually enough.
      </p>

      <textarea
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        rows={4}
        placeholder="e.g. Our support team is drowning in repetitive tickets and our current helpdesk can't automate multi-step resolutions."
        className="mt-6 w-full rounded-xl border border-white/10 bg-ink-800/60 p-4 text-sm leading-relaxed text-mist-100 placeholder:text-mist-500 focus:border-signal-400/60 focus:outline-none focus:ring-1 focus:ring-signal-400/40"
      />

      <div className="mt-6">
        <p className="text-sm font-medium text-mist-300">Refine with specific capabilities (optional)</p>
        <input
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="Search capabilities, e.g. 'onboarding' or 'cloud migration'"
          className="mt-2 w-full rounded-lg border border-white/10 bg-ink-800/40 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 focus:border-signal-400/60 focus:outline-none"
        />
        <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-white/5 p-2">
          <div className="flex flex-wrap gap-2">
            {filteredGroups.flatMap((g) => g.tags).slice(0, 40).map((tag) => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active
                      ? 'border-ion-400/60 bg-ion-400/15 text-mist-100'
                      : 'border-white/10 text-mist-400 hover:border-white/25 hover:text-mist-100'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-mist-300">Company size</p>
          <div className="mt-2 flex flex-col gap-2">
            {SIZE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                  companySize === opt.value ? 'border-signal-400/60 bg-signal-400/10 text-mist-100' : 'border-white/10 text-mist-400'
                }`}
              >
                <span>
                  {opt.label} <span className="text-mist-500">· {opt.help}</span>
                </span>
                <input type="radio" className="sr-only" checked={companySize === opt.value} onChange={() => setCompanySize(opt.value)} />
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-mist-300">Implementation complexity you can absorb</p>
          <div className="mt-2 flex flex-col gap-2">
            {COMPLEXITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                  complexityTolerance === opt.value ? 'border-ion-400/60 bg-ion-400/10 text-mist-100' : 'border-white/10 text-mist-400'
                }`}
              >
                <span>
                  {opt.label} <span className="text-mist-500">· {opt.help}</span>
                </span>
                <input
                  type="radio"
                  className="sr-only"
                  checked={complexityTolerance === opt.value}
                  onChange={() => setComplexityTolerance(opt.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-mist-300">Industry (optional)</p>
        <input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. Retail, Manufacturing, Financial Services"
          className="mt-2 w-full rounded-lg border border-white/10 bg-ink-800/40 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 focus:border-signal-400/60 focus:outline-none"
        />
      </div>

      {error && <p className="mt-4 text-sm text-ember-500">{error}</p>}

      <div className="mt-10 flex items-center gap-4">
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="rounded-full bg-signal-ion px-6 py-3 text-sm font-semibold text-ink-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Matching…' : 'Find my top 3'}
        </button>
        <button onClick={onBack} className="text-sm font-medium text-mist-400 hover:text-mist-100">
          Back
        </button>
      </div>
    </div>
  );
}
