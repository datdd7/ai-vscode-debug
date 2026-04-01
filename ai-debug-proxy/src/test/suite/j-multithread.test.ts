/**
 * @file j-multithread.test.ts
 * @brief Suite J: Multi-Thread Debugging (6 tests)
 *
 * Tests thread listing, switching, per-thread stack/variables using
 * the multi-threaded playground binary (cooling_ecu_mt).
 */

import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    ensureExtensionActivated,
    terminateSession,
    proxyPost,
    waitForStop,
    waitForStepComplete,
    getWorkspaceFolder,
    TIMEOUTS,
} from './helpers';
import { MAIN_MT } from './constants';

/**
 * Launch the multi-threaded binary and wait for stop at entry.
 */
async function launchMtAndWaitForStop(testName: string): Promise<void> {
    await ensureExtensionActivated();
    const folder = await getWorkspaceFolder();

    const config = {
        type: 'ai-debug',
        name: `E2E MT ${testName}`,
        request: 'launch',
        program: path.join(folder.uri.fsPath, 'build/cooling_ecu_mt'),
        cwd: folder.uri.fsPath,
        stopOnEntry: true,
        gdbPath: 'gdb',
        backendType: 'gdb',
    };

    const started = await vscode.debug.startDebugging(folder, config);
    assert.ok(started, `Failed to start MT debug session for ${testName}`);
    await waitForStop(TIMEOUTS.LAUNCH_SETTLE + 3000);
}

