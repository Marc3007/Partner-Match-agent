import { getPool, hasDatabase } from './db';
import { callClaudeForText, extractJsonObject } from './semanticClassifier';

interface UnclusteredRow {
  id: number;
  raw_problem_text: string;
}

interface ApprovedCluster {
  id: number;
  label: string;
  description: string;
}

/**
 * Step (a): for one domain, try to assign each currently-unclustered row to
 * an existing APPROVED cluster via one batched Claude call. Never touches
 * pending/rejected clusters -- those aren't real categories yet.
 */
async function assignToApprovedClusters(domain: string, rows: UnclusteredRow[], clusters: ApprovedCluster[]): Promise<Map<number, number>> {
  const clusterList = clusters.map((c) => `- id: ${c.id}\n  label: ${c.label}\n  description: ${c.description}`).join('\n');
  const rowList = rows.map((r) => `- id: ${r.id}\n  text: "${r.raw_problem_text.slice(0, 300).replace(/"/g, "'")}"`).join('\n');

  const prompt = `You are sorting customer requests within the "${domain}" domain into existing sub-categories ("clusters"), by MEANING.

Existing clusters:
${clusterList}

Unsorted requests:
${rowList}

For EACH request, decide if it CLEARLY belongs to one of the listed clusters. Only assign a cluster when you have genuine confidence -- a vague or partial overlap does not count, leave it unassigned (null) rather than force a fit. It's expected and fine for many requests to stay unassigned.

Respond with ONLY a single JSON object, no prose, no markdown fences:
{"<request id>": <cluster id or null>, ...one entry per request above...}`;

  const text = await callClaudeForText(prompt, 2048, 'clustering:assign');
  if (!text) return new Map();
  const parsed = extractJsonObject(text, 'clustering:assign');
  if (!parsed) return new Map();

  const validRowIds = new Set(rows.map((r) => r.id));
  const validClusterIds = new Set(clusters.map((c) => c.id));
  const assignments = new Map<number, number>();
  for (const [rowIdStr, clusterIdRaw] of Object.entries(parsed)) {
    const rowId = Number(rowIdStr);
    if (!validRowIds.has(rowId)) continue;
    const clusterId = typeof clusterIdRaw === 'number' ? clusterIdRaw : NaN;
    if (!validClusterIds.has(clusterId)) continue;
    assignments.set(rowId, clusterId);
  }
  return assignments;
}

interface ProposedCluster {
  label: string;
  description: string;
  requestIds: number[];
}

/**
 * Step (b): among rows STILL unclustered after step (a), ask Claude to spot
 * genuine recurring sub-themes and propose new clusters -- never auto-
 * published, always created with status='pending' for a human to review.
 * The >=10-request threshold is enforced twice: once in the prompt (so the
 * model doesn't bother proposing anything smaller) and again in code after
 * parsing (so a model mistake can never create an under-threshold cluster).
 */
async function proposeNewClusters(domain: string, rows: UnclusteredRow[]): Promise<ProposedCluster[]> {
  if (rows.length < 10) return [];

  const rowList = rows.map((r) => `- id: ${r.id}\n  text: "${r.raw_problem_text.slice(0, 300).replace(/"/g, "'")}"`).join('\n');
  const prompt = `These are unsorted customer requests within the "${domain}" domain that don't fit any existing sub-category yet:

${rowList}

Look for groups of 10 OR MORE requests that share a clear, coherent, SPECIFIC sub-theme -- a real recurring pattern someone could name and describe meaningfully, not just superficial word overlap. It is normal and expected to find zero such groups; only propose a cluster when you have genuine confidence, backed by at least 10 requests.

Respond with ONLY a single JSON object, no prose, no markdown fences:
{"proposed_clusters": [{"label": "<3-6 word name>", "description": "<one sentence>", "request_ids": [<id>, ...at least 10...]}, ...zero or more...]}`;

  const text = await callClaudeForText(prompt, 2048, 'clustering:propose');
  if (!text) return [];
  const parsed = extractJsonObject(text, 'clustering:propose') as { proposed_clusters?: unknown } | null;
  if (!parsed || !Array.isArray(parsed.proposed_clusters)) return [];

  const validRowIds = new Set(rows.map((r) => r.id));
  const proposals: ProposedCluster[] = [];
  for (const raw of parsed.proposed_clusters) {
    if (typeof raw !== 'object' || raw === null) continue;
    const c = raw as Record<string, unknown>;
    const label = typeof c.label === 'string' ? c.label.trim().slice(0, 100) : '';
    const description = typeof c.description === 'string' ? c.description.trim().slice(0, 500) : '';
    const requestIds = Array.isArray(c.request_ids)
      ? c.request_ids.filter((id): id is number => typeof id === 'number' && validRowIds.has(id))
      : [];
    // Re-enforced here, not just trusted from the prompt: a model can miscount.
    if (label && requestIds.length >= 10) proposals.push({ label, description, requestIds });
  }
  return proposals;
}

