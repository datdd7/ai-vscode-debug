import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for AI Debug Proxy E2E API tests.
 * Runs against the HTTP proxy on localhost:9999.
 * No browser required — pure API testing mode.
 */
export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60_000,
    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:9999',
        extraHTTPHeaders: {
            'Content-Type': 'application/json',
        },
        actionTimeout: 15_000,
        trace: 'retain-on-failure',
    },
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 4 : 1,
    reporter: [
        ['html', { outputFolder: '../_bmad-output/test-artifacts/playwright-report' }],
        ['junit', { outputFile: '../_bmad-output/test-artifacts/junit-results.xml' }],
        ['list'],
    ],
    projects: [
        {
            name: 'api',
            use: {},
        },
    ],
});
