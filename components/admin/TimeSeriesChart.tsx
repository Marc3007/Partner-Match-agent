'use client';

import { useState } from 'react';

interface Point {
  date: string;
  count: number;
}

/**
 * Single-series requests-over-time line+area. One hue (no categorical
 * palette needed -- there's only one series, so the axis labels carry
 * identity, not color), 2px line, hover crosshair + tooltip per the
 * dataviz skill's interaction spec. Not a bar chart: daily counts over a
 * date range read better as a trend than as N discrete bars once the range
 * exceeds ~30 points.
 */
export function TimeSeriesChart({ data }: { data: Point[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 800;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  if (data.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-mist-500">No requests in this range.</div>;
  }

  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const x = (i: number) => padding.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => padding.top + plotH - (v / maxCount) * plotH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.count)}`).join(' ');
  const areaPath = `${linePath} L ${x(data.length - 1)} ${padding.top + plotH} L ${x(0)} ${padding.top + plotH} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * width;
          const i = Math.round(((relX - padding.left) / plotW) * (data.length - 1));
          setHoverIndex(Math.max(0, Math.min(data.length - 1, i)));
        }}
      >
        {/* recessive gridlines */}
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={padding.left} x2={width - padding.right} y1={padding.top + plotH * t} y2={padding.top + plotH * t} stroke="#ffffff" strokeOpacity={0.06} strokeWidth={1} />
        ))}
        <path d={areaPath} fill="#3ddc97" fillOpacity={0.12} />
        <path d={linePath} fill="none" stroke="#3ddc97" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hoverIndex !== null && (
          <>
            <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={padding.top} y2={padding.top + plotH} stroke="#ffffff" strokeOpacity={0.15} strokeWidth={1} />
            <circle cx={x(hoverIndex)} cy={y(data[hoverIndex].count)} r={4} fill="#3ddc97" stroke="#08090b" strokeWidth={2} />
          </>
        )}
        <text x={padding.left} y={height - 6} fontSize={10} fill="#6b7280">
          {data[0]?.date}
        </text>
        <text x={width - padding.right} y={height - 6} fontSize={10} fill="#6b7280" textAnchor="end">
          {data[data.length - 1]?.date}
        </text>
      </svg>
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-ink-800 px-2.5 py-1.5 text-xs shadow-glow"
          style={{ left: `${(x(hoverIndex) / width) * 100}%`, top: `${(y(data[hoverIndex].count) / height) * 100}%` }}
        >
          <div className="font-semibold text-mist-100">{data[hoverIndex].count} requests</div>
          <div className="text-mist-500">{data[hoverIndex].date}</div>
        </div>
      )}
    </div>
  );
}
