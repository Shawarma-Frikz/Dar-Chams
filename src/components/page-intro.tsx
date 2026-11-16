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
    <header className="border-b border-line pb-10">
      <p className="font-mono text-[11px] tracking-[0.18em] text-ink uppercase">{eyebrow}</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-balance sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink">{lede}</p>
      {(phase || refs?.length) && (
        <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] tracking-[0.14em] uppercase">
          {phase && (
            <div className="flex gap-2">
              <dt className="text-ink">Planned</dt>
              <dd className="text-basalt">{phase}</dd>
            </div>
          )}
          {refs?.length ? (
            <div className="flex gap-2">
              <dt className="text-ink">Requirements</dt>
              <dd className="text-basalt">
                <RefList refs={refs} />
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </header>
  );
}
