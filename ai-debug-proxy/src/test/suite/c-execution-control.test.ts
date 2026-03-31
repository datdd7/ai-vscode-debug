/**
 * @file c-execution-control.test.ts
 * @brief Suite C: Execution Control (6 tests)
 */

import * as assert from 'assert';
import * as path from 'path';
import {
    launchAndWaitForStop,
    terminateSession,
    proxyPost,
    getStatus,
    assertStopped,
    assertRunning,
    waitForStop,
    waitForStepComplete,
    waitForRunning,
    getTopFrame,
    delay,
    getWorkspaceFolder,
    TIMEOUTS,
} from './helpers';
import { MAIN_C } from './constants';

suite('Suite C: Execution Control', () => {

    setup(async function() {
        this.timeout(12000);
        await launchAndWaitForStop('SuiteC');
    });

    teardown(async function() {
        this.timeout(8000);
        await terminateSession();
    });

    test('C1: step_over — advances line, stays in main', async function() {
        this.timeout(15000);
        // Get initial line
        const before = await getTopFrame();
        const beforeLine: number = before.line;

        // Step over a few times to advance past any blank lines
        for (let i = 0; i < 3; i++) {
            await proxyPost('step_over');
            await waitForStepComplete(5000);
        }

        const after = await getTopFrame();
        const afterLine: number = after.line;
        assert.ok(
            afterLine > beforeLine,
            `Line should advance after step_over. Before: ${beforeLine}, After: ${afterLine}`
        );
        const funcName: string = after.name || '';
        assert.ok(
            funcName.includes('main'),
            `Should still be in main after step_over, got: ${funcName}`
        );
    });

    test('C2: step_in — enters function', async function() {
        this.timeout(20000);
        // step_over until we reach EcuM_Init (line 39) call
        // Launch stops at first executable line ~33-34
        // Step a few times to reach EcuM_Init
        let frame = await getTopFrame();
        let attempts = 0;
        while (frame.line < MAIN_C.ECUM_INIT && attempts < 10) {
            await proxyPost('step_over');
            await waitForStepComplete(5000);
            frame = await getTopFrame();
            attempts++;
        }

        // Now step_in — should enter EcuM_Init
        await proxyPost('step_in');
        await waitForStepComplete(5000);

        const newFrame = await getTopFrame();
        const newFunc: string = newFrame.name || '';
        assert.ok(
            !newFunc.includes('main') || newFrame.line > MAIN_C.ECUM_INIT + 2,
            `step_in should enter a function body, got frame: ${JSON.stringify(newFrame)}`
        );
    });

    test('C3: step_out — returns to caller', async function() {
        this.timeout(30000);
        // Step into EcuM_Init
        let frame = await getTopFrame();
        let attempts = 0;
        while (frame.line < MAIN_C.ECUM_INIT && attempts < 10) {
            await proxyPost('step_over');
            await waitForStepComplete(5000);
            frame = await getTopFrame();
            attempts++;
        }

        await proxyPost('step_in');
        await waitForStepComplete(5000);

        const insideFrame = await getTopFrame();
        const insideFunc: string = insideFrame.name || '';

        // Step out
        await proxyPost('step_out');
        await waitForStepComplete(10000);

        const backFrame = await getTopFrame();
        const backFunc: string = backFrame.name || '';
        assert.ok(
            backFunc.includes('main'),
            `step_out should return to main, got: ${backFunc}. Was inside: ${insideFunc}`
        );
    });

    test('C4: until — runs to specific line', async function() {
        this.timeout(20000);
        const targetLine = MAIN_C.ECUM_STARTUP_TWO;

        // Use 'until' to run to a line in the init sequence
        await proxyPost('until', { line: targetLine });
        await waitForStepComplete(10000);

        const frame = await getTopFrame();
        assert.ok(
            frame.line >= targetLine - 2 && frame.line <= targetLine + 5,
            `Expected to stop near line ${targetLine}, got line ${frame.line}`
        );
    });

    test('C5: continue + pause round-trip — consistent state transitions', async function() {
        this.timeout(20000);
        // Round 1: continue -> verify running -> pause -> verify stopped
        await proxyPost('continue');
        await waitForRunning(5000);
        await assertRunning('Round 1: Should be running after continue');

        await proxyPost('pause');
        await waitForStop(5000);
        await assertStopped('Round 1: Should be stopped after pause');

        // Round 2: repeat
        await proxyPost('continue');
        await waitForRunning(5000);
        await assertRunning('Round 2: Should be running after continue');

        await proxyPost('pause');
        await waitForStop(5000);
        await assertStopped('Round 2: Should be stopped after pause');
    });

    test('C6: Operations while program is running — graceful handling', async function() {
        this.timeout(20000);
        // Let program run
        await proxyPost('continue');
        await waitForRunning(5000);

        // Try stack_trace while running — should return error or auto-pause
        const res = await proxyPost('stack_trace');

        // Two valid outcomes:
        // 1. Error (success=false or error field) — graceful failure
        // 2. Success — extension auto-paused, got frames
        const isError = res.success === false || res.error;
        const isSuccess = res.success === true && Array.isArray(res.data) && res.data.length > 0;

        assert.ok(
            isError || isSuccess,
            `Expected either error or valid frames while running, got: ${JSON.stringify(res)}`
        );

        // Ensure we can pause afterwards (clean state)
        const status = await getStatus();
        if (status.isRunning) {
            await proxyPost('pause');
            await waitForStop(5000);
        }
    });
});
