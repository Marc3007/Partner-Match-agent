'use client';

import { useEffect, useState } from 'react';

interface RequestRow {
  id: number;
  created_at: string;
  raw_problem_text: string;
  detected_domains: string[];
  cluster_label: string | null;
  company_size: string | null;
  complexity_tolerance: string | null;
  industry: string | null;
  matched_vendors: { name: string; score: number }[];
}

const PAGE_SIZE = 50;

export default function RequestExplorerPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [days, setDays] = useState('90');

  function buildParams() {
    const params = new URLSearchParams();
    params.set('days', days);
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (search) params.set('search', search);
    if (domain) params.set('domain', domain);
    if (companySize) params.set('companySize', companySize);
    return params;
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/requests?${buildParams()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, domain, companySize, days]);

  function exportCsv() {
    const params = buildParams();
    params.set('format', 'csv');
    window.location.href = `/api/admin/requests?${params}`;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold text-mist-100">Request Explorer</h1>
        <button onClick={exportCsv} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-mist-200 hover:border-white/30">
          Export CSV
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => { setPage(0); setSearch(e.target.value); }}
          placeholder="Search problem text…"
          className="w-64 rounded-full border border-white/10 bg-ink-900/60 px-4 py-2 text-sm text-mist-100 outline-none focus:border-signal-400/50"
        />
        <input
          value={domain}
          onChange={(e) => { setPage(0); setDomain(e.target.value); }}
          placeholder="Filter by domain…"
          className="w-56 rounded-full border border-white/10 bg-ink-900/60 px-4 py-2 text-sm text-mist-100 outline-none focus:border-signal-400/50"
        />
        <select
          value={companySize}
          onChange={(e) => { setPage(0); setCompanySize(e.target.value); }}
          className="rounded-full border border-white/10 bg-ink-900/60 px-4 py-2 text-sm text-mist-100"
        >
          <option value="">Any company size</option>
          <option value="startup">Startup</option>
          <option value="mid_market">Mid-market</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select value={days} onChange={(e) => { setPage(0); setDays(e.target.value); }} className="rounded-full border border-white/10 bg-ink-900/60 px-4 py-2 text-sm text-mist-100">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="3650">All time</option>
        </select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-900/60 text-xs uppercase tracking-wide text-mist-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Problem</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Cluster</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Top match</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-mist-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-mist-500">No requests match these filters.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="whitespace-nowrap px-4 py-3 text-mist-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="max-w-md px-4 py-3 text-mist-200">{r.raw_problem_text}</td>
                  <td className="px-4 py-3 text-mist-400">{r.detected_domains.join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-mist-400">{r.cluster_label ?? '—'}</td>
                  <td className="px-4 py-3 text-mist-400">{r.company_size ?? '—'}</td>
                  <td className="px-4 py-3 text-mist-400">{r.matched_vendors[0]?.name ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-mist-500">
        <span>{total.toLocaleString()} total requests</span>
        <div className="flex items-center gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-white/10 px-3 py-1 disabled:opacity-40">
            Previous
          </button>
          <span>Page {page + 1} of {totalPages}</span>
          <button disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-white/10 px-3 py-1 disabled:opacity-40">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
