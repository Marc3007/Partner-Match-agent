import { NextRequest, NextResponse } from 'next/server';
import { runMatch } from '@/lib/matching';
import type { CompanySize, ComplexityLevel, Ecosystem, MatchRequest } from '@/lib/types';

const VALID_SIZES: CompanySize[] = ['startup', 'mid_market', 'enterprise'];
const VALID_COMPLEXITY: ComplexityLevel[] = ['low', 'medium', 'high'];
const VALID_ECOSYSTEMS: Ecosystem[] = ['Microsoft', 'AWS', 'Google', 'SAP', 'Salesforce', 'Oracle', 'IBM', 'Adobe', 'independent'];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.problem !== 'string' || body.problem.trim().length < 8) {
    return NextResponse.json({ error: 'Please describe your business problem in a sentence or two.' }, { status: 400 });
  }

  const companySize: CompanySize = VALID_SIZES.includes(body.companySize) ? body.companySize : 'mid_market';
  const complexityTolerance: ComplexityLevel = VALID_COMPLEXITY.includes(body.complexityTolerance) ? body.complexityTolerance : 'medium';
  const existingStack: Ecosystem[] = Array.isArray(body.existingStack)
    ? body.existingStack.filter((e: unknown): e is Ecosystem => VALID_ECOSYSTEMS.includes(e as Ecosystem))
    : [];
  const selectedTagIds: string[] = Array.isArray(body.selectedTagIds) ? body.selectedTagIds.filter((t: unknown) => typeof t === 'string') : [];

  const req: MatchRequest = {
    problem: body.problem,
    industry: typeof body.industry === 'string' ? body.industry : undefined,
    companySize,
    complexityTolerance,
    existingStack,
  };

  const result = await runMatch(req, selectedTagIds);
  return NextResponse.json(result);
}
