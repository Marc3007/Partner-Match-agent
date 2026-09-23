'use client';

import { useEffect, useState } from 'react';
import { TimeSeriesChart } from '@/components/admin/TimeSeriesChart';
import { DomainBarChart } from '@/components/admin/DomainBarChart';

interface OverviewStats {
  totalRequests: number;
  byDay: { date: string; count: number }[];
  byDomain: { domain: string; count: number }[];
  error?: string;
}

const RANGE_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

export default function AdminOverviewPage() {
  const [days, setDays] = useState(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (useCustom && customFrom && customTo) {
      params.set('from', customFrom);
      params.set('to', customTo);
    } else {
      params.set('days', String(days));
    }
    fetch(`/api/admin/overview?${params}`)
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [days, useCustom, customFrom, customTo]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold text-mist-100">Overview</h1>
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => {
                setUseCustom(false);
                setDays(opt.days);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                !useCustom && days === opt.days ? 'bg-signal-400/15 text-signal-300' : 'border border-white/10 text-mist-400 hover:text-mist-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); }} className="rounded-full border border-white/10 bg-ink-900/60 px-3 py-1.5 text-xs text-mist-200" />
          <span className="text-xs text-mist-500">to</span>
          <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); }} className="rounded-full border border-white/10 bg-ink-900/60 px-3 py-1.5 text-xs text-mist-200" />
        </div>
      </div>

      {stats?.error && (
        <div className="mt-6 rounded-lg border border-ember-500/25 bg-ember-500/[0.06] p-4 text-sm text-mist-300">{stats.error}</div>
      )}

      <div className="mt-6 rounded-2xl border border-white/10 bg-ink-800/70 p-6">
        <span className="text-xs uppercase tracking-wide text-mist-500">Total requests</span>
        <div className="mt-1 font-display text-4xl font-semibold text-mist-100">{loading ? '—' : (stats?.totalRequests ?? 0).toLocaleString()}</div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-ink-800/70 p-6">
        <h2 className="text-sm font-semibold text-mist-100">Requests over time</h2>
        <div className="mt-4">{!loading && stats && <TimeSeriesChart data={stats.byDay} />}</div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-ink-800/70 p-6">
        <h2 className="text-sm font-semibold text-mist-100">Breakdown by domain</h2>
        <div className="mt-4">{!loading && stats && <DomainBarChart data={stats.byDomain} />}</div>
      </div>
    </div>
  );
}
