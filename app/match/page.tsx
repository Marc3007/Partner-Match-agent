'use client';

import { useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { StackPicker } from '@/components/StackPicker';
import { ProblemForm } from '@/components/ProblemForm';
import { ResultsView } from '@/components/ResultsView';
import type { CompanySize, ComplexityLevel, Ecosystem, MatchResponse } from '@/lib/types';

type Step = 'stack' | 'problem' | 'results';

export default function MatchPage() {
  const [step, setStep] = useState<Step>('stack');
  const [existingStack, setExistingStack] = useState<Ecosystem[]>([]);
  const [problem, setProblem] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState<CompanySize>('mid_market');
  const [complexityTolerance, setComplexityTolerance] = useState<ComplexityLevel>('medium');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem, industry, companySize, complexityTolerance, existingStack, selectedTagIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      const data: MatchResponse = await res.json();
      setResult(data);
      setStep('results');
    } catch {
      setError('Could not reach the matching service. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setStep('stack');
    setProblem('');
    setSelectedTagIds([]);
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 py-16">
        {step === 'stack' && (
          <StackPicker
            selected={existingStack}
            onChange={setExistingStack}
            onContinue={() => setStep('problem')}
            onSkip={() => {
              setExistingStack([]);
              setStep('problem');
            }}
          />
        )}
        {step === 'problem' && (
          <ProblemForm
            problem={problem}
            setProblem={setProblem}
            industry={industry}
            setIndustry={setIndustry}
            companySize={companySize}
            setCompanySize={setCompanySize}
            complexityTolerance={complexityTolerance}
            setComplexityTolerance={setComplexityTolerance}
            selectedTagIds={selectedTagIds}
            setSelectedTagIds={setSelectedTagIds}
            onSubmit={submit}
            onBack={() => setStep('stack')}
            loading={loading}
            error={error}
          />
        )}
        {step === 'results' && result && (
          <ResultsView
            result={result}
            problem={problem}
            companySize={companySize}
            complexityTolerance={complexityTolerance}
            existingStack={existingStack}
            onStartOver={startOver}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
