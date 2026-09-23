import { NextRequest, NextResponse } from 'next/server';

export interface FeedbackEntry {
  vendorId: string;
  vendorName: string;
  helpful: boolean;
  problem: string;
  timestamp: string;
}

// MVP in-memory store. Resets on redeploy / cold start by design -- the
// production version of this feed is the proprietary training dataset
// described in the project brief, backed by Postgres (see
// docs/ARCHITECTURE.md, feedback_events table).
const feedbackLog: FeedbackEntry[] = [];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.vendorId !== 'string' || typeof body.helpful !== 'boolean') {
    return NextResponse.json({ error: 'Invalid feedback payload.' }, { status: 400 });
  }
  feedbackLog.push({
    vendorId: body.vendorId,
    vendorName: typeof body.vendorName === 'string' ? body.vendorName : body.vendorId,
    helpful: body.helpful,
    problem: typeof body.problem === 'string' ? body.problem.slice(0, 500) : '',
    timestamp: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, totalRecorded: feedbackLog.length });
}

export async function GET() {
  return NextResponse.json({ totalRecorded: feedbackLog.length, entries: feedbackLog.slice(-50) });
}
