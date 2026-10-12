import { defineConfig } from 'vitest/config';

// The application tests (RFC-2026-034 §8 item 4; RFC-2026-029 §3.2: vitest is imported only by
// test files and this config). They run as their own CI step, never inside `npm run check`, which
// stays the dependency-free tooling check (RFC-2026-029 §2.1/4). The tooling tier's own suites
// (`test-kits/`, `tests/`) are `.test.mjs` files run by `node --test`, and are not matched here.
export default defineConfig({
  test: {
    include: ['apps/**/*.test.ts', 'apps/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    environment: 'node',
    passWithNoTests: false,
  },
});
