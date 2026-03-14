/**
 * Phase 3 Feature Validation tests.
 * Includes tests for Hardware & Memory APIs, Threads, and Batch operations.
 * The proxy must be running; a real debug session is not required for validation tests.
 */
import { test, expect } from '../support/fixtures/merged-fixtures';
import { debugOp } from '../support/helpers/debug-api';

test.describe('Phase 3 - Hardware and Thread APIs (No active session)', () => {
    test('read_memory missing memoryReference returns 400', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug',
            body: debugOp('read_memory', { count: 100 }),
        });

        expect(status).toBe(400);
        expect(body.success).toBe(false);
    });

    test('read_memory without active session returns error structure', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug',
            body: debugOp('read_memory', { memoryReference: '0x1234', count: 100 }),
        });

        expect([200, 500]).toContain(status);
        if (status === 200) {
            expect(body.data?.success).toBe(false);
        } else {
            expect(body.success).toBe(false);
        }
    });

    test('get_registers without active session returns error structure', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug',
            body: debugOp('get_registers'),
        });

        expect([200, 500]).toContain(status);
        if (status === 200) {
            expect(body.data?.success).toBe(false);
        } else {
            expect(body.success).toBe(false);
        }
    });

    test('list_threads without active session returns error structure', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug',
            body: debugOp('list_threads'),
        });

        expect([200, 500]).toContain(status);
        if (status === 200) {
            expect(body.data?.success).toBe(false);
        } else {
            expect(body.success).toBe(false);
        }
    });
});

test.describe('Phase 3 - Batch API Operations', () => {
    test('POST /api/debug/batch missing operations array returns error', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug/batch',
            body: { parallel: true },
        });

        expect([400, 500]).toContain(status);
    });

    test('POST /api/debug/batch processes sequential items', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug/batch',
            body: {
                operations: [
                    { operation: "list_threads" },
                    { operation: "stack_trace" }
                ],
                parallel: false
            },
        });

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBe(2);

        // Assert operation identifiers are kept in output
        expect(body.data[0].operation).toBe('list_threads');
        expect(body.data[1].operation).toBe('stack_trace');
    });

    test('POST /api/debug/batch processes parallel items', async ({ apiRequest }) => {
        const { status, body } = await apiRequest({
            method: 'POST',
            path: '/api/debug/batch',
            body: {
                operations: [
                    { operation: "list_threads" },
                    { operation: "get_registers" }
                ],
                parallel: true
            },
        });

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBe(2);
    });
});
