-- Anonymous demand-data logging + auto-clustering schema.
--
-- PRIVACY: demand_signals has NO PII columns -- no name, email, IP address,
-- user agent, or session/device identifier of any kind, and nothing here is
-- joinable to any such identifier elsewhere in the app. raw_problem_text is
-- exactly what the matching form already sends to /api/match today; if a
-- user voluntarily types identifying information into their own problem
-- description, that free text is stored as-is (same as any support-ticket
-- or search-log system) -- this schema adds no field designed to capture or
-- infer identity, and the app never asks for one on this path.

CREATE TABLE IF NOT EXISTS clusters (
  id SERIAL PRIMARY KEY,
  parent_domain TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  example_request_ids INTEGER[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_clusters_domain_status ON clusters (parent_domain, status);

CREATE TABLE IF NOT EXISTS demand_signals (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_problem_text TEXT NOT NULL,
  -- Level-1 domains this request scored against, most relevant first --
  -- see lib/domains.ts for how this is derived from the same tag taxonomy
  -- (TAG_GROUPS) already used for matching, never a separate classification.
  detected_domains TEXT[] NOT NULL DEFAULT '{}',
  -- Level-2 cluster, assigned by the recurring clustering job -- null until
  -- clustered, and only ever set to an 'approved' cluster's id.
  assigned_cluster_id INTEGER REFERENCES clusters (id),
  company_size TEXT,
  complexity_tolerance TEXT,
  industry TEXT,
  -- [{ "name": "...", "score": 0.87 }, ...] -- top picks only, mirrors what
  -- the user themselves saw on the results screen.
  matched_vendors JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_demand_signals_created_at ON demand_signals (created_at);
CREATE INDEX IF NOT EXISTS idx_demand_signals_cluster ON demand_signals (assigned_cluster_id);
CREATE INDEX IF NOT EXISTS idx_demand_signals_unclustered ON demand_signals (assigned_cluster_id) WHERE assigned_cluster_id IS NULL;
-- Full-text search over raw_problem_text for the Request Explorer's search box.
CREATE INDEX IF NOT EXISTS idx_demand_signals_text_search ON demand_signals USING GIN (to_tsvector('english', raw_problem_text));
