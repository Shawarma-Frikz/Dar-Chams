/**
 * Public surface of the Helios engine package.
 *
 * The simulation itself arrives in phase 02. This module exists now so the
 * application imports the engine across a package boundary from the first
 * commit: no React, no Next.js and no browser API may appear here, and the
 * engine must stay runnable in plain Node for tests and batch experiments
 * (DEC-002).
 */

export const ENGINE_NAME = 'helios-engine';
export const ENGINE_VERSION = '0.1.0';
