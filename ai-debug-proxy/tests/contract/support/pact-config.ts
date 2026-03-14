import path from 'node:path';
import { PactV4 } from '@pact-foundation/pact';

/**
 * PactV4 factory for AI Debug Proxy consumer contract tests.
 * Consumer = this extension; Provider = ai-debug-proxy HTTP server.
 */
export const createPact = (overrides?: { consumer?: string; provider?: string }) =>
    new PactV4({
        dir: path.resolve(process.cwd(), 'pacts'),
        consumer: overrides?.consumer ?? 'ai-debug-proxy-consumer',
        provider: overrides?.provider ?? 'ai-debug-proxy',
        logLevel: 'warn',
    });
