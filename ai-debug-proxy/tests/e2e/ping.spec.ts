/**
 * Health check & status tests for the AI Debug Proxy.
 */
import { test, expect } from '../support/fixtures/merged-fixtures';
import type { PingResponse, StatusResponse } from '../support/helpers/debug-api';

test.describe('Health Check', () => {
    test('GET /api/ping returns pong with available operations', async ({ apiRequest }) => {
        const { status, body } = await apiRequest<PingResponse>({
            method: 'GET',
            path: '/api/ping',
        });

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.message).toBe('pong');
        expect(body.data.operations).toContain('launch');
        expect(body.data.operations).toContain('stack_trace');
        expect(body.data.operations).toContain('evaluate');
    });

    test('GET /api/status returns session state', async ({ apiRequest }) => {
        const { status, body } = await apiRequest<StatusResponse>({
            method: 'GET',
            path: '/api/status',
        });

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(typeof body.data.hasActiveSession).toBe('boolean');
    });

    test('unknown route returns 404', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'GET',
            path: '/api/does-not-exist',
        });

        expect(status).toBe(404);
        expect(body.success).toBe(false);
    });
});
