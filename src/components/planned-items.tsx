import { RefList } from '@/components/ref-list';

export type PlannedItem = {
  title: string;
  detail: string;
  refs?: readonly string[];
};

export function PlannedItems({ items }: { items: readonly PlannedItem[] }) {
  return (
    <ol className="divide-y divide-rule border-y border-rule">
      {items.map((item, index) => (
        <li key={item.title} className="grid gap-3 py-6 sm:grid-cols-[3rem_1fr]">
          <span aria-hidden="true" className="font-mono text-xs text-muted">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <h3 className="font-display text-xl text-ink">{item.title}</h3>
            <p className="mt-2 max-w-2xl leading-relaxed text-ink2">{item.detail}</p>
            {item.refs?.length ? (
              <p className="mt-3 font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
                <RefList refs={item.refs} />
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
