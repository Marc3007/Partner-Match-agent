'use client';

import { useState } from 'react';
import { ThumbsDownIcon, ThumbsUpIcon } from './Icons';

export function FeedbackButtons({ vendorId, vendorName, problem }: { vendorId: string; vendorName: string; problem: string }) {
  const [sent, setSent] = useState<'up' | 'down' | null>(null);

  async function send(helpful: boolean) {
    setSent(helpful ? 'up' : 'down');
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, vendorName, helpful, problem }),
      });
    } catch {
      // best-effort MVP feedback log; failing silently is fine here
    }
  }

  if (sent) {
    return <p className="text-xs text-mist-500">Thanks — recorded as {sent === 'up' ? 'helpful' : 'not helpful'}.</p>;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-mist-500">Helpful match?</span>
      <button onClick={() => send(true)} aria-label="Helpful" className="text-mist-400 transition hover:text-signal-400">
        <ThumbsUpIcon size={16} />
      </button>
      <button onClick={() => send(false)} aria-label="Not helpful" className="text-mist-400 transition hover:text-ember-500">
        <ThumbsDownIcon size={16} />
      </button>
    </div>
  );
}
