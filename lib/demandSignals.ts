import { getPool, hasDatabase } from './db';
import type { MatchRequest, MatchResponse } from './types';

/**
 * Logs one anonymous demand signal per completed match request. Awaited
 * (not fire-and-forget) because Node.js serverless functions on Vercel can
 * be frozen right after the response is sent, with no guarantee a detached
 * async write finishes first -- a single indexed INSERT is a small, known
 * latency cost next to the multi-second Claude classification call that
 * already runs on this same request.
 *
 * Never throws: every caller path already produced a valid MatchResponse
 * for the user, and analytics logging must never be the reason a real
 * request fails. Silently no-ops when no DATABASE_URL is configured, so the
 * app keeps working end-to-end before a database is provisioned.
 */
export async function logDemandSignal(req: MatchRequest, result: MatchResponse): Promise<void> {
  if (!hasDatabase()) return;
  const pool = getPool();
  if (!pool) return;

  try {
    await pool.query(
      `INSERT INTO demand_signals
         (raw_problem_text, detected_domains, company_size, complexity_tolerance, industry, matched_vendors)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.problem,
        result.detectedDomains,
        req.companySize,
        req.complexityTolerance,
        req.industry ?? null,
        JSON.stringify(result.top.map((r) => ({ name: r.vendor.name, score: r.score }))),
      ]
    );
  } catch (err) {
    console.error('[demandSignals] failed to log request (non-fatal):', err);
  }
}
