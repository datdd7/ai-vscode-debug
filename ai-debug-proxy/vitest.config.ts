import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',             // Exclude compiled outputs
      'src/test/suite/**',    // Exclude source VS Code suite
      'src/test/benchmark/**', // Exclude timing-sensitive benchmarks (CI-unreliable)
    ],
    globals: true,
  },
});
