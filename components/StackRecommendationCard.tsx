import type { StackRecommendation } from '@/lib/types';
import { LayersIcon } from './Icons';

export function StackRecommendationCard({ stack }: { stack: StackRecommendation }) {
  return (
    <div className="card-grain rounded-2xl border border-ion-400/30 bg-ion-400/[0.06] p-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ion-300">
        <LayersIcon size={16} />
        Recommended stack
      </div>
      <h3 className="mt-2 font-display text-xl font-semibold text-mist-100">{stack.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-mist-400">{stack.rationale}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {stack.vendors.map((m) => (
          <span key={m.vendor.id} className="rounded-full border border-ion-400/30 bg-ink-900/40 px-3 py-1 text-xs text-mist-200">
            {m.label} <span className="text-mist-500">· {m.vendor.category}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
