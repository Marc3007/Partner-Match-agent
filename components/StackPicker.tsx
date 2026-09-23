'use client';

import { ECOSYSTEM_OPTIONS } from '@/lib/ecosystems';
import type { Ecosystem } from '@/lib/types';
import { CheckIcon } from './Icons';

interface Props {
  selected: Ecosystem[];
  onChange: (next: Ecosystem[]) => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function StackPicker({ selected, onChange, onContinue, onSkip }: Props) {
  function toggle(value: Ecosystem) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-400">Step 1 of 2</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-mist-100 sm:text-4xl">
        Already running one of these at scale?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-mist-400">
        Optional, and it never overrides a bad fit — but if a partner shares your existing
        ecosystem, it often means lower marginal licensing cost and a faster integration. Select
        all that apply.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ECOSYSTEM_OPTIONS.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                active
                  ? 'border-signal-400/60 bg-signal-400/10 text-mist-100'
                  : 'border-white/10 bg-ink-800/50 text-mist-300 hover:border-white/20'
              }`}
            >
              {opt.label}
              {active && <CheckIcon size={16} className="shrink-0 text-signal-400" />}
            </button>
          );
        })}
      </div>

      <div className="mt-10 flex items-center gap-4">
        <button
          onClick={onContinue}
          className="rounded-full bg-signal-ion px-6 py-3 text-sm font-semibold text-ink-950 transition hover:brightness-110"
        >
          Continue
        </button>
        <button onClick={onSkip} className="text-sm font-medium text-mist-400 hover:text-mist-100">
          Skip — none yet / not sure
        </button>
      </div>
    </div>
  );
}
