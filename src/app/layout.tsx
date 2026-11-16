import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import {
  Bricolage_Grotesque,
  Instrument_Sans,
  Martian_Mono,
  Noto_Kufi_Arabic,
} from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { CONFIGURATION } from '@/lib/config/startup';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});
const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});
const mono = Martian_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-martian',
  display: 'swap',
});
const arabic = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  variable: '--font-kufi',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Dar Chams — simulation-first solar house twin',
    template: '%s · Dar Chams',
  },
  description:
    'Dar Chams, the house of the sun: a simulation-first residential solar microgrid and energy-management digital twin. Nothing in this release monitors or controls a physical installation.',
  applicationName: 'Dar Chams',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EDF0EE' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1424' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-motion={CONFIGURATION.presentation.motion}
      className={`${display.variable} ${sans.variable} ${mono.variable} ${arabic.variable}`}
    >
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-ink"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
          {children}
        </main>
        <footer className="mt-16 border-t border-rule">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-ink2 sm:flex-row sm:items-start sm:justify-between lg:px-8">
            <div className="max-w-xl">
              <p className="font-display text-base text-ink">Simulation only.</p>
              <p className="mt-2 leading-relaxed">
                Dar is house, Chams is sun. No physical plant is monitored or controlled, and no
                value in this release is a measurement (DEC-001, DEC-019).
              </p>
            </div>
            <p className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
              Engine · {CONFIGURATION.engine.name} {CONFIGURATION.engine.version}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
