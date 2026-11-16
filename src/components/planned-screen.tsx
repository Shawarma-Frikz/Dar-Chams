import { PageIntro } from '@/components/page-intro';
import { PlannedItems, type PlannedItem } from '@/components/planned-items';

type PlannedScreenProps = {
  eyebrow: string;
  title: string;
  lede: string;
  phase: string;
  refs: readonly string[];
  items: readonly PlannedItem[];
};

export function PlannedScreen({ eyebrow, title, lede, phase, refs, items }: PlannedScreenProps) {
  return (
    <>
      <PageIntro eyebrow={eyebrow} title={title} lede={lede} phase={phase} refs={refs} />
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl text-ink">Planned contents</h2>
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
            Not built yet
          </p>
        </div>
        <div className="mt-6">
          <PlannedItems items={items} />
        </div>
      </section>
      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-ink2">
        This route exists so the structure and the requirement mapping can be reviewed before the
        engine exists. It displays no values: a screenshot of this page is a plan, not a result.
      </p>
    </>
  );
}
