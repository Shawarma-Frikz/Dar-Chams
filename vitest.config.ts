import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests run against the same TypeScript sources the application imports:
// the engine is consumed as source, so a test cannot pass against a stale build.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'src/**/*.test.ts'],
    passWithNoTests: false,
    reporters: 'default',
  },
});
