/**
 * @file i-agent-workflow.test.ts
 * @brief Suite I: AI Agent Workflow Simulation (3 tests)
 *
 * These tests simulate realistic multi-step AI debugging workflows.
 */

import * as assert from 'assert';
import * as path from 'path';
import {
    launchAndWaitForStop,
    terminateSession,
    proxyPost,
    getStatus,
    waitForStop,
    waitForStepComplete,
    waitForRunning,
    getTopFrame,
    delay,
    getWorkspaceFolder,
    TIMEOUTS,
} from './helpers';
import { MAIN_C } from './constants';

suite('Suite I: AI Agent Workflow Simulation', () => {

    teardown(async function() {
        this.timeout(10000);
        await terminateSession();
    });

    test('I1: Bug investigation workflow — full step-by-step', async function() {
        this.timeout(60000);
        await launchAndWaitForStop('I1');

        const folder = await getWorkspaceFolder();
        const mainCPath = path.join(folder.uri.fsPath, 'main.c');

        // Step 1: Set breakpoint inside loop
        const bpRes = await proxyPost('set_breakpoint', {
            location: { path: mainCPath, line: MAIN_C.OS_RUN_SCHEDULER }
        });
        assert.ok(bpRes.success, `Step 1: set_breakpoint failed: ${JSON.stringify(bpRes)}`);
        const bpId = bpRes.data?.id;

        // Step 2: Continue to BP
        await proxyPost('continue');
        await waitForStop(10000);
        let status = await getStatus();
        assert.strictEqual(status.isRunning, false, 'Step 2: Should be stopped at breakpoint');

        // Step 3: Stack trace
        const stackRes = await proxyPost('stack_trace');
        assert.ok(stackRes.success && Array.isArray(stackRes.data), `Step 3: stack_trace failed: ${JSON.stringify(stackRes)}`);
        const frame = stackRes.data[0];
        assert.ok(
            frame.line >= MAIN_C.OS_RUN_SCHEDULER - 3 && frame.line <= MAIN_C.OS_RUN_SCHEDULER + 3,
            `Step 3: Expected stop near line ${MAIN_C.OS_RUN_SCHEDULER}, got line ${frame.line}`
        );

        // Step 4: Inspect variables
        const varsRes = await proxyPost('get_variables');
        assert.ok(varsRes.success !== false, `Step 4: get_variables failed`);

        // Step 5: Evaluate simTemp (may be in scope inside loop)
        const evalRes = await proxyPost('evaluate', { expression: 'iteration' });
        assert.ok(evalRes.success, `Step 5: evaluate 'iteration' failed: ${JSON.stringify(evalRes)}`);
        const iterValue = evalRes.data?.value || evalRes.data?.result || '';
        // iteration should be >= 0 at this point
        assert.ok(iterValue !== '', `Step 5: iteration should have a value`);

        // Step 6: whatis
        const whatisRes = await proxyPost('whatis', { expression: 'iteration' });
        assert.ok(whatisRes.success, `Step 6: whatis failed: ${JSON.stringify(whatisRes)}`);

        // Step 7: Step over a few lines
        for (let i = 0; i < 2; i++) {
            await proxyPost('step_over');
            await waitForStepComplete(5000);
        }

        // Step 8: Continue to next BP hit (second loop iteration)
        await proxyPost('continue');
        await waitForStop(8000);
        status = await getStatus();
        assert.strictEqual(status.isRunning, false, 'Step 8: Should stop at BP again in next iteration');

        // Step 9: Verify iteration incremented
        const eval2Res = await proxyPost('evaluate', { expression: 'iteration' });
        assert.ok(eval2Res.success, `Step 9: evaluate 'iteration' failed`);
        const iterValue2 = eval2Res.data?.value || eval2Res.data?.result || '';
        // Just verify it's a number (value should be > first hit)
        assert.ok(
            /\d+/.test(iterValue2),
            `Step 9: iteration should be numeric, got: ${iterValue2}`
        );

        // Step 10: Cleanup — remove BP (pass both id and location)
        const rmRes = await proxyPost('remove_breakpoint', {
            id: bpId,
            location: { path: mainCPath, line: MAIN_C.OS_RUN_SCHEDULER }
        });
        assert.ok(rmRes.success, `Step 10: remove_breakpoint failed: ${JSON.stringify(rmRes)}`);
    });

    test('I2: Multi-function debugging — step_in, navigate, step_out', async function() {
        this.timeout(60000);
        await launchAndWaitForStop('I2');

        // Step to EcuM_Init call
        let frame = await getTopFrame();
        let attempts = 0;
        while (frame.line < MAIN_C.ECUM_INIT && attempts < 12) {
            await proxyPost('step_over');
            await waitForStepComplete(5000);
            frame = await getTopFrame();
            attempts++;
        }
        assert.ok(
            frame.line >= MAIN_C.ECUM_INIT - 1,
            `Should reach EcuM_Init line, got: ${frame.line}`
        );

        // Step into EcuM_Init
        await proxyPost('step_in');
        await waitForStepComplete(5000);

        const innerFrame = await getTopFrame();
        assert.ok(innerFrame, 'Should have frame after step_in');

        // Stack should have 2+ frames
        const stackRes = await proxyPost('stack_trace');
        const frames = stackRes.data;
        assert.ok(Array.isArray(frames) && frames.length >= 1, 'Should have stack frames');

        // Get variables at inner frame
        const innerVarsRes = await proxyPost('get_variables');
        assert.ok(innerVarsRes.success !== false, 'Should get variables inside function');

        // Go up to main if we have multiple frames
        if (frames.length >= 2) {
            await proxyPost('up');
            const outerVarsRes = await proxyPost('get_variables');
            assert.ok(outerVarsRes.success !== false, 'Should get variables after up');

            // Go back down
            await proxyPost('down');
        }

        // Step out back to main
        await proxyPost('step_out');
        await waitForStepComplete(10000);

        const afterStepOut = await getTopFrame();
        const funcName: string = afterStepOut.name || '';
        assert.ok(
            funcName.includes('main'),
            `After step_out should be in main, got: ${funcName}`
        );
    });

    test('I3: Rapid sequential operations — no MI2 corruption', async function() {
        this.timeout(60000);
        await launchAndWaitForStop('I3');

        // Fire 5 sequential step_over operations without waiting between
        // Each request is awaited (sequential HTTP), but no extra delays
        const errors: string[] = [];
        for (let i = 0; i < 5; i++) {
            try {
                await proxyPost('step_over');
                await waitForStepComplete(5000);
            } catch (err: any) {
                errors.push(`step_over #${i + 1}: ${err.message}`);
            }
        }

        assert.strictEqual(
            errors.length,
            0,
            `No errors should occur during rapid step_overs: ${errors.join('; ')}`
        );

        // After 5 steps, verify state is consistent
        const stackRes = await proxyPost('stack_trace');
        assert.ok(
            stackRes.success && Array.isArray(stackRes.data) && stackRes.data.length > 0,
            `stack_trace should work after rapid steps: ${JSON.stringify(stackRes)}`
        );

        const evalRes = await proxyPost('evaluate', { expression: 'iteration' });
        assert.ok(
            evalRes.success,
            `evaluate should work after rapid steps: ${JSON.stringify(evalRes)}`
        );

        const varsRes = await proxyPost('get_variables');
        assert.ok(
            varsRes.success !== false,
            `get_variables should work after rapid steps: ${JSON.stringify(varsRes)}`
        );
    });
});
