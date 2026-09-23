import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ArrowRightIcon, LayersIcon, ShieldIcon, SparkleIcon } from '@/components/Icons';

const FACTORS = [
  { weight: '55%', title: 'Problem fit', body: 'How closely a partner’s capabilities match the problem you actually described — not a keyword in a press release.' },
  { weight: '20%', title: 'Implementation complexity', body: 'Matched against how much rollout complexity your team can realistically absorb right now.' },
  { weight: '15%', title: 'Company size fit', body: 'Enterprise platforms score lower for a 40-person team, and vice versa — deployment reality, not brand size.' },
  { weight: '10%', title: 'Existing stack synergy', body: 'A bonus, never a gate: already deep in Microsoft or Salesforce? That lowers marginal cost — it never overrides a bad fit.' },
];

const STEPS = [
  { n: '01', title: 'Tell us your stack', body: 'Optional, two clicks: Microsoft, AWS, Google Cloud, SAP, Salesforce, Oracle, IBM, Adobe, or none yet.' },
  { n: '02', title: 'Describe the problem', body: 'One or two sentences in your own words. Refine with specific capability tags if you want tighter results.' },
  { n: '03', title: 'Get your top 3 — explained', body: 'Full-color top picks with a factor-by-factor breakdown. Close alternatives shown, clearly de-emphasized, with a plain-language reason why.' },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-aurora-radial px-6 pb-24 pt-20 md:pt-28">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <div className="mb-8 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-mist-300">
              <SparkleIcon size={14} className="text-signal-400" />
              Independent · Vendor-agnostic · No placement fees
            </div>
            <Logo size={72} withGlow className="mb-8" />
            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-mist-100 sm:text-5xl md:text-6xl">
              Technology partner matching,
              <br />
              <span className="text-gradient">without the marketing spend bias.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-mist-400">
              Describe your business problem once. Galymer scores technology partners on problem
              fit, implementation complexity, company size and your existing stack — then shows
              its work. Market share and review scores are shown as context, never used to pick a
              winner.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Link
                href="/match"
                className="group flex items-center gap-2 rounded-full bg-signal-ion px-7 py-3.5 text-base font-semibold text-ink-950 shadow-glow transition hover:brightness-110"
              >
                Start matching
                <ArrowRightIcon size={18} className="transition group-hover:translate-x-0.5" />
              </Link>
              <a href="#how-it-works" className="text-sm font-medium text-mist-400 underline-offset-4 hover:text-mist-100 hover:underline">
                See how scoring works
              </a>
            </div>
            <p className="mt-5 text-xs text-mist-500">Free to use · Results in under a minute · No account required</p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-white/5 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-400">How it works</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-mist-100 sm:text-4xl">
                Three steps. Under a minute. No sales call.
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="card-grain rounded-2xl border border-white/10 bg-ink-800/60 p-7">
                  <span className="font-mono text-sm text-signal-400">{s.n}</span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-mist-100">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist-400">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Principles / scoring transparency */}
        <section id="principles" className="border-t border-white/5 bg-ink-900/40 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ion-400">Scoring, in the open</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-mist-100 sm:text-4xl">
                Four factors decide the score. That&apos;s all of them.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-mist-400">
                Market share, analyst rankings, consulting-alliance status and community review
                scores are displayed on every result card as context — they are never inputs to
                the ranking itself.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {FACTORS.map((f) => (
                <div key={f.title} className="flex gap-5 rounded-2xl border border-white/10 bg-ink-800/40 p-6">
                  <div className="font-display text-2xl font-semibold text-gradient">{f.weight}</div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-mist-100">{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-mist-400">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-mist-400">
                <ShieldIcon size={14} className="text-signal-400" /> Context shown, never scored: market share
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-mist-400">
                <ShieldIcon size={14} className="text-signal-400" /> Context shown, never scored: consulting alliances
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-mist-400">
                <ShieldIcon size={14} className="text-signal-400" /> Context shown, never scored: community reviews
              </div>
            </div>
            <p className="mt-8 max-w-2xl text-xs leading-relaxed text-mist-500">
              <span className="font-medium text-mist-400">Ties, explained: </span>
              two partners can land on the exact same score. When they do, the tie is broken using the same four
              disclosed factors above — problem fit first, then complexity fit, then company-size fit — and only
              falls back to alphabetical order if every factor is identical. Market share, alliances and reviews are
              never used to break a tie, same as they&apos;re never used to score in the first place. Products from
              the same company are also never split across two of your three picks — see the parent-company note
              on any result card.
            </p>
          </div>
        </section>

        {/* Stack mode teaser */}
        <section className="border-t border-white/5 px-6 py-24">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-400">Beyond a single winner</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-mist-100 sm:text-4xl">
                Complex problem? Get a recommended stack.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-mist-400">
                Some problems don&apos;t have a single-vendor answer. When your top matches publish
                compatible integrations with each other, Galymer proposes them together as a
                working stack — for example a conversational-AI platform, a CRM service cloud,
                and a communications API — instead of forcing a winner-takes-all pick.
              </p>
            </div>
            <div className="card-grain rounded-2xl border border-white/10 bg-ink-800/60 p-6">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ion-400">
                <LayersIcon size={16} />
                Recommended stack
              </div>
              <p className="mt-3 font-display text-lg font-semibold text-mist-100">
                Conversational AI + Service Cloud + Communications API
              </p>
              <p className="mt-2 text-sm text-mist-400">
                These three appear in each other&apos;s published integration ecosystem, so they
                combine into one working stack across contact center, CRM and voice/SMS delivery.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/5 bg-aurora-radial px-6 py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-mist-100 sm:text-4xl">
              Describe your problem. See who actually fits.
            </h2>
            <Link
              href="/match"
              className="group mt-8 flex items-center gap-2 rounded-full bg-signal-ion px-7 py-3.5 text-base font-semibold text-ink-950 shadow-glow transition hover:brightness-110"
            >
              Start matching
              <ArrowRightIcon size={18} className="transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
