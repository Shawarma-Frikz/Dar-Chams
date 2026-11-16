import Link from 'next/link';
import { SiteNav } from '@/components/site-nav';

function SunPathMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="h-8 w-8 shrink-0"
      fill="none"
      strokeLinecap="round"
    >
      <path d="M4 24Q16 4 28 24" stroke="var(--color-oxide)" strokeWidth="1.5" />
      <circle cx="16" cy="14" r="1.6" fill="var(--color-sage)" />
      <path d="M9 24v-6h6v6M14 24v-3h4v3" stroke="var(--color-basalt)" strokeWidth="1.5" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <Link
          href="/"
          aria-label="Helios — overview"
          className="flex items-center gap-3 text-basalt no-underline"
        >
          <SunPathMark />
          <span className="font-display text-xl tracking-tight">Helios</span>
          <span className="hidden font-mono text-[11px] tracking-[0.16em] text-ink uppercase md:inline">
            Solar microgrid twin
          </span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
