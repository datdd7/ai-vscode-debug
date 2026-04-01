/**
 * @file performance.test.ts
 * @brief Performance Benchmark Suite — AI Debug Proxy
 *
 * Verifies latency and memory constraints for release qualification.
 * Tests run against real router/parser code (no E2E required).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleRequest } from '../../server/router';
import { parseMI } from '../../protocol/mi2/mi_parse';
import { validateOperationArgs } from '../../utils/validation';
import { BackendManager } from '../../backend/BackendManager';
import * as http from 'http';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class FastMockBackend {
    isRunning() { return false; }
    async getLastStopInfo(): Promise<any> { return { reason: 'stopped', threadId: 1 }; }
    async continue(): Promise<void> {}
    getCapabilities() { return { supportsLaunch: true }; }
    async listThreads(): Promise<any[]> { return []; }
    async getVariables(): Promise<any[]> { return []; }
    async getArguments(): Promise<any[]> { return []; }
    async getGlobals(): Promise<any[]> { return []; }
    async listAllLocals(): Promise<any[]> { return []; }
    async getScopePreview(): Promise<any> { return { locals: [], args: [] }; }
}

function req(): http.IncomingMessage {
    return {} as http.IncomingMessage;
}

/** Run fn N times and return p50/p95/p99 millisecond latencies */
async function measureLatencies(fn: () => Promise<void>, n: number): Promise<{ p50: number; p95: number; p99: number; mean: number }> {
    const times: number[] = [];
    for (let i = 0; i < n; i++) {
        const start = performance.now();
        await fn();
        times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const mean = times.reduce((s, v) => s + v, 0) / times.length;
    return {
        p50: times[Math.floor(n * 0.50)],
        p95: times[Math.floor(n * 0.95)],
        p99: times[Math.floor(n * 0.99)],
        mean
    };
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

describe('AI Debug Proxy — Performance Suite', () => {

    beforeEach(() => {
        BackendManager.getInstance().setActiveBackend(new FastMockBackend() as any);
    });

    // ── P1: Router latency ──────────────────────────────────────────────────

    describe('P1: Router Latency', () => {

        it('P1.1: ping endpoint responds in < 5ms (p95, N=100)', async () => {
            const latencies = await measureLatencies(async () => {
                await handleRequest('GET', '/api/ping', {}, req());
            }, 100);
            expect(latencies.p95).toBeLessThan(5);
        });

        it('P1.2: status endpoint responds in < 10ms (p95, N=100)', async () => {
            const latencies = await measureLatencies(async () => {
                await handleRequest('GET', '/api/debug/status', {}, req());
            }, 100);
            expect(latencies.p95).toBeLessThan(10);
        });

        it('P1.3: validation-only operations (continue) respond in < 2ms (p99, N=200)', async () => {
            const latencies = await measureLatencies(async () => {
                await handleRequest('POST', '/api/debug/execute_operation', {
                    operation: 'continue'
                }, req());
            }, 200);
            expect(latencies.p99).toBeLessThan(2);
        });

    });

    // ── P2: MI2 Parser Throughput ────────────────────────────────────────────

    describe('P2: MI2 Parser Throughput', () => {

        it('P2.1: parse simple stopped event in < 0.5ms (p95, N=500)', () => {
            const stoppedLine = '*stopped,reason="breakpoint-hit",disp="keep",' +
                'bkptno="1",thread-id="1",stopped-threads="all",' +
                'frame={addr="0x0000555555555195",func="main",args=[],' +
                'file="main.c",fullname="/home/user/project/main.c",line="42"}';

            const times: number[] = [];
            for (let i = 0; i < 500; i++) {
                const start = performance.now();
                parseMI(stoppedLine);
                times.push(performance.now() - start);
            }
            times.sort((a, b) => a - b);
            const p95 = times[Math.floor(500 * 0.95)];
            expect(p95).toBeLessThan(0.5);
        });

        it('P2.2: parse result record with 100 variables in < 5ms', () => {
            // Build a fake variables result with 100 variables
            const vars = Array.from({ length: 100 }, (_, i) =>
                `{name="var${i}",value="${i}",type="int"}`
            ).join(',');
            const line = `1^done,variables=[${vars}]`;

            const start = performance.now();
            const result = parseMI(line);
            const elapsed = performance.now() - start;

            expect(result).toBeDefined();
            expect(elapsed).toBeLessThan(5);
        });

        it('P2.3: parse 1000 consecutive MI lines in < 100ms', () => {
            const lines = [
                '*stopped,reason="step",thread-id="1"',
                '=thread-group-started,id="i1",pid="1234"',
                '~"source line here\\n"',
                '1^done,value="42"',
            ];

            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                parseMI(lines[i % lines.length]);
            }
            const elapsed = performance.now() - start;
            expect(elapsed).toBeLessThan(100);
        });

    });

    // ── P3: Validation Throughput ────────────────────────────────────────────

    describe('P3: Validation Throughput', () => {

        it('P3.1: validate all 38 operations in < 5ms total', () => {
            const operations = [
                ['continue', {}],
                ['step_over', {}],
                ['step_in', {}],
                ['step_out', {}],
                ['pause', {}],
                ['restart', {}],
                ['terminate', {}],
                ['get_capabilities', {}],
                ['get_last_stop_info', {}],
                ['get_scope_preview', {}],
                ['list_threads', {}],
                ['stack_trace', {}],
                ['get_variables', {}],
                ['get_arguments', {}],
                ['get_globals', {}],
                ['list_all_locals', {}],
                ['get_active_breakpoints', {}],
                ['up', {}],
                ['down', {}],
                ['set_breakpoint', { location: { path: '/main.c', line: 42 } }],
                ['remove_breakpoint', { location: { path: '/main.c', line: 42 } }],
                ['set_temp_breakpoint', { location: { path: '/main.c', line: 42 } }],
                ['goto_frame', { frameId: 0 }],
                ['evaluate', { expression: 'iteration' }],
                ['pretty_print', { expression: 'iteration' }],
                ['whatis', { expression: 'iteration' }],
                ['execute_statement', { statement: 'info locals' }],
                ['get_source', { expression: 'main' }],
                ['list_source', {}],
                ['switch_thread', { threadId: 1 }],
                ['read_memory', { memoryReference: '0x1000', count: 4 }],
                ['jump', { line: 42 }],
                ['until', { line: 50 }],
                ['attach', { processId: 1234 }],
                ['remove_all_breakpoints_in_file', { filePath: '/main.c' }],
                ['get_registers', {}],
                ['write_memory', { address: 0x1000 }],
                ['launch', { program: '/bin/test' }],
            ] as Array<[string, any]>;

            const start = performance.now();
            for (const [op, args] of operations) {
                const result = validateOperationArgs(op, args);
                expect(result.isValid, `${op} should be valid`).toBe(true);
            }
            const elapsed = performance.now() - start;
            expect(elapsed).toBeLessThan(5);
        });

        it('P3.2: 1000 rapid-fire validation calls in < 20ms', () => {
            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                validateOperationArgs('evaluate', { expression: `var_${i}` });
            }
            const elapsed = performance.now() - start;
            expect(elapsed).toBeLessThan(20);
        });

    });

    // ── P4: Memory Stability ─────────────────────────────────────────────────

    describe('P4: Memory Stability', () => {

        it('P4.1: 500 consecutive router calls do not grow heap > 5MB', async () => {
            const heapBefore = process.memoryUsage().heapUsed;

            for (let i = 0; i < 500; i++) {
                await handleRequest('GET', '/api/ping', {}, req());
            }

            // Force GC if available
            if (global.gc) { global.gc(); }

            const heapAfter = process.memoryUsage().heapUsed;
            const growthMB = (heapAfter - heapBefore) / (1024 * 1024);

            // Allow up to 5MB heap growth for 500 pings
            expect(growthMB).toBeLessThan(5);
        });

        it('P4.2: MI2 parser does not retain references after parsing', () => {
            // Parse 1000 lines and verify no memory explosion
            const heapBefore = process.memoryUsage().heapUsed;
            for (let i = 0; i < 1000; i++) {
                parseMI(`1^done,value="${i}",type="int"`);
            }
            if (global.gc) { global.gc(); }
            const heapAfter = process.memoryUsage().heapUsed;
            const growthMB = (heapAfter - heapBefore) / (1024 * 1024);
            expect(growthMB).toBeLessThan(2);
        });

    });

});
