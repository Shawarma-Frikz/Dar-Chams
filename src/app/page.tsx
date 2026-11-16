import type { Metadata } from 'next';
import Link from 'next/link';
import { PageIntro } from '@/components/page-intro';
import { PRIMARY_ROUTES } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Overview',
};

const STATUS = [
  {
    label: 'Shell and engine',
    detail:
      'A Next.js App Router static export with six routes and one navigation, and the simulation in @helios/engine, a TypeScript workspace package with no React, Next.js or DOM import. Lint fails if one is added.',
    refs: 'NFR-09 · FR-SIM-01 · DEC-002',
  },
  {
    label: 'Configuration',
    detail:
      'Defaults, scenario, user settings and runtime state are separate layers. The boot scenario is validated at startup, so a bad capacity, a negative power, an impossible SOC or a field that forgot its unit stops the build with a path and a fix.',
    refs: 'FR-SIM-10 · DEC-033',
  },
  {
    label: 'Time, units and balance',
    detail:
      'A run steps at 5, 15, 30 or 60 minutes. Stamps are stored as instants and shown in the site zone, so a 23- or 25-hour daylight-saving day yields 92 or 100 quarter-hour steps rather than a wrong 24 hours. Power is kept in watts, energy in watt-hours, temperature in °C and state of charge as a 0–1 fraction; kW, kWh and percent exist only at named display boundaries, and a mixed-unit calculation does not compile. Every step then closes a nine-term watt-hour ledger — three supply terms, six demand terms and three separately owned losses — with a signed residual bounded at ±1e-6 Wh.',
    refs: 'FR-SIM-02 · FR-SIM-03 · DEC-037 · DEC-038 · DEC-039',
  },
  {
    label: 'Quality gates',
    detail:
      'npm run verify runs twelve checks — the runtime pin, the document registers, the configuration, site-time, unit and energy-balance proofs and the CI contract — then type-check, lint, format, 65 unit and property tests, and the production build. CI runs the same six gates on Linux and Windows.',
    refs: 'NFR-06 · DEC-034',
  },
];

const NOT = [
  {
    title: 'Not a controller for a real installation',
    detail: 'No plant is monitored or actuated, and no real load is switched.',
  },
  {
    title: 'Not a metered energy audit',
    detail:
      'Every value describing the installation is simulated, forecast or derived, and is labelled as such.',
  },
  {
    title: 'Not an “AI dashboard”',
    detail:
      'Rules are called rules, and a learned model is kept only if it beats a named baseline.',
  },
];

export default function OverviewPage() {
  return (
    <>
      <PageIntro
        eyebrow="Residential solar microgrid · digital twin"
        title="A simulated house in balance."
        lede="Helios models a photovoltaic array, a battery, a grid connection and a household of individually modelled appliances inside a deterministic engine, then compares a rule-based controller with a forecast-aware scheduler on identical inputs. Everything on this site is simulated: no physical installation is monitored or controlled."
      />

      <section className="mt-12 grid gap-8 border-b border-line pb-12 md:grid-cols-[1fr_2fr]">
        <h2 className="font-display text-2xl text-basalt">State of the build</h2>
        <dl className="grid gap-6 sm:grid-cols-2">
          {STATUS.map(({ label, detail, refs }) => (
            <div key={label}>
              <dt className="font-mono text-[11px] tracking-[0.14em] text-ink uppercase">
                {label}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink">{detail}</dd>
              <dd className="mt-3 font-mono text-[11px] tracking-[0.12em] text-ink uppercase">
                {refs}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 border-b border-line pb-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl text-basalt">Screens</h2>
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink uppercase">
            Structure only · no values yet
          </p>
        </div>
        <ul className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {PRIMARY_ROUTES.map((route) => {
            const current = route.href === '/';
            const body = (
              <>
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink uppercase">
                  {route.phase}
                </span>
                <span className="mt-2 block font-display text-xl group-hover:text-oxide">
                  {route.label}
                </span>
                <span className="mt-3 block text-sm leading-relaxed text-ink">{route.summary}</span>
                <span className="mt-4 block font-mono text-[11px] tracking-[0.12em] text-ink uppercase underline decoration-line underline-offset-4 group-hover:decoration-oxide">
                  {current ? 'Current page' : `Open ${route.label}`}
                </span>
              </>
            );

            return (
              <li key={route.href} className="bg-limestone">
                {current ? (
                  <div className="h-full p-6" aria-current="page">
                    {body}
                  </div>
                ) : (
                  <Link
                    href={route.href}
                    prefetch={false}
                    className="group block h-full p-6 text-basalt no-underline"
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12 grid gap-8 border-b border-line pb-12 md:grid-cols-[1fr_2fr]">
        <h2 className="font-display text-2xl text-basalt">What this is not</h2>
        <ul className="grid gap-6 sm:grid-cols-3">
          {NOT.map(({ title, detail }) => (
            <li key={title}>
              <h3 className="font-display text-base text-basalt">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink">{detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-[1fr_2fr]">
        <h2 className="font-display text-2xl text-basalt">Provenance, before the values exist</h2>
        <div className="max-w-2xl space-y-4 leading-relaxed text-ink">
          <p>
            Every number Helios shows will carry one of seven provenance classes — measured,
            external, simulated, forecast, inferred, derived or configured — and a unit. A simulated
            value is never presented as measured, and an unregistered value fails the interface
            contract (NFR-07, DEC-024).
          </p>
          <p>
            None of those classes is in use here yet. The engine has a time base, canonical units
            and an energy-balance ledger, and no physics, and this shell deliberately displays no
            metric: a number without a class and a source would be decoration.
          </p>
        </div>
      </section>
    </>
  );
}
