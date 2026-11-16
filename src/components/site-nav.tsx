'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRIMARY_ROUTES } from '@/lib/routes';

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {PRIMARY_ROUTES.map(({ href, label }) => {
          const active =
            href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={`font-mono text-[11px] tracking-[0.14em] uppercase underline-offset-[6px] transition-colors ${
                  active
                    ? 'text-basalt underline decoration-oxide decoration-2'
                    : 'text-ink/80 no-underline hover:text-basalt hover:underline hover:decoration-line'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
