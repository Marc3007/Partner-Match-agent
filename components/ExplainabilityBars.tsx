import type { MatchFactorAvailability, MatchFactorBreakdown } from '@/lib/types';

const ROWS: { key: keyof MatchFactorBreakdown; label: string; color: string; unavailableLabel?: string }[] = [
  { key: 'semanticMatch', label: 'Problem fit', color: 'bg-signal-400' },
  { key: 'complexityFit', label: 'Complexity fit', color: 'bg-ion-400' },
  { key: 'companySizeFit', label: 'Company size fit', color: 'bg-mist-300', unavailableLabel: 'Not enough data' },
  {
    key: 'ecosystemSynergyBonus',
    label: 'Stack synergy',
    color: 'bg-gradient-to-r from-signal-400 to-ion-400',
    unavailableLabel: 'Not applicable',
  },
];

export function ExplainabilityBars({ factors, availability }: { factors: MatchFactorBreakdown; availability: MatchFactorAvailability }) {
  return (
    <div className="space-y-2.5">
      {ROWS.map((row) => {
        const value = factors[row.key];
        const available = row.key in availability ? availability[row.key as keyof MatchFactorAvailability] : true;
        return (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-mist-500">
              <span>{row.label}</span>
              <span className="font-mono">{available ? `${Math.round(value * 100)}%` : row.unavailableLabel}</span>
            </div>
            {available ? (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.max(4, value * 100)}%` }} />
              </div>
            ) : (
              <div className="h-1.5 w-full rounded-full border border-dashed border-white/10" />
            )}
          </div>
        );
      })}
    </div>
  );
}
