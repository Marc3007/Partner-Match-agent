import { NextRequest, NextResponse } from 'next/server';
import { getOverviewStats } from '@/lib/adminQueries';
import { hasDatabase } from '@/lib/db';

function parseRange(searchParams: URLSearchParams): { from: Date; to: Date } {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (from && to) return { from: new Date(from), to: new Date(to) };

  const days = Number(searchParams.get('days') ?? '30');
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: fromDate, to: toDate };
}

export async function GET(request: NextRequest) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'No DATABASE_URL configured.', totalRequests: 0, byDay: [], byDomain: [] }, { status: 200 });
  }
  const { from, to } = parseRange(request.nextUrl.searchParams);
  const stats = await getOverviewStats(from, to);
  return NextResponse.json(stats);
}
