import { getPool, hasDatabase } from './db';

export interface OverviewStats {
  totalRequests: number;
  byDay: { date: string; count: number }[];
  byDomain: { domain: string; count: number }[];
}

/** Domain breakdown uses each request's PRIMARY detected domain
 * (detected_domains[1]) only, matching how the clustering job also
 * processes one domain per row -- avoids double-counting a request that
 * spans multiple domains into a chart whose bars should sum sensibly. */
export async function getOverviewStats(from: Date, to: Date): Promise<OverviewStats> {
  if (!hasDatabase()) return { totalRequests: 0, byDay: [], byDomain: [] };
  const pool = getPool()!;

  const [totalRes, byDayRes, byDomainRes] = await Promise.all([
    pool.query<{ count: string }>(`SELECT count(*) FROM demand_signals WHERE created_at BETWEEN $1 AND $2`, [from, to]),
    pool.query<{ day: string; count: string }>(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)
       FROM demand_signals WHERE created_at BETWEEN $1 AND $2
       GROUP BY 1 ORDER BY 1`,
      [from, to]
    ),
    pool.query<{ domain: string; count: string }>(
      `SELECT detected_domains[1] AS domain, count(*)
       FROM demand_signals WHERE created_at BETWEEN $1 AND $2 AND detected_domains[1] IS NOT NULL
       GROUP BY 1 ORDER BY 2 DESC`,
      [from, to]
    ),
  ]);

  return {
    totalRequests: Number(totalRes.rows[0]?.count ?? 0),
    byDay: byDayRes.rows.map((r) => ({ date: r.day, count: Number(r.count) })),
    byDomain: byDomainRes.rows.map((r) => ({ domain: r.domain, count: Number(r.count) })),
  };
}

export interface RequestFilters {
  from: Date;
  to: Date;
  domain?: string;
  clusterId?: number;
  companySize?: string;
  industry?: string;
  complexityTolerance?: string;
  matchedVendor?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface RequestRow {
  id: number;
  created_at: string;
  raw_problem_text: string;
  detected_domains: string[];
  assigned_cluster_id: number | null;
  cluster_label: string | null;
  company_size: string | null;
  complexity_tolerance: string | null;
  industry: string | null;
  matched_vendors: { name: string; score: number }[];
}

function buildRequestWhere(f: RequestFilters): { clause: string; params: unknown[] } {
  const conditions: string[] = ['ds.created_at BETWEEN $1 AND $2'];
  const params: unknown[] = [f.from, f.to];

  if (f.domain) {
    params.push(f.domain);
    conditions.push(`$${params.length} = ANY(ds.detected_domains)`);
  }
  if (f.clusterId !== undefined) {
    params.push(f.clusterId);
    conditions.push(`ds.assigned_cluster_id = $${params.length}`);
  }
  if (f.companySize) {
    params.push(f.companySize);
    conditions.push(`ds.company_size = $${params.length}`);
  }
  if (f.industry) {
    params.push(f.industry);
    conditions.push(`ds.industry = $${params.length}`);
  }
  if (f.complexityTolerance) {
    params.push(f.complexityTolerance);
    conditions.push(`ds.complexity_tolerance = $${params.length}`);
  }
  if (f.matchedVendor) {
    params.push(f.matchedVendor);
    conditions.push(`ds.matched_vendors @> jsonb_build_array(jsonb_build_object('name', $${params.length}::text))`);
  }
  if (f.search) {
    params.push(f.search);
    conditions.push(`to_tsvector('english', ds.raw_problem_text) @@ plainto_tsquery('english', $${params.length})`);
  }
  return { clause: conditions.join(' AND '), params };
}

export async function getRequests(f: RequestFilters): Promise<{ rows: RequestRow[]; total: number }> {
  if (!hasDatabase()) return { rows: [], total: 0 };
  const pool = getPool()!;
  const { clause, params } = buildRequestWhere(f);

  const countRes = await pool.query<{ count: string }>(`SELECT count(*) FROM demand_signals ds WHERE ${clause}`, params);
  const total = Number(countRes.rows[0]?.count ?? 0);

  const dataParams = [...params, f.pageSize, f.page * f.pageSize];
  const dataRes = await pool.query<RequestRow>(
    `SELECT ds.id, ds.created_at, ds.raw_problem_text, ds.detected_domains, ds.assigned_cluster_id,
            c.label AS cluster_label, ds.company_size, ds.complexity_tolerance, ds.industry, ds.matched_vendors
     FROM demand_signals ds
     LEFT JOIN clusters c ON c.id = ds.assigned_cluster_id
     WHERE ${clause}
     ORDER BY ds.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    dataParams
  );
  return { rows: dataRes.rows, total };
}

export async function getAllRequestsForExport(f: Omit<RequestFilters, 'page' | 'pageSize'>): Promise<RequestRow[]> {
  if (!hasDatabase()) return [];
  const pool = getPool()!;
  const { clause, params } = buildRequestWhere({ ...f, page: 0, pageSize: 0 });
  const res = await pool.query<RequestRow>(
    `SELECT ds.id, ds.created_at, ds.raw_problem_text, ds.detected_domains, ds.assigned_cluster_id,
            c.label AS cluster_label, ds.company_size, ds.complexity_tolerance, ds.industry, ds.matched_vendors
     FROM demand_signals ds
     LEFT JOIN clusters c ON c.id = ds.assigned_cluster_id
     WHERE ${clause}
     ORDER BY ds.created_at DESC
     LIMIT 10000`,
    params
  );
  return res.rows;
}

export interface ApprovedClusterSummary {
  id: number;
  parent_domain: string;
  label: string;
  description: string;
  created_at: string;
  requestCount: number;
  sparkline: { date: string; count: number }[];
}

export interface PendingClusterSummary {
  id: number;
  parent_domain: string;
  label: string;
  description: string;
  created_at: string;
  example_request_ids: number[];
  exampleTexts: string[];
}

const SPARKLINE_DAYS = 30;

export async function getClusterSummaries(): Promise<{ approved: ApprovedClusterSummary[]; pending: PendingClusterSummary[] }> {
  if (!hasDatabase()) return { approved: [], pending: [] };
  const pool = getPool()!;

  const approvedRes = await pool.query<{ id: number; parent_domain: string; label: string; description: string; created_at: string; request_count: string }>(
    `SELECT c.id, c.parent_domain, c.label, c.description, c.created_at, count(ds.id) AS request_count
     FROM clusters c
     LEFT JOIN demand_signals ds ON ds.assigned_cluster_id = c.id
     WHERE c.status = 'approved'
     GROUP BY c.id
     ORDER BY c.parent_domain, request_count DESC`
  );

  const sparklineRes = await pool.query<{ cluster_id: number; day: string; count: string }>(
    `SELECT assigned_cluster_id AS cluster_id, to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)
     FROM demand_signals
     WHERE assigned_cluster_id IS NOT NULL AND created_at >= now() - interval '${SPARKLINE_DAYS} days'
     GROUP BY 1, 2`
  );
  const sparklineByCluster = new Map<number, { date: string; count: number }[]>();
  for (const row of sparklineRes.rows) {
    const list = sparklineByCluster.get(row.cluster_id) ?? [];
    list.push({ date: row.day, count: Number(row.count) });
    sparklineByCluster.set(row.cluster_id, list);
  }

  const approved: ApprovedClusterSummary[] = approvedRes.rows.map((r) => ({
    id: r.id,
    parent_domain: r.parent_domain,
    label: r.label,
    description: r.description,
    created_at: r.created_at,
    requestCount: Number(r.request_count),
    sparkline: (sparklineByCluster.get(r.id) ?? []).sort((a, b) => a.date.localeCompare(b.date)),
  }));

  const pendingRes = await pool.query<{ id: number; parent_domain: string; label: string; description: string; created_at: string; example_request_ids: number[] }>(
    `SELECT id, parent_domain, label, description, created_at, example_request_ids
     FROM clusters WHERE status = 'pending' ORDER BY created_at DESC`
  );
  const pending: PendingClusterSummary[] = [];
  for (const r of pendingRes.rows) {
    const sampleIds = r.example_request_ids.slice(0, 5);
    let exampleTexts: string[] = [];
    if (sampleIds.length > 0) {
      const textRes = await pool.query<{ raw_problem_text: string }>(
        `SELECT raw_problem_text FROM demand_signals WHERE id = ANY($1)`,
        [sampleIds]
      );
      exampleTexts = textRes.rows.map((t) => t.raw_problem_text);
    }
    pending.push({ id: r.id, parent_domain: r.parent_domain, label: r.label, description: r.description, created_at: r.created_at, example_request_ids: r.example_request_ids, exampleTexts });
  }

  return { approved, pending };
}

export async function approveCluster(id: number): Promise<void> {
  const pool = getPool()!;
  const res = await pool.query<{ example_request_ids: number[] }>(`SELECT example_request_ids FROM clusters WHERE id = $1`, [id]);
  const exampleIds = res.rows[0]?.example_request_ids ?? [];
  await pool.query(`UPDATE clusters SET status = 'approved' WHERE id = $1`, [id]);
  // Immediately assign the requests that justified this cluster's proposal --
  // we already know they belong, no need to wait for the next cron pass to
  // rediscover them via the "match against approved clusters" step.
  if (exampleIds.length > 0) {
    await pool.query(`UPDATE demand_signals SET assigned_cluster_id = $1 WHERE id = ANY($2) AND assigned_cluster_id IS NULL`, [id, exampleIds]);
  }
}

export async function rejectCluster(id: number): Promise<void> {
  const pool = getPool()!;
  await pool.query(`UPDATE clusters SET status = 'rejected' WHERE id = $1`, [id]);
}

export async function renameCluster(id: number, label: string, description: string): Promise<void> {
  const pool = getPool()!;
  await pool.query(`UPDATE clusters SET label = $1, description = $2 WHERE id = $3`, [label, description, id]);
}

/** Merges `sourceId` into `targetId`: every request assigned to the source
 * moves to the target, then the (now-empty) source cluster is deleted.
 * Both clusters must already exist -- typically both 'approved', but not
 * enforced here since an admin merging two pending proposals before either
 * is approved is also a reasonable action. */
export async function mergeClusters(sourceId: number, targetId: number): Promise<void> {
  const pool = getPool()!;
  await pool.query(`UPDATE demand_signals SET assigned_cluster_id = $1 WHERE assigned_cluster_id = $2`, [targetId, sourceId]);
  await pool.query(`DELETE FROM clusters WHERE id = $1`, [sourceId]);
}
