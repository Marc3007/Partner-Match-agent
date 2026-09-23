import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-ink-950">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <Logo size={28} />
            <div>
              <p className="font-display font-semibold text-mist-100">Galymer</p>
              <p className="text-sm text-mist-500">Independent technology partner matching.</p>
            </div>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-mist-500">
            Galymer is an independent product. It is not affiliated with, sponsored by, or
            endorsed by any of the technology vendors it evaluates. Vendor names and logos
            referenced belong to their respective owners.
          </p>
        </div>
        <p className="mt-8 text-xs text-mist-500">© {new Date().getFullYear()} Galymer. Demo dataset — see roadmap in README.</p>
      </div>
    </footer>
  );
}
