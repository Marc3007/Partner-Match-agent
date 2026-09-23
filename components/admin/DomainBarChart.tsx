'use client';

/**
 * Horizontal bar chart, sorted descending, direct value labels. Single hue:
 * bar LENGTH already encodes magnitude and the domain name is printed
 * directly on each row, so color carries no identity here and doesn't need
 * to be categorical -- per the dataviz skill, sequential/single-hue is the
 * right choice when color isn't the thing doing the distinguishing.
 */
export function DomainBarChart({ data }: { data: { domain: string; count: number }[] }) {
  if (data.length === 0) {
    return <div className="flex h-32 items-center justify-center text-sm text-mist-500">No domain data in this range.</div>;
  }
  const max = Math.max(...data.map((d) => d.count));

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.domain} className="flex items-center gap-3">
          <span className="w-48 shrink-0 truncate text-xs text-mist-400" title={d.domain}>
            {d.domain}
          </span>
          <div className="h-3 flex-1 rounded-full bg-white/5">
            <div className="h-3 rounded-full bg-signal-400" style={{ width: `${Math.max(2, (d.count / max) * 100)}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-medium text-mist-200">{d.count}</span>
        </div>
      ))}
    </div>
  );
}
