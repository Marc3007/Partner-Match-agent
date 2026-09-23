import { NextResponse } from 'next/server';
import { approveCluster } from '@/lib/adminQueries';
import { hasDatabase } from '@/lib/db';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDatabase()) return NextResponse.json({ error: 'No DATABASE_URL configured.' }, { status: 503 });
  const id = Number((await params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid cluster id.' }, { status: 400 });
  await approveCluster(id);
  return NextResponse.json({ ok: true });
}
