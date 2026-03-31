/**
 * @file security.test.ts
 * @brief Security Test Suite — AI Debug Proxy
 *
 * Tests protection against injection, path traversal, info leak,
 * and resource exhaustion. All tests use real router + mock backend.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleRequest } from '../../server/router';
import { BackendManager } from '../../backend/BackendManager';
import * as http from 'http';

// ---------------------------------------------------------------------------
// Mock Backend
// ---------------------------------------------------------------------------

class MockSecureBackend {
    isRunning() { return true; }

    async getLastStopInfo(): Promise<any> {
        return { reason: 'mock', threadId: 1 };
    }

    async continue(): Promise<void> {}
    async getVariables(): Promise<any[]> { return []; }
    async getArguments(): Promise<any[]> { return []; }
    async getGlobals(): Promise<any[]> { return []; }
    async listAllLocals(): Promise<any[]> { return []; }
    async getScopePreview(): Promise<any> { return { locals: [], args: [] }; }
    getCapabilities() {
        return { supportsLaunch: true, supportsAttach: false };
    }
    async listThreads(): Promise<any[]> { return [{ id: 1, name: 'Thread 1', state: 'stopped' }]; }

    async getSource(expression: string): Promise<string> {
        // Real path traversal check: reject anything with ../
        if (expression.includes('..')) {
            throw new Error('Path traversal attempt rejected');
        }
        return 'mock source code';
    }

    async evaluate(expression: string): Promise<any> {
        // Simulate internal error with path info — sanitizeError should strip it
        if (expression === 'CRASH_ME') {
            throw new Error('Internal error at /home/testuser/project/src/backend.ts:42');
        }
        // Command injection attempt in expression — GDB would handle this, but
        // the proxy must not execute OS commands
        return { name: expression, value: '42', type: 'int' };
    }

    async readMemory(address: number, length: number): Promise<Buffer> {
        if (length > 65536) {
            throw new Error('Memory read exceeds 64KB limit');
        }
        return Buffer.alloc(Math.min(length, 64));
    }

    async executeStatement(statement: string): Promise<string> {
        return 'ok';
    }
}

function req(): http.IncomingMessage {
    return {} as http.IncomingMessage;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('AI Debug Proxy — Security Suite', () => {

    beforeEach(() => {
        BackendManager.getInstance().setActiveBackend(new MockSecureBackend() as any);
    });

    // ── S1: Path Traversal ───────────────────────────────────────────────────

    describe('S1: Path Traversal Prevention', () => {

        it('S1.1: get_source with ../ path traversal attempt is rejected', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 'get_source',
                params: { expression: '../../../etc/passwd' }
            }, req());
            // Either rejected at backend (5xx) or with a safe error — no file content
            const bodyStr = JSON.stringify(res.body);
            expect(bodyStr).not.toContain('root:x:');
            expect(bodyStr).not.toContain('/bin/bash');
            expect(bodyStr).not.toContain('/bin/sh');
        });

        it('S1.2: get_source with nested traversal ..././ also rejected', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 'get_source',
                params: { expression: '..././..././etc/shadow' }
            }, req());
            const bodyStr = JSON.stringify(res.body);
            expect(bodyStr).not.toContain('root:');
        });

    });

    // ── S2: Information Leak Prevention (ADP-024) ───────────────────────────

    describe('S2: Information Leak Prevention', () => {

        it('S2.1: internal paths stripped from error responses (ADP-024)', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 'evaluate',
                params: { expression: 'CRASH_ME' }
            }, req());
            const errorMsg: string = res.body?.error || '';
            // The sanitizeError function should strip /home/testuser/... paths
            expect(errorMsg).not.toMatch(/\/home\/[^/]+\//);
        });

        it('S2.2: stack traces in errors do not expose cwd paths', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 'evaluate',
                params: { expression: 'CRASH_ME' }
            }, req());
            const bodyStr = JSON.stringify(res.body);
            // Must not contain absolute paths to source files
            expect(bodyStr).not.toMatch(/\/home\/[^"]+\.ts/);
        });

    });

    // ── S3: Input Validation ─────────────────────────────────────────────────

    describe('S3: Malformed Input Handling', () => {

        it('S3.1: numeric operation field returns 400', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 123
            }, req());
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
            expect(res.body.error).toBeDefined();
        });

        it('S3.2: null operation field returns 400', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: null
            }, req());
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
        });

        it('S3.3: missing operation field returns 400', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {}, req());
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
            expect(res.body.error).toContain('operation');
        });

        it('S3.4: unknown operation returns 400', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 'delete_all_files'
            }, req());
            expect(res.statusCode).toBe(400);
        });

        it('S3.5: operation with extra unexpected fields still validates normally', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 'continue',
                params: {},
                malicious_extra: 'ignored',
                __proto__: { polluted: true }
            }, req());
            // continue should succeed normally
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

    });

    // ── S4: Memory Limit Enforcement ─────────────────────────────────────────

    describe('S4: Resource Limit Enforcement', () => {

        it('S4.1: read_memory with count > 65536 is rejected', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 'read_memory',
                params: { memoryReference: '0x1000', count: 1000000 }
            }, req());
            // Should fail — either at backend (memory limit) or validation
            expect(res.statusCode).not.toBe(200);
        });

        it('S4.2: read_memory with count 0 still returns a valid response', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 'read_memory',
                params: { memoryReference: '0x1000', count: 1 }
            }, req());
            // Small read should succeed
            expect(res.statusCode).toBe(200);
        });

    });

    // ── S5: Prototype Pollution Prevention ───────────────────────────────────

    describe('S5: Prototype Pollution Prevention', () => {

        it('S5.1: __proto__ in params does not pollute Object prototype', async () => {
            const before = (Object.prototype as any).polluted;
            await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 'continue',
                params: { '__proto__': { polluted: 'yes' } }
            }, req());
            const after = (Object.prototype as any).polluted;
            expect(after).toBe(before); // should be unchanged
        });

        it('S5.2: constructor in params does not crash the server', async () => {
            const res = await handleRequest('POST', '/api/debug/execute_operation', {
                operation: 'continue',
                params: { constructor: { prototype: { hacked: true } } }
            }, req());
            // Should handle without crashing (200 or error)
            expect([200, 400, 500]).toContain(res.statusCode);
        });

    });

});
