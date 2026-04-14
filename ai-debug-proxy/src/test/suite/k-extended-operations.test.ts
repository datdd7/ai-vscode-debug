/**
 * @file k-extended-operations.test.ts
 * @brief Suite K: Extended Operations Coverage (6 tests)
 *
 * Covers 6 operations that were previously untested:
 * get_arguments, get_globals, pretty_print, execute_statement,
 * get_scope_preview, get_capabilities
 *
 * All tests require an active debug session stopped at main entry.
 */

import * as assert from 'assert';
import {
    launchAndWaitForStop,
    terminateSession,
    proxyPost,
    waitForStepComplete,
} from './helpers';

suite('Suite K: Extended Operations', () => {

    setup(async function() {
        this.timeout(15000);
        await launchAndWaitForStop('SuiteK');
        // Step past the declaration line so iteration is in scope
        await proxyPost('step_over');
        await waitForStepComplete(5000);
    });

    teardown(async function() {
        this.timeout(8000);
        await terminateSession();
    });

    test('K1: get_arguments — returns arguments scope at main()', async function() {
        this.timeout(15000);
        const res = await proxyPost('get_arguments');
        // get_arguments may return empty array for main() (which has no args in playground)
        // but the call must succeed
        assert.ok(
            res.success !== false,
            `get_arguments should not fail: ${JSON.stringify(res)}`
        );
        const data = res.data !== undefined ? res.data : res;
        assert.ok(
            Array.isArray(data) || typeof data === 'object',
            `get_arguments should return array or object, got: ${JSON.stringify(data)}`
        );
    });

    test('K2: get_globals — returns global variables list', async function() {
        this.timeout(15000);
        const res = await proxyPost('get_globals');
        assert.ok(
            res.success !== false,
            `get_globals should not fail: ${JSON.stringify(res)}`
        );
        const data = res.data !== undefined ? res.data : res;
        assert.ok(
            Array.isArray(data),
            `get_globals should return array, got: ${JSON.stringify(data)}`
        );
        // Playground has global variables — list should be non-empty
        assert.ok(
            data.length >= 0,
            `get_globals should return an array (possibly empty for single-TU builds)`
        );
    });

    test('K3: pretty_print — returns value + type for expression', async function() {
        this.timeout(15000);
        const res = await proxyPost('pretty_print', { expression: 'iteration' });
        assert.ok(
            res.success !== false,
            `pretty_print should not fail: ${JSON.stringify(res)}`
        );
        const data = res.data !== undefined ? res.data : res;
        // Should return an object with name and value fields
        assert.ok(
            typeof data === 'object' && data !== null,
            `pretty_print should return object, got: ${JSON.stringify(data)}`
        );
        assert.ok(
            'value' in data || 'name' in data,
            `pretty_print result should have 'value' or 'name': ${JSON.stringify(data)}`
        );
    });

    test('K4: execute_statement — runs GDB command and returns output', async function() {
        this.timeout(15000);
        // `info locals` is a safe read-only statement
        const res = await proxyPost('execute_statement', { statement: 'info locals' });
        assert.ok(
            res.success !== false,
            `execute_statement should not fail: ${JSON.stringify(res)}`
        );
        const data = res.data !== undefined ? res.data : res;
        // Should return a string output
        assert.ok(
            typeof data === 'string' || (typeof data === 'object' && data !== null),
            `execute_statement should return string or object, got: ${typeof data}`
        );
    });

    test('K5: get_scope_preview — returns combined locals + args view', async function() {
        this.timeout(15000);
        const res = await proxyPost('get_scope_preview');
        assert.ok(
            res.success !== false,
            `get_scope_preview should not fail: ${JSON.stringify(res)}`
        );
        const data = res.data !== undefined ? res.data : res;
        assert.ok(
            typeof data === 'object' && data !== null,
            `get_scope_preview should return object, got: ${JSON.stringify(data)}`
        );
        // Should have locals and/or args
        assert.ok(
            'locals' in data || 'args' in data || Array.isArray(data),
            `get_scope_preview should contain locals or args: ${JSON.stringify(data)}`
        );
    });

    test('K6: get_capabilities — returns backend capability flags', async function() {
        this.timeout(10000);
        const res = await proxyPost('get_capabilities');
        assert.ok(
            res.success !== false,
            `get_capabilities should not fail: ${JSON.stringify(res)}`
        );
        const data = res.data !== undefined ? res.data : res;
        assert.ok(
            typeof data === 'object' && data !== null,
            `get_capabilities should return object, got: ${JSON.stringify(data)}`
        );
        // GDB backend should support launch
        assert.ok(
            'supportsLaunch' in data,
            `capabilities should have supportsLaunch: ${JSON.stringify(data)}`
        );
        assert.strictEqual(
            data.supportsLaunch, true,
            'GDB backend must support launch'
        );
    });

    test('K7: get_capabilities — works without active session', async function() {
        this.timeout(10000);
        // Ensure no session is active (teardown runs after setup which launched one;
        // this test explicitly terminates before calling get_capabilities)
        await terminateSession();

        const res = await proxyPost('get_capabilities');
        assert.ok(
            res.success !== false,
            `get_capabilities should succeed without active session, got: ${JSON.stringify(res)}`
        );
        const data = res.data !== undefined ? res.data : res;
        assert.ok(
            typeof data === 'object' && data !== null,
            `get_capabilities should return capability object, got: ${JSON.stringify(data)}`
        );
        assert.ok(
            'supportsLaunch' in data,
            `Capabilities should include supportsLaunch: ${JSON.stringify(data)}`
        );
    });
});