/** Cap per domain per run so one very active domain can't blow up the
 * prompt size or the run's total cost/latency -- the remainder is picked
 * up on the next scheduled run. */
const MAX_ROWS_PER_DOMAIN_PER_RUN = 200;

export interface ClusteringRunSummary {
  domainsProcessed: number;
  rowsAssignedToExisting: number;
  newClustersProposed: number;
  errors: string[];
}

export async function runClusteringPass(): Promise<ClusteringRunSummary> {
  const summary: ClusteringRunSummary = { domainsProcessed: 0, rowsAssignedToExisting: 0, newClustersProposed: 0, errors: [] };
  if (!hasDatabase()) {
    summary.errors.push('No DATABASE_URL configured -- nothing to cluster.');
    return summary;
  }
  const pool = getPool()!;

  // One domain at a time: a demand_signal's `detected_domains` is an array
  // (a request can span more than one), but clustering assigns a single
  // `assigned_cluster_id`, so each row is processed under its FIRST (most
  // relevant) detected domain only.
  const { rows: domainRows } = await pool.query<{ domain: string }>(
    `SELECT DISTINCT detected_domains[1] AS domain
     FROM demand_signals
     WHERE assigned_cluster_id IS NULL AND detected_domains[1] IS NOT NULL`
  );

  for (const { domain } of domainRows) {
    try {
      const { rows: unclustered } = await pool.query<UnclusteredRow>(
        `SELECT id, raw_problem_text FROM demand_signals
         WHERE assigned_cluster_id IS NULL AND detected_domains[1] = $1
         ORDER BY created_at ASC LIMIT $2`,
        [domain, MAX_ROWS_PER_DOMAIN_PER_RUN]
      );
      if (unclustered.length === 0) continue;
      summary.domainsProcessed++;

      const { rows: approvedClusters } = await pool.query<ApprovedCluster>(
        `SELECT id, label, description FROM clusters WHERE parent_domain = $1 AND status = 'approved'`,
        [domain]
      );

      let remaining = unclustered;
      if (approvedClusters.length > 0) {
        const assignments = await assignToApprovedClusters(domain, unclustered, approvedClusters);
        for (const [rowId, clusterId] of assignments) {
          await pool.query(`UPDATE demand_signals SET assigned_cluster_id = $1 WHERE id = $2`, [clusterId, rowId]);
        }
        summary.rowsAssignedToExisting += assignments.size;
        remaining = unclustered.filter((r) => !assignments.has(r.id));
      }

      const proposals = await proposeNewClusters(domain, remaining);
      for (const proposal of proposals) {
        await pool.query(
          `INSERT INTO clusters (parent_domain, label, description, status, example_request_ids)
           VALUES ($1, $2, $3, 'pending', $4)`,
          [domain, proposal.label, proposal.description, proposal.requestIds]
        );
        summary.newClustersProposed++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[clustering] domain "${domain}" failed:`, err);
      summary.errors.push(`${domain}: ${message}`);
    }
  }

  return summary;
}
