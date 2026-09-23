import type { Vendor } from '@/lib/types';

/**
 * Context-only widget -- explicitly never a scoring input (see
 * lib/matching.ts). Renders only once real market-share data exists (the
 * caller checks `vendor.marketShare.valuePct !== null` before mounting
 * this). Deliberately has no "pending enrichment" placeholder state: a
 * permanently-empty spinner reads as an unfinished feature in a live demo,
 * so an unpopulated vendor simply omits this block entirely rather than
 * showing a stand-in (see docs/ARCHITECTURE.md for the enrichment agent
 * that will eventually populate this field).
 */
export function MarketContextWidget({ vendor }: { vendor: Vendor }) {
  if (vendor.marketShare.valuePct === null) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5">
      <svg width="34" height="34" viewBox="0 0 34 34" className="shrink-0">
        <circle cx="17" cy="17" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="17"
          cy="17"
          r="14"
          fill="none"
          stroke="url(#ctx-grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(vendor.marketShare.valuePct / 100) * 88} 88`}
          transform="rotate(-90 17 17)"
        />
        <defs>
          <linearGradient id="ctx-grad" x1="0" y1="0" x2="34" y2="34">
            <stop offset="0%" stopColor="#3ddc97" />
            <stop offset="100%" stopColor="#8b7cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-mist-500">Market context · not scored</p>
        <p className="truncate text-xs text-mist-300">
          {vendor.marketShare.valuePct}% {vendor.marketShare.scope} ({vendor.marketShare.year})
        </p>
      </div>
    </div>
  );
}
