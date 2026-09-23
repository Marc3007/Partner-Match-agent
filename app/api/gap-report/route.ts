import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export interface GapReportEntry {
  problem: string;
  coverageGap: string[] | null;
  timestamp: string;
}

// Persisted to a git-tracked JSON Lines file rather than kept in memory, so
// the recurring enrichment Routine (a separate scheduled Claude Code session
// -- see docs/ARCHITECTURE.md) can read this backlog across process restarts
// and redeploys, which an in-memory array cannot survive. This is a
// file-on-disk stand-in for the brief's `enrichment_candidates`/backlog
// table: it works for a single long-running or self-hosted instance, but a
// horizontally-scaled serverless deployment would need the real Postgres
// table instead, since each instance would otherwise see a different file.
const DATA_FILE = path.join(process.cwd(), 'data', 'gap-reports.jsonl');
// In-memory fallback only for the rare case the filesystem write itself
// fails (e.g. a read-only deployment target) -- never the primary store.
const memoryFallback: GapReportEntry[] = [];

async function appendEntry(entry: GapReportEntry): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.appendFile(DATA_FILE, JSON.stringify(entry) + '\n', 'utf8');
}

async function readEntries(): Promise<GapReportEntry[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as GapReportEntry);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.problem !== 'string') {
    return NextResponse.json({ error: 'Invalid gap report payload.' }, { status: 400 });
  }
  const entry: GapReportEntry = {
    problem: body.problem.slice(0, 500),
    coverageGap: Array.isArray(body.coverageGap) ? body.coverageGap.filter((g: unknown) => typeof g === 'string') : null,
    timestamp: new Date().toISOString(),
  };
  try {
    await appendEntry(entry);
  } catch {
    memoryFallback.push(entry);
  }
  const entries = await readEntries();
  return NextResponse.json({ ok: true, totalRecorded: entries.length + memoryFallback.length });
}

export async function GET() {
  const entries = await readEntries();
  const all = [...entries, ...memoryFallback];
  return NextResponse.json({ totalRecorded: all.length, entries: all.slice(-50) });
}
