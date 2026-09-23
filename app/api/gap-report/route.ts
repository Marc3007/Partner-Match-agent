import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export interface GapReportEntry {
  problem: string;
  coverageGap: string[] | null;
  timestamp: string;
}

// Primary store: commit directly to this repo's data/gap-reports.jsonl via
// the GitHub Contents API, gated behind an optional GITHUB_TOKEN env var.
// This exists because the original design (writing to local disk) silently
// stops working on Vercel: serverless functions have a read-only filesystem
// in production, and even a writable one would only be visible to that one
// instance, never to the recurring enrichment Routine, which reads this
// file from the actual git repo (see docs/ARCHITECTURE.md). Committing via
// the GitHub API is the only way a live serverless deployment can durably
// feed that Routine's backlog. Requires a token (fine-grained PAT scoped to
// this repo, Contents: Read and write) in GITHUB_TOKEN -- without one, this
// falls back to local-disk (works in dev, not on Vercel) and then in-memory
// (works for a single request's response only). See README.md for setup.
const GITHUB_OWNER = 'Marc3007';
const GITHUB_REPO = 'Partner-Match-agent';
const GITHUB_BRANCH = 'main';
const DATA_PATH_IN_REPO = 'data/gap-reports.jsonl';
const DATA_FILE = path.join(process.cwd(), 'data', 'gap-reports.jsonl');

// In-memory fallback only for the rare case that BOTH the GitHub commit and
// the local filesystem write fail -- never the primary store, and only
// covers this one request/response (never seen by the Routine).
const memoryFallback: GapReportEntry[] = [];

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function fetchGitHubFile(token: string): Promise<{ content: string; sha: string | undefined } | null> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH_IN_REPO}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (res.status === 404) return { content: '', sha: undefined };
  if (!res.ok) {
    console.error('[gap-report] GitHub GET failed:', res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = (await res.json()) as { content: string; sha: string };
  return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha };
}

async function appendViaGitHub(entry: GapReportEntry): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;

  // One retry on a 409 (sha changed between our GET and PUT, e.g. two
  // reports submitted concurrently) -- refetch and try once more, since
  // gap-report volume is expected to be low, not worth a real queue here.
  for (let attempt = 0; attempt < 2; attempt++) {
    const current = await fetchGitHubFile(token);
    if (!current) return false;
    const newContent = current.content + JSON.stringify(entry) + '\n';
    const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH_IN_REPO}`, {
      method: 'PUT',
      headers: { ...githubHeaders(token), 'content-type': 'application/json' },
      body: JSON.stringify({
        message: `Gap report: ${entry.problem.slice(0, 60)}`,
        content: Buffer.from(newContent, 'utf8').toString('base64'),
        sha: current.sha,
        branch: GITHUB_BRANCH,
      }),
    });
    if (res.ok) return true;
    if (res.status !== 409 || attempt === 1) {
      console.error('[gap-report] GitHub PUT failed:', res.status, await res.text().catch(() => ''));
      return false;
    }
  }
  return false;
}

async function appendLocal(entry: GapReportEntry): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.appendFile(DATA_FILE, JSON.stringify(entry) + '\n', 'utf8');
    return true;
  } catch {
    return false;
  }
}

function parseJsonl(raw: string): GapReportEntry[] {
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as GapReportEntry);
}

async function readEntries(): Promise<{ entries: GapReportEntry[]; source: 'github' | 'local' }> {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    const current = await fetchGitHubFile(token).catch((err) => {
      console.error('[gap-report] GitHub read threw:', err);
      return null;
    });
    if (current) return { entries: parseJsonl(current.content), source: 'github' };
  }
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return { entries: parseJsonl(raw), source: 'local' };
  } catch {
    return { entries: [], source: 'local' };
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

  const committedToGitHub = await appendViaGitHub(entry).catch((err) => {
    console.error('[gap-report] GitHub commit threw:', err);
    return false;
  });

  let persisted: 'github' | 'local' | 'memory' = 'github';
  if (!committedToGitHub) {
    const wroteLocally = await appendLocal(entry);
    persisted = wroteLocally ? 'local' : 'memory';
    if (!wroteLocally) memoryFallback.push(entry);
  }

  return NextResponse.json({ ok: true, persisted });
}

export async function GET() {
  const { entries, source } = await readEntries();
  const all = [...entries, ...memoryFallback];
  return NextResponse.json({ totalRecorded: all.length, entries: all.slice(-50), source });
}
