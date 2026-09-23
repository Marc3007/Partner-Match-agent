'use client';

import { useEffect, useState } from 'react';
import { Sparkline } from '@/components/admin/Sparkline';

interface ApprovedCluster {
  id: number;
  parent_domain: string;
  label: string;
  description: string;
  requestCount: number;
  sparkline: { date: string; count: number }[];
}

interface PendingCluster {
  id: number;
  parent_domain: string;
  label: string;
  description: string;
  created_at: string;
  example_request_ids: number[];
  exampleTexts: string[];
}

export default function ClusterManagementPage() {
  const [approved, setApproved] = useState<ApprovedCluster[]>([]);
  const [pending, setPending] = useState<PendingCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');

  function load() {
    setLoading(true);
    fetch('/api/admin/clusters')
      .then((r) => r.json())
      .then((data) => {
        setApproved(data.approved ?? []);
        setPending(data.pending ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function approve(id: number) {
    await fetch(`/api/admin/clusters/${id}/approve`, { method: 'POST' });
    load();
  }
  async function reject(id: number) {
    await fetch(`/api/admin/clusters/${id}/reject`, { method: 'POST' });
    load();
  }
  async function saveRename(id: number) {
    await fetch(`/api/admin/clusters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: editLabel, description: editDescription }),
    });
    setEditingId(null);
    load();
  }
  async function merge(sourceId: number, targetId: number) {
    if (!targetId || targetId === sourceId) return;
    await fetch('/api/admin/clusters/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId }),
    });
    load();
  }

  const allClusters = [...approved.map((c) => ({ id: c.id, label: c.label })), ...pending.map((c) => ({ id: c.id, label: `${c.label} (pending)` }))];

  const byDomain = new Map<string, ApprovedCluster[]>();
  for (const c of approved) {
    const list = byDomain.get(c.parent_domain) ?? [];
    list.push(c);
    byDomain.set(c.parent_domain, list);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-mist-100">Cluster Management</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-mist-100">Pending clusters {pending.length > 0 && <span className="text-mist-500">({pending.length})</span>}</h2>
        {!loading && pending.length === 0 && <p className="mt-2 text-sm text-mist-500">Nothing awaiting review right now.</p>}
        <div className="mt-3 flex flex-col gap-3">
          {pending.map((c) => (
            <div key={c.id} className="rounded-2xl border border-ion-400/25 bg-ion-400/[0.05] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {editingId === c.id ? (
                    <div className="flex flex-col gap-2">
                      <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="rounded-lg border border-white/10 bg-ink-900/60 px-3 py-1.5 text-sm text-mist-100" />
                      <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="rounded-lg border border-white/10 bg-ink-900/60 px-3 py-1.5 text-sm text-mist-100" rows={2} />
                      <div className="flex gap-2">
                        <button onClick={() => saveRename(c.id)} className="rounded-full bg-signal-ion px-3 py-1 text-xs font-semibold text-ink-950">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-mist-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] uppercase tracking-wide text-ion-300">{c.parent_domain}</span>
                      <h3 className="font-display text-lg font-semibold text-mist-100">{c.label}</h3>
                      <p className="mt-1 text-sm text-mist-400">{c.description}</p>
                    </>
                  )}
                  {c.exampleTexts.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-white/5 pt-3 text-xs text-mist-500">
                      {c.exampleTexts.slice(0, 3).map((t, i) => (
                        <li key={i} className="truncate">— {t}</li>
                      ))}
                      {c.example_request_ids.length > 3 && <li>+ {c.example_request_ids.length - 3} more requests</li>}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button onClick={() => approve(c.id)} className="rounded-full bg-signal-400/15 px-3 py-1.5 text-xs font-semibold text-signal-300 hover:bg-signal-400/25">
                    Approve
                  </button>
                  <button onClick={() => { setEditingId(c.id); setEditLabel(c.label); setEditDescription(c.description); }} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist-300">
                    Rename
                  </button>
                  <select
                    defaultValue=""
                    onChange={(e) => merge(c.id, Number(e.target.value))}
                    className="rounded-full border border-white/10 bg-ink-900/60 px-2 py-1.5 text-xs text-mist-300"
                  >
                    <option value="" disabled>Merge into…</option>
                    {allClusters.filter((o) => o.id !== c.id).map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                  <button onClick={() => reject(c.id)} className="rounded-full border border-ember-500/25 px-3 py-1.5 text-xs text-ember-400 hover:bg-ember-500/10">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-mist-100">Approved clusters by domain</h2>
        {!loading && approved.length === 0 && <p className="mt-2 text-sm text-mist-500">No approved clusters yet.</p>}
        <div className="mt-3 flex flex-col gap-6">
          {[...byDomain.entries()].map(([domain, clusters]) => (
            <div key={domain}>
              <h3 className="text-xs uppercase tracking-wide text-mist-500">{domain}</h3>
              <div className="mt-2 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {clusters.map((c) => (
                      <tr key={c.id} className="border-t border-white/5 first:border-t-0">
                        <td className="w-64 px-4 py-3">
                          {editingId === c.id ? (
                            <div className="flex flex-col gap-1">
                              <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="rounded border border-white/10 bg-ink-900/60 px-2 py-1 text-xs text-mist-100" />
                              <div className="flex gap-2">
                                <button onClick={() => saveRename(c.id)} className="text-xs text-signal-300">Save</button>
                                <button onClick={() => setEditingId(null)} className="text-xs text-mist-500">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-mist-100">{c.label}</div>
                              <div className="text-xs text-mist-500">{c.description}</div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-mist-300">{c.requestCount}</td>
                        <td className="px-4 py-3"><Sparkline data={c.sparkline} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setEditingId(c.id); setEditLabel(c.label); setEditDescription(c.description); }} className="text-xs text-mist-400 hover:text-mist-100">
                              Rename
                            </button>
                            <select
                              defaultValue=""
                              onChange={(e) => merge(c.id, Number(e.target.value))}
                              className="rounded border border-white/10 bg-ink-900/60 px-2 py-1 text-xs text-mist-300"
                            >
                              <option value="" disabled>Merge into…</option>
                              {allClusters.filter((o) => o.id !== c.id).map((o) => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
