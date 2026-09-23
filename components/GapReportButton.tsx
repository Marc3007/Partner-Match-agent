'use client';

import { useState } from 'react';

export function GapReportButton({ problem, coverageGap }: { problem: string; coverageGap: string[] | null }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      await fetch('/api/gap-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem, coverageGap }),
      });
      setSent(true);
    } catch {
      // best-effort MVP log; failing silently is fine here
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <p className="text-xs text-signal-300">Logged — thanks. This helps prioritize what we cover next.</p>;
  }

  return (
    <button
      onClick={send}
      disabled={sending}
      className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-mist-200 transition hover:border-white/30 disabled:opacity-50"
    >
      {sending ? 'Logging…' : 'Report this gap'}
    </button>
  );
}
