import { NextRequest, NextResponse } from 'next/server';
import { mergeClusters } from '@/lib/adminQueries';
import { hasDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  if (!hasDatabase()) return NextResponse.json({ error: 'No DATABASE_URL configured.' }, { status: 503 });
  const body = await request.json().catch(() => null);
  const sourceId = Number(body?.sourceId);
  const targetId = Number(body?.targetId);
  if (!Number.isFinite(sourceId) || !Number.isFinite(targetId) || sourceId === targetId) {
    return NextResponse.json({ error: 'sourceId and targetId must be distinct cluster ids.' }, { status: 400 });
  }
  await mergeClusters(sourceId, targetId);
  return NextResponse.json({ ok: true });
}
