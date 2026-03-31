/**
 * @file a-session-lifecycle.test.ts
 * @brief Suite A: Session Lifecycle (5 tests)
 *
 * Tests launch, terminate, restart, re-launch cycle, and operations
 * after session termination.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import {
    launchAndWaitForStop,
    terminateSession,
    getStatus,
    proxyPost,
    waitForStop,
    waitForSessionEnd,
    delay,
    TIMEOUTS,
} from './helpers';

suite('Suite A: Session Lifecycle', () => {

    teardown(async function() {
        this.timeout(8000);
        await terminateSession();
    });

    test('A1: Launch with stopOnEntry — session active and stopped', async function() {
        this.timeout(20000);
        await launchAndWaitForStop('A1');
        const status = await getStatus();
        assert.strictEqual(status.hasActiveSession, true, 'Session should be active after launch');
        assert.strictEqual(status.isRunning, false, 'Debugger should be stopped at entry');
    });

    test('A2: Terminate active session — cleanup confirmed', async function() {
        this.timeout(20000);
        await launchAndWaitForStop('A2');

        // Verify active before terminating
        let status = await getStatus();
        assert.strictEqual(status.hasActiveSession, true, 'Session should be active before terminate');

        // Terminate and wait for cleanup
        await vscode.debug.stopDebugging();
        await waitForSessionEnd(6000);

        status = await getStatus();
        assert.strictEqual(status.hasActiveSession, false, 'Session should be cleaned up after terminate');
    });

    test('A3: Restart mid-session — re-stopped at main', async function() {
        this.timeout(30000);
        await launchAndWaitForStop('A3');

        // Restart
        const restartRes = await proxyPost('restart');
        // Restart sends a new launch — wait for it to stop again
        await waitForStop(10000);

        const status = await getStatus();
        assert.strictEqual(status.isRunning, false, 'Should be stopped after restart');
        assert.strictEqual(status.hasActiveSession, true, 'Session should still be active after restart');

        // Verify we are back near main entry
        const stackRes = await proxyPost('stack_trace');
        const frames = stackRes.data;
        assert.ok(Array.isArray(frames) && frames.length > 0, 'Should have stack frames after restart');
        const topFrame = frames[0];
        const funcName: string = topFrame.name || '';
        assert.ok(
            funcName.includes('main') || topFrame.line <= 40,
            `Expected to be back near main after restart, got: ${JSON.stringify(topFrame)}`
        );
    });

    test('A4: Sequential terminate + re-launch — second session works', async function() {
        this.timeout(35000);
        // Launch session #1
        await launchAndWaitForStop('A4-first');

        // Terminate session #1 and wait for cleanup
        await vscode.debug.stopDebugging();
        await waitForSessionEnd(6000);

        let status = await getStatus();
        assert.strictEqual(status.hasActiveSession, false, 'First session should be terminated');

        // Launch session #2
        await launchAndWaitForStop('A4-second');

        status = await getStatus();
        assert.strictEqual(status.hasActiveSession, true, 'Second session should be active');
        assert.strictEqual(status.isRunning, false, 'Second session should be stopped at entry');
    });

    test('A5: Operations after session terminated — return error', async function() {
        this.timeout(25000);
        await launchAndWaitForStop('A5');

        // Terminate
        await vscode.debug.stopDebugging();
        await delay(TIMEOUTS.SESSION_CLEANUP * 2);

        // Attempt an operation — should fail gracefully
        const res = await proxyPost('stack_trace');
        // Either success=false or an error field present
        const hasError = res.success === false || res.error || (!res.data);
        assert.ok(hasError, `Expected error when no session active, got: ${JSON.stringify(res)}`);
    });
});
