import Link from 'next/link';
import { Logo } from './Logo';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={34} />
          <span className="font-display text-lg font-semibold tracking-tight text-mist-100">Galymer</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-mist-400 md:flex">
          <Link href="/#how-it-works" className="transition hover:text-mist-100">
            How it works
          </Link>
          <Link href="/#principles" className="transition hover:text-mist-100">
            Principles
          </Link>
        </nav>
        <Link
          href="/match"
          className="rounded-full bg-signal-ion px-4 py-2 text-sm font-semibold text-ink-950 transition hover:opacity-90"
        >
          Start matching
        </Link>
      </div>
    </header>
  );
}
