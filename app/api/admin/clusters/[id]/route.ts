import { NextRequest, NextResponse } from 'next/server';
import { renameCluster } from '@/lib/adminQueries';
import { hasDatabase } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDatabase()) return NextResponse.json({ error: 'No DATABASE_URL configured.' }, { status: 503 });
  const id = Number((await params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid cluster id.' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 100) : '';
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 500) : '';
  if (!label) return NextResponse.json({ error: 'Label is required.' }, { status: 400 });

  await renameCluster(id, label, description);
  return NextResponse.json({ ok: true });
}
