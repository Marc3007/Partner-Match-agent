import type { MatchResult } from '@/lib/types';

export function AlternativeCard({ result }: { result: MatchResult }) {
  const { vendor, reason } = result;
  return (
    <div className="flex flex-col rounded-xl border border-white/5 bg-ink-800/30 p-4 opacity-55 grayscale-[0.3] transition hover:opacity-75">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold text-mist-300">{vendor.name}</h4>
        <span className="text-[10px] text-mist-500">{vendor.category}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-mist-500">{reason}</p>
    </div>
  );
}
