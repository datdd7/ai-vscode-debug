/**
 * @file h-validation-errors.test.ts
 * @brief Suite H: Input Validation & Error Resilience (12 tests)
 *
 * Tests H1-H3, H6-H9 do NOT need a debug session (server-level validation).
 * Tests H4-H5, H10-H12 need an active session.
 */

import * as assert from 'assert';
import axios from 'axios';
import {
    PORT,
    PROXY_URL,
    proxyPost,
    proxyPostRaw,
    proxyPostExpectError,
    launchAndWaitForStop,
    terminateSession,
} from './helpers';

suite('Suite H: Validation & Error Resilience', () => {

    test('H1: Missing operation field returns error', async function() {
        this.timeout(10000);
        // No session needed — server validates before touching backend
        const result = await proxyPostRaw({});
        // The router returns 400 for missing operation
        assert.ok(
            result.status >= 400,
            `Expected 4xx, got ${result.status}`
        );
        const errMsg = result.data?.error || result.data?.message || JSON.stringify(result.data);
        assert.ok(
            errMsg.toLowerCase().includes('operation') || errMsg.toLowerCase().includes('missing') || errMsg.toLowerCase().includes('invalid'),
            `Error should mention 'operation': ${errMsg}`
        );
    });

    test('H2: Unknown operation name returns 400', async function() {
        this.timeout(10000);
        const result = await proxyPostExpectError('fly_to_moon');
        assert.strictEqual(result.status, 400, `Expected HTTP 400, got ${result.status}`);
        const errMsg = result.data?.error || result.data?.message || JSON.stringify(result.data);
        assert.ok(
            errMsg.toLowerCase().includes('unknown') || errMsg.toLowerCase().includes('fly_to_moon'),
            `Error should mention unknown operation: ${errMsg}`
        );
    });

    test('H3: set_breakpoint without params returns 400', async function() {
        this.timeout(10000);
        const result = await proxyPostExpectError('set_breakpoint');
        assert.strictEqual(result.status, 400, `Expected HTTP 400, got ${result.status}`);
        const errMsg = result.data?.error || result.data?.message || JSON.stringify(result.data);
        assert.ok(
            errMsg.toLowerCase().includes('location') || errMsg.toLowerCase().includes('requires'),
            `Error should mention 'location': ${errMsg}`
        );
    });

    test('H4: Path traversal in expression — no /etc/passwd leak', async function() {
        this.timeout(25000);
        // Need a session for this operation to reach the backend
        await launchAndWaitForStop('H4');
        try {
            const result = await proxyPostExpectError('get_source', { expression: '../../../etc/passwd' });
            // Should either fail or return something that is NOT the content of /etc/passwd
            const bodyStr = JSON.stringify(result.data);
            assert.ok(
                !bodyStr.includes('root:x:') && !bodyStr.includes('/bin/bash'),
                `Response should NOT contain /etc/passwd contents: ${bodyStr.substring(0, 200)}`
            );
        } finally {
            await terminateSession();
        }
    });

    test('H5: Error responses do not contain server file paths (ADP-024)', async function() {
        this.timeout(25000);
        // Trigger an error that might expose internal paths
        await launchAndWaitForStop('H5');
        try {
            // Evaluate a deeply invalid expression to trigger GDB error with potential path info
            const result = await proxyPostExpectError('evaluate', { expression: '****syntax_error_xyz****' });
            const bodyStr = JSON.stringify(result.data);
            // ADP-024: error must not contain home directory paths
            const homePathRegex = /\/home\/[^/]+\//;
            assert.ok(
                !homePathRegex.test(bodyStr),
                `Error response must NOT contain /home/... paths (ADP-024): ${bodyStr.substring(0, 300)}`
            );
        } finally {
            await terminateSession();
        }
    });

    // ── H6-H12: Additional negative cases ───────────────────────────────────

    test('H6: Operations without active session return error', async function() {
        this.timeout(10000);
        // Ensure no session is active (no setup in this test)
        // Calling a backend-requiring operation should fail gracefully
        const res = await proxyPost('stack_trace');
        // Should fail — no session active. Either success=false or HTTP error
        const succeeded = res.success === true;
        assert.ok(
            !succeeded,
            `stack_trace without session should fail, got: ${JSON.stringify(res)}`
        );
    });

    test('H7: jump without line param returns 400', async function() {
        this.timeout(10000);
        // jump requires 'line' (number) — missing it must fail at validation
        const result = await proxyPostExpectError('jump', { file: 'main.c' });
        assert.strictEqual(result.status, 400, `Expected HTTP 400, got ${result.status}`);
        const errMsg = result.data?.error || result.data?.message || JSON.stringify(result.data);
        assert.ok(
            errMsg.toLowerCase().includes('line') || errMsg.toLowerCase().includes('requires'),
            `Error should mention 'line': ${errMsg}`
        );
    });

    test('H8: goto_frame with non-numeric frameId returns 400', async function() {
        this.timeout(10000);
        // goto_frame requires frameId as number — string should fail validation
        const result = await proxyPostExpectError('goto_frame', { frameId: 'top' });
        assert.strictEqual(result.status, 400, `Expected HTTP 400, got ${result.status}`);
        const errMsg = result.data?.error || result.data?.message || JSON.stringify(result.data);
        assert.ok(
            errMsg.toLowerCase().includes('frameid') || errMsg.toLowerCase().includes('number'),
            `Error should mention frameId/number: ${errMsg}`
        );
    });

    test('H9: remove_all_breakpoints_in_file without filePath returns 400', async function() {
        this.timeout(10000);
        const result = await proxyPostExpectError('remove_all_breakpoints_in_file', {});
        assert.strictEqual(result.status, 400, `Expected HTTP 400, got ${result.status}`);
        const errMsg = result.data?.error || result.data?.message || JSON.stringify(result.data);
        assert.ok(
            errMsg.toLowerCase().includes('filepath') || errMsg.toLowerCase().includes('string'),
            `Error should mention filePath: ${errMsg}`
        );
    });

    test('H10: evaluate without expression returns 400', async function() {
        this.timeout(10000);
        // evaluate requires 'expression' (string) — missing it must fail validation
        const result = await proxyPostExpectError('evaluate', {});
        assert.strictEqual(result.status, 400, `Expected HTTP 400, got ${result.status}`);
        const errMsg = result.data?.error || result.data?.message || JSON.stringify(result.data);
        assert.ok(
            errMsg.toLowerCase().includes('expression') || errMsg.toLowerCase().includes('requires'),
            `Error should mention 'expression': ${errMsg}`
        );
    });

    test('H11: switch_thread without threadId returns 400', async function() {
        this.timeout(10000);
        // switch_thread requires threadId (number) — missing it must fail validation
        const result = await proxyPostExpectError('switch_thread', {});
        assert.strictEqual(result.status, 400, `Expected HTTP 400, got ${result.status}`);
        const errMsg = result.data?.error || result.data?.message || JSON.stringify(result.data);
        assert.ok(
            errMsg.toLowerCase().includes('threadid') || errMsg.toLowerCase().includes('number'),
            `Error should mention threadId: ${errMsg}`
        );
    });

    test('H12: whatis without expression returns 400', async function() {
        this.timeout(10000);
        // whatis requires 'expression' string
        const result = await proxyPostExpectError('whatis', {});
        assert.strictEqual(result.status, 400, `Expected HTTP 400, got ${result.status}`);
        const errMsg = result.data?.error || result.data?.message || JSON.stringify(result.data);
        assert.ok(
            errMsg.toLowerCase().includes('expression') || errMsg.toLowerCase().includes('requires'),
            `Error should mention 'expression': ${errMsg}`
        );
    });
});
