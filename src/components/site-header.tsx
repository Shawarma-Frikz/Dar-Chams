import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';
import { SiteNav } from '@/components/site-nav';

export function SiteHeader() {
  return (
    <header className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <Link
          href="/"
          aria-label="Dar Chams — overview"
          className="flex min-h-11 items-center gap-3 text-ink no-underline"
        >
          <BrandMark className="h-9 w-9 shrink-0" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-extrabold tracking-[-0.035em]">
              Dar Chams
            </span>
            <span
              lang="ar"
              dir="rtl"
              className="mt-1 font-arabic text-[11px] font-semibold text-ink2"
            >
              دار شمس
            </span>
          </span>
          <span className="hidden font-mono text-[11px] tracking-[0.12em] text-muted uppercase md:inline">
            Solar house twin
          </span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
