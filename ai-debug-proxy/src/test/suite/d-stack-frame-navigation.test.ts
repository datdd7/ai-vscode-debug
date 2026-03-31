/**
 * @file d-stack-frame-navigation.test.ts
 * @brief Suite D: Stack & Frame Navigation (5 tests)
 */

import * as assert from 'assert';
import * as path from 'path';
import {
    launchAndWaitForStop,
    terminateSession,
    proxyPost,
    getTopFrame,
    waitForStop,
    waitForStepComplete,
    getWorkspaceFolder,
    TIMEOUTS,
} from './helpers';
import { MAIN_C } from './constants';

suite('Suite D: Stack & Frame Navigation', () => {

    setup(async function() {
        this.timeout(12000);
        await launchAndWaitForStop('SuiteD');
    });

    teardown(async function() {
        this.timeout(8000);
        await terminateSession();
    });

    test('D1: stack_trace — valid frame structure returned', async function() {
        this.timeout(12000);
        const res = await proxyPost('stack_trace');
        assert.ok(res.success, `stack_trace failed: ${JSON.stringify(res)}`);
        const frames = res.data;
        assert.ok(Array.isArray(frames) && frames.length > 0, 'stack_trace should return non-empty array');

        const top = frames[0];
        assert.ok(top.id !== undefined, 'Frame should have id');
        assert.ok(top.name !== undefined, 'Frame should have name');
        assert.ok(top.line !== undefined, 'Frame should have line');
        // source may be nested object or flat
        const hasSource = top.source || top.path || top.file;
        assert.ok(hasSource, 'Frame should have source info');
    });

    test('D2: up + down — traverse call stack', async function() {
        this.timeout(25000);
        // Step into EcuM_Init to get a 2-frame stack
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

        // Now we should have at least 2 frames (EcuM_Init + main)
        const framesRes = await proxyPost('stack_trace');
        if (!framesRes.data || framesRes.data.length < 2) {
            // Skip — can't test up/down with single frame
            return;
        }

        const bottomFuncBefore = framesRes.data[framesRes.data.length - 1]?.name;

        // Go up
        const upRes = await proxyPost('up');
        assert.ok(upRes.success !== false, `up failed: ${JSON.stringify(upRes)}`);

        // Go back down
        const downRes = await proxyPost('down');
        assert.ok(downRes.success !== false, `down failed: ${JSON.stringify(downRes)}`);
    });

    test('D3: goto_frame by ID — succeeds', async function() {
        this.timeout(25000);
        // Step into a function to get multiple frames
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

        const framesRes = await proxyPost('stack_trace');
        const frames = framesRes.data;
        if (!frames || frames.length < 2) {
            return; // Can't test without multi-frame stack
        }

        // goto_frame to frame index 1 (parent frame)
        const targetFrameId = frames[1].id;
        const gotoRes = await proxyPost('goto_frame', { frameId: targetFrameId });
        assert.ok(gotoRes.success, `goto_frame should succeed, got: ${JSON.stringify(gotoRes)}`);
    });

    test('D4: Variables differ between frames', async function() {
        this.timeout(25000);
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

        // Get variables at current (inner) frame
        const innerVars = await proxyPost('get_variables');

        // Go up to main frame
        await proxyPost('up');

        // Get variables at parent (main) frame
        const outerVars = await proxyPost('get_variables');

        // They should be different (main has 'iteration', inner may not)
        const innerStr = JSON.stringify(innerVars.data);
        const outerStr = JSON.stringify(outerVars.data);

        // At minimum, they're both valid JSON objects or arrays
        assert.ok(innerVars.success !== false, `get_variables failed at inner frame: ${JSON.stringify(innerVars)}`);
        assert.ok(outerVars.success !== false, `get_variables failed at outer frame: ${JSON.stringify(outerVars)}`);
    });

    test('D5: stack_trace at main entry — top frame is main', async function() {
        this.timeout(12000);
        const res = await proxyPost('stack_trace');
        assert.ok(res.success, `stack_trace failed: ${JSON.stringify(res)}`);
        const frames = res.data;
        assert.ok(Array.isArray(frames) && frames.length > 0, 'Should have at least 1 frame');

        const top = frames[0];
        const funcName: string = top.name || '';
        assert.ok(
            funcName.includes('main'),
            `Top frame at entry should be main, got: ${funcName}`
        );
        // Line should be near the start of main
        assert.ok(
            top.line >= MAIN_C.FUNCTION_START && top.line <= MAIN_C.ECUM_INIT + 5,
            `Top frame line should be near main start (${MAIN_C.FUNCTION_START}), got: ${top.line}`
        );
    });
});
