import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { DM_Mono, DM_Sans, Literata } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { CONFIGURATION } from '@/lib/config/startup';
import './globals.css';

const literata = Literata({ subsets: ['latin'], variable: '--font-literata', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Helios — simulation-first solar microgrid twin',
    template: '%s · Helios',
  },
  description:
    'A simulation-first residential solar microgrid and energy-management digital twin. Nothing in this release monitors or controls a physical installation.',
  applicationName: 'Helios',
};

export const viewport: Viewport = {
  themeColor: '#e9e3d5',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-motion={CONFIGURATION.presentation.motion}
      className={`${literata.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-chalk focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-basalt"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
          {children}
        </main>
        <footer className="mt-16 border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-ink sm:flex-row sm:items-start sm:justify-between lg:px-8">
            <div className="max-w-xl">
              <p className="font-display text-base text-basalt">Simulation only.</p>
              <p className="mt-2 leading-relaxed">
                No physical plant is monitored or controlled, and no value in this release is a
                measurement (DEC-001, DEC-019).
              </p>
            </div>
            <p className="font-mono text-[11px] tracking-[0.12em] uppercase">
              Engine · {CONFIGURATION.engine.name} {CONFIGURATION.engine.version}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
