/**
 * Merged Playwright fixtures for AI Debug Proxy E2E tests.
 *
 * Install: npm install -D @seontechnologies/playwright-utils
 * See: https://github.com/seontechnologies/playwright-utils
 */
import { mergeTests } from '@playwright/test';
import { test as apiRequestFixture } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { test as logFixture } from '@seontechnologies/playwright-utils/log/fixtures';

/**
 * Merged test object — import this in all E2E tests.
 * Provides: apiRequest, log
 */
export const test = mergeTests(apiRequestFixture, logFixture);

export { expect } from '@playwright/test';
