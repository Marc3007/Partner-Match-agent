import { NextRequest, NextResponse } from 'next/server';
import { runClusteringPass } from '@/lib/clustering';

/**
 * Triggered by Vercel Cron (see vercel.json) on a daily schedule. Vercel
 * automatically sends `Authorization: Bearer $CRON_SECRET` on requests it
 * makes to cron paths when CRON_SECRET is set -- checked here so this
 * endpoint can't be hit by arbitrary internet traffic to burn Claude API
 * calls or write bogus clusters. Without CRON_SECRET configured, the route
 * refuses all requests (fails closed, not open).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured -- refusing to run.' }, { status: 503 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = await runClusteringPass();
  return NextResponse.json(summary);
}