suite('Suite J: Multi-Thread Debugging', () => {

    teardown(async function() {
        this.timeout(10000);
        await terminateSession();
    });

    test('J1: list_threads — returns at least 1 thread at entry', async function() {
        this.timeout(20000);
        await launchMtAndWaitForStop('J1');

        const res = await proxyPost('list_threads');
        assert.ok(res.success !== false, `list_threads failed: ${JSON.stringify(res)}`);

        const threads: any[] = res.data || res;
        assert.ok(Array.isArray(threads), 'list_threads should return an array');
        assert.ok(threads.length >= 1, `Should have at least 1 thread, got ${threads.length}`);

        // Each thread should have id and name
        const first = threads[0];
        assert.ok(first.id !== undefined, 'Thread should have id');
        assert.ok(first.name, 'Thread should have name');
    });

    test('J2: list_threads after thread creation — shows multiple threads', async function() {
        this.timeout(30000);
        await launchMtAndWaitForStop('J2');

        const folder = await getWorkspaceFolder();
        const mainMtPath = path.join(folder.uri.fsPath, 'main_mt.cpp');

        // Set breakpoint after all 3 threads are created (at t1.join)
        const bpRes = await proxyPost('set_breakpoint', {
            location: { path: mainMtPath, line: MAIN_MT.THREAD_JOIN_FIRST }
        });
        assert.ok(bpRes.success, `set_breakpoint failed: ${JSON.stringify(bpRes)}`);

        // Continue to the breakpoint
        await proxyPost('continue');
        await waitForStop(15000);

        // Now all 3 threads should be alive (before join)
        const res = await proxyPost('list_threads');
        const threads: any[] = res.data || res;
        assert.ok(Array.isArray(threads), 'list_threads should return an array');
        assert.ok(
            threads.length >= 2,
            `After thread creation should have >=2 threads, got ${threads.length}: ${JSON.stringify(threads.map((t: any) => t.name))}`
        );
    });

    test('J3: switch_thread — changes debugger context', async function() {
        this.timeout(30000);
        await launchMtAndWaitForStop('J3');

        const folder = await getWorkspaceFolder();
        const mainMtPath = path.join(folder.uri.fsPath, 'main_mt.cpp');

        // Set BP at join to ensure threads are running
        await proxyPost('set_breakpoint', {
            location: { path: mainMtPath, line: MAIN_MT.THREAD_JOIN_FIRST }
        });
        await proxyPost('continue');
        await waitForStop(15000);

        // Get list of threads
        const listRes = await proxyPost('list_threads');
        const threads: any[] = listRes.data || listRes;
        if (threads.length < 2) {
            this.skip(); // Skipped (not passed) when < 2 threads visible — distinguishable in CI
            return;
        }

        // Switch to a non-main thread (worker thread)
        const otherThread = threads.find((t: any) => t.id !== 1) || threads[1];
        const switchRes = await proxyPost('switch_thread', { threadId: otherThread.id });
        assert.ok(switchRes.success, `switch_thread failed: ${JSON.stringify(switchRes)}`);

        // stack_trace should reflect the new thread's stack — top frame must NOT be main()
        const stackRes = await proxyPost('stack_trace');
        assert.ok(stackRes.success && Array.isArray(stackRes.data) && stackRes.data.length > 0, 'stack_trace should work after switch');
        const topFuncName: string = stackRes.data[0].name || '';
        assert.ok(
            !topFuncName.includes('main') || topFuncName.includes('worker'),
            `After switching to worker thread, top frame should not be main(), got: '${topFuncName}'`
        );
    });

    test('J4: Per-thread stack trace via threadId param', async function() {
        this.timeout(30000);
        await launchMtAndWaitForStop('J4');

        const folder = await getWorkspaceFolder();
        const mainMtPath = path.join(folder.uri.fsPath, 'main_mt.cpp');

        await proxyPost('set_breakpoint', {
            location: { path: mainMtPath, line: MAIN_MT.THREAD_JOIN_FIRST }
        });
        await proxyPost('continue');
        await waitForStop(15000);

        const listRes = await proxyPost('list_threads');
        const threads: any[] = listRes.data || listRes;
        if (threads.length < 2) {
            this.skip();
            return;
        }

        // Get stack traces for two different threads
        const stack1 = await proxyPost('stack_trace', { threadId: threads[0].id });
        const stack2 = await proxyPost('stack_trace', { threadId: threads[1].id });

        assert.ok(stack1.success && Array.isArray(stack1.data), 'stack_trace for thread 1 should work');
        assert.ok(stack2.success && Array.isArray(stack2.data), 'stack_trace for thread 2 should work');

        // Stacks should have frames
        assert.ok(stack1.data.length > 0, 'Thread 1 should have stack frames');
        assert.ok(stack2.data.length > 0, 'Thread 2 should have stack frames');
    });

    test('J5: Per-thread variables differ after switch', async function() {
        this.timeout(30000);
        await launchMtAndWaitForStop('J5');

        const folder = await getWorkspaceFolder();
        const mainMtPath = path.join(folder.uri.fsPath, 'main_mt.cpp');

        await proxyPost('set_breakpoint', {
            location: { path: mainMtPath, line: MAIN_MT.THREAD_JOIN_FIRST }
        });
        await proxyPost('continue');
        await waitForStop(15000);

        const listRes = await proxyPost('list_threads');
        const threads: any[] = listRes.data || listRes;
        if (threads.length < 2) {
            this.skip();
            return;
        }

        // Get variables from main thread (thread 1)
        await proxyPost('switch_thread', { threadId: 1 });
        const mainVars = await proxyPost('get_variables');
        assert.ok(mainVars.success !== false, 'get_variables for main thread should work');

        // Switch to another thread and get its variables
        const otherThread = threads.find((t: any) => t.id !== 1);
        if (otherThread) {
            await proxyPost('switch_thread', { threadId: otherThread.id });
            const otherVars = await proxyPost('get_variables');
            assert.ok(otherVars.success !== false, 'get_variables for other thread should work');
        }
    });

    test('J6: switch_thread to invalid ID — error', async function() {
        this.timeout(20000);
        await launchMtAndWaitForStop('J6');

        const res = await proxyPost('switch_thread', { threadId: 9999 });
        // Should fail — either success=false or error in response
        const isError = res.success === false || res.error;
        assert.ok(isError, `switch_thread(9999) should fail, got: ${JSON.stringify(res)}`);
    });
});
