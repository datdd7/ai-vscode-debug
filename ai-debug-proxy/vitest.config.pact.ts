import { defineConfig } from 'vitest/config';

/**
 * Minimal Vitest config dedicated to Pact consumer contract tests.
 * Do NOT copy settings from the unit test (Jest) config here.
 */
export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/contract/**/*.pacttest.ts'],
        testTimeout: 30000,
    },
});
