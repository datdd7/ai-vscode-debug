/**
 * Consumer Pact contract test — ping endpoint.
 * Verifies the consumer's expectations about the /api/ping response shape.
 *
 * Run: npm run test:pact:consumer
 */
import { MatchersV3 } from '@pact-foundation/pact';
import type { V3MockServer } from '@pact-foundation/pact';
import { setJsonBody } from '../support/consumer-helpers';
import { createPact } from '../support/pact-config';

// Import REAL consumer code (the HTTP client used by AI agents to call the proxy)
// For now this is a simple fetch wrapper; replace with your actual client module.
async function fetchPing(baseUrl: string) {
    const res = await fetch(`${baseUrl}/api/ping`);
    return res.json();
}

const { like, string, eachLike } = MatchersV3;

const pact = createPact();

describe('AI Debug Proxy Consumer Contract — Ping', () => {
    it('should return pong with operations list', async () => {
        await pact
            .addInteraction()
            .given('Proxy server is running')
            .uponReceiving('a request to check proxy health')
            .withRequest('GET', '/api/ping')
            .willRespondWith(
                200,
                setJsonBody(
                    like({
                        success: true,
                        data: like({
                            message: string('pong'),
                            version: string('2.1.0-debug'),
                            operations: eachLike(string('launch')),
                        }),
                        timestamp: string('2026-01-01T00:00:00.000Z'),
                    }),
                ),
            )
            .executeTest(async (mockServer: V3MockServer) => {
                const body = await fetchPing(mockServer.url);

                expect(body.success).toBe(true);
                expect(body.data.message).toBe('pong');
                expect(Array.isArray(body.data.operations)).toBe(true);
            });
    });
});
