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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Only measure coverage for our own source (not VS Code internals, node_modules, etc.)
      include: ['src/**/*.ts'],
      exclude: [
        // VS Code extension host — requires VS Code runtime, cannot be unit-tested
        'src/vscode/**',
        // DAP protocol server — extends LoggingDebugSession, requires VS Code DAP runtime
        'src/protocol/dap/DebugAdapter.ts',
        // HTTP server transport — integration-level only (requires real socket)
        'src/server/HttpServer.ts',
        'src/server/routes/**',
        // Pure TypeScript interfaces — no executable statements
        'src/core/IDebugBackend.ts',
        'src/core/types.ts',
        // Test infrastructure files
        'src/test/**',
      ],
      thresholds: {
        statements: 100,
        lines: 100,
        branches: 100,
        functions: 100,
      },
    },
  },
});
