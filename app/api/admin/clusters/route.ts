import { NextResponse } from 'next/server';
import { getClusterSummaries } from '@/lib/adminQueries';
import { hasDatabase } from '@/lib/db';

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'No DATABASE_URL configured.', approved: [], pending: [] });
  }
  const summaries = await getClusterSummaries();
  return NextResponse.json(summaries);
}
