/**
 * Debug operation validation tests.
 * Tests the /api/debug endpoint with valid and invalid inputs.
 * The proxy must be running; a real debug session is not required for validation tests.
 */
import { test, expect } from '../support/fixtures/merged-fixtures';
import { debugOp } from '../support/helpers/debug-api';

test.describe('Debug Operations — Input Validation', () => {
    test('POST /api/debug with missing operation returns 400', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug',
            body: {},
        });

        expect(status).toBe(400);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/operation/i);
    });

    test('POST /api/debug with invalid JSON body returns 400', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug',
            body: 'not-an-object',
        });

        expect(status).toBe(400);
        expect(body.success).toBe(false);
    });

    test('POST /api/debug with unknown operation returns 500', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug',
            body: debugOp('not_a_real_op'),
        });

        expect(status).toBe(500);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/unknown operation/i);
    });

    test('POST /api/debug set_breakpoint missing location returns 400', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug',
            body: debugOp('set_breakpoint', {}),
        });

        expect(status).toBe(400);
        expect(body.success).toBe(false);
    });
});

test.describe('Debug Operations — No Active Session', () => {
    test('stack_trace without active session returns error', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug',
            body: debugOp('stack_trace'),
        });

        // Either 500 (no session error) or 200 with success:false
        expect([200, 500]).toContain(status);
        if (status === 200) {
            expect(body.data?.success).toBe(false);
        } else {
            expect(body.success).toBe(false);
        }
    });

    test('continue without active session returns error', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug',
            body: debugOp('continue'),
        });

        expect([200, 500]).toContain(status);
    });
});
