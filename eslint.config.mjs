import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';

// Flat config. eslint-config-next 16 exports flat arrays, so no FlatCompat
// shim is needed. Prettier goes last so formatting rules never fight lint.
const config = [
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'scripts/**'],
  },
  ...nextCoreWebVitals,
  prettier,
  {
    // The engine is a package, not a folder: it may not reach into the
    // application, React or the framework (DEC-002).
    files: ['packages/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'The engine must stay framework-free (DEC-002).' },
            { name: 'react-dom', message: 'The engine must stay framework-free (DEC-002).' },
            { name: 'next', message: 'The engine must run in plain Node (DEC-002).' },
            { name: 'three', message: 'The engine must stay renderer-free (DEC-002).' },
            {
              name: '@react-three/fiber',
              message: 'The engine must stay renderer-free (DEC-002).',
            },
            { name: '@react-three/drei', message: 'The engine must stay renderer-free (DEC-002).' },
          ],
          patterns: [
            {
              group: ['react/*', 'react-dom/*', 'next/*', '@react-three/*', '@/*'],
              message: 'The engine may not import the application or the framework (DEC-002).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@dar-chams/engine/src/*', '@dar-chams/engine/dist/*'],
              message: 'Import the engine through its public entry point: @dar-chams/engine.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
