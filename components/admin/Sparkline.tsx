/** Inline growth-trend sparkline: a plain stat tile with no plot needs no
 * hover layer per the dataviz skill, and a sparkline reads as exactly that
 * -- a shape, not a chart to interrogate -- so it stays static, single hue,
 * no axes/gridlines. */
export function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  if (data.length < 2) {
    return <span className="text-xs text-mist-600">not enough data yet</span>;
  }
  const width = 100;
  const height = 24;
  const max = Math.max(1, ...data.map((d) => d.count));
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.count / max) * height;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline points={points.join(' ')} fill="none" stroke="#3ddc97" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
