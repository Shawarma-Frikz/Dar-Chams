import { RefList } from '@/components/ref-list';

type PageIntroProps = {
  eyebrow: string;
  title: string;
  lede: string;
  phase?: string;
  refs?: readonly string[];
};

export function PageIntro({ eyebrow, title, lede, phase, refs }: PageIntroProps) {
  return (
    <header className="border-b border-rule pb-10">
      <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{eyebrow}</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-balance text-ink sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink2">{lede}</p>
      {(phase || refs?.length) && (
        <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] tracking-[0.12em] uppercase">
          {phase && (
            <div className="flex gap-2">
              <dt className="text-muted">Planned</dt>
              <dd className="text-ink">{phase}</dd>
            </div>
          )}
          {refs?.length ? (
            <div className="flex gap-2">
              <dt className="text-muted">Requirements</dt>
              <dd className="text-ink">
                <RefList refs={refs} />
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </header>
  );
}
