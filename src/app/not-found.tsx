import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Not found',
};

export default function NotFound() {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] tracking-[0.18em] text-ink uppercase">404 · Not found</p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-balance">
        This route is not part of the shell.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink">
        The interface currently has six routes: overview, system twin, energy, forecasts, analytics
        and scenarios. Anything else is a plan that has not been built.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block font-mono text-[11px] tracking-[0.14em] text-basalt uppercase underline decoration-oxide decoration-2 underline-offset-[6px]"
      >
        Return to the overview
      </Link>
    </div>
  );
}
