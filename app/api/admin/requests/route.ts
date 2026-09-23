import { NextRequest, NextResponse } from 'next/server';
import { getAllRequestsForExport, getRequests, type RequestFilters } from '@/lib/adminQueries';
import { hasDatabase } from '@/lib/db';

function parseFilters(searchParams: URLSearchParams): Omit<RequestFilters, 'page' | 'pageSize'> {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const days = Number(searchParams.get('days') ?? '30');
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    from: fromDate,
    to: toDate,
    domain: searchParams.get('domain') || undefined,
    clusterId: searchParams.get('clusterId') ? Number(searchParams.get('clusterId')) : undefined,
    companySize: searchParams.get('companySize') || undefined,
    industry: searchParams.get('industry') || undefined,
    complexityTolerance: searchParams.get('complexityTolerance') || undefined,
    matchedVendor: searchParams.get('matchedVendor') || undefined,
    search: searchParams.get('search') || undefined,
  };
}

function toCsv(rows: Awaited<ReturnType<typeof getAllRequestsForExport>>): string {
  const header = ['id', 'created_at', 'raw_problem_text', 'detected_domains', 'cluster_label', 'company_size', 'complexity_tolerance', 'industry', 'matched_vendors'];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.created_at,
        escape(r.raw_problem_text),
        escape(r.detected_domains.join('; ')),
        escape(r.cluster_label ?? ''),
        r.company_size ?? '',
        r.complexity_tolerance ?? '',
        r.industry ?? '',
        escape(r.matched_vendors.map((v) => `${v.name} (${Math.round(v.score * 100)}%)`).join('; ')),
      ].join(',')
    );
  }
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const filters = parseFilters(searchParams);

  if (!hasDatabase()) {
    return NextResponse.json({ error: 'No DATABASE_URL configured.', rows: [], total: 0 });
  }

  if (searchParams.get('format') === 'csv') {
    const rows = await getAllRequestsForExport(filters);
    return new NextResponse(toCsv(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="demand-signals-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const page = Number(searchParams.get('page') ?? '0');
  const pageSize = Math.min(200, Number(searchParams.get('pageSize') ?? '50'));
  const result = await getRequests({ ...filters, page, pageSize });
  return NextResponse.json(result);
}
