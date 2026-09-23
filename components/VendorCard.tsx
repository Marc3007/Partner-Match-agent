import type { MatchResult } from '@/lib/types';
import { ExplainabilityBars } from './ExplainabilityBars';
import { MarketContextWidget } from './MarketContextWidget';
import { FeedbackButtons } from './FeedbackButtons';
import { CheckIcon } from './Icons';

const CONSULTANCIES: { key: 'accenture' | 'deloitte' | 'pwc' | 'bain'; label: string }[] = [
  { key: 'accenture', label: 'Accenture' },
  { key: 'deloitte', label: 'Deloitte' },
  { key: 'pwc', label: 'PwC' },
  { key: 'bain', label: 'Bain' },
];

export function VendorCard({ result, rank, problem }: { result: MatchResult; rank: number; problem: string }) {
  const { vendor, score, factors, factorAvailability, ecosystemBonusApplied } = result;
  const validated = CONSULTANCIES.filter((c) => vendor.consultingValidation[c.key]);
  const hasMarketContext = vendor.marketShare.valuePct !== null;

  return (
    <div className="card-grain flex flex-col rounded-2xl border border-white/10 bg-ink-800/70 p-6 shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[11px] text-signal-400">#{rank}</span>
          <h3 className="font-display text-xl font-semibold text-mist-100">{vendor.name}</h3>
          <p className="text-xs text-mist-500">
            {vendor.category}
            {vendor.parentCompany !== vendor.name && <span> · a {vendor.parentCompany} product</span>}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-display text-2xl font-semibold text-gradient">{Math.round(score * 100)}%</span>
          <span className="text-[10px] uppercase tracking-wide text-mist-500">match score</span>
        </div>
      </div>

      {vendor.tier === 'core_validated' && (
        <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-signal-400/30 bg-signal-400/10 px-2.5 py-1 text-[10px] font-medium text-signal-300">
          <CheckIcon size={11} /> Alliance-validated tier
        </span>
      )}

      {ecosystemBonusApplied && vendor.existingStackSynergyNote && (
        <div className="mt-4 rounded-lg border border-ion-400/25 bg-ion-400/[0.07] p-3 text-xs leading-relaxed text-mist-300">
          <span className="font-semibold text-ion-300">Existing stack synergy — </span>
          {vendor.existingStackSynergyNote}
        </div>
      )}

      <div className="mt-5">
        <ExplainabilityBars factors={factors} availability={factorAvailability} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-mist-400">
        {vendor.implementationComplexity && (
          <span className="rounded-full border border-white/10 px-2.5 py-1 capitalize">{vendor.implementationComplexity} complexity</span>
        )}
        {vendor.typicalProjectDurationWeeks && (
          <span className="rounded-full border border-white/10 px-2.5 py-1">
            {vendor.typicalProjectDurationWeeks[0]}–{vendor.typicalProjectDurationWeeks[1]} wk rollout
          </span>
        )}
        {validated.length > 0 && (
          <span className="rounded-full border border-white/10 px-2.5 py-1">Consulting-validated: {validated.map((c) => c.label).join(', ')}</span>
        )}
      </div>

      {hasMarketContext && (
        <div className="mt-4">
          <MarketContextWidget vendor={vendor} />
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
        <FeedbackButtons vendorId={vendor.id} vendorName={vendor.name} problem={problem} />
      </div>
    </div>
  );
}
