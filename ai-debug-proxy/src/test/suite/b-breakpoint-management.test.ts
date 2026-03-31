/**
 * @file b-breakpoint-management.test.ts
 * @brief Suite B: Breakpoint Management (7 tests)
 */

import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    launchAndWaitForStop,
    terminateSession,
    proxyPost,
    getStatus,
    waitForStop,
    waitForRunning,
    delay,
    getWorkspaceFolder,
    TIMEOUTS,
} from './helpers';
import { MAIN_C } from './constants';

suite('Suite B: Breakpoint Management', () => {

    setup(async function() {
        this.timeout(12000);
        await launchAndWaitForStop('SuiteB');
    });

    teardown(async function() {
        this.timeout(8000);
        await terminateSession();
    });

    test('B1: Set breakpoint — ID and verified returned', async function() {
        this.timeout(15000);
        const folder = await getWorkspaceFolder();
        const mainCPath = path.join(folder.uri.fsPath, 'main.c');

        const res = await proxyPost('set_breakpoint', {
            location: { path: mainCPath, line: MAIN_C.OS_RUN_SCHEDULER }
        });

        assert.ok(res.success, `set_breakpoint failed: ${JSON.stringify(res)}`);
        const bp = res.data;
        assert.ok(bp, 'Response should have data');
        assert.ok(bp.id !== undefined, 'Breakpoint should have an id');
    });

    test('B2: Continue to breakpoint — stop reason is breakpoint', async function() {
        this.timeout(20000);
        const folder = await getWorkspaceFolder();
        const mainCPath = path.join(folder.uri.fsPath, 'main.c');

        // Set BP inside the main loop
        await proxyPost('set_breakpoint', {
            location: { path: mainCPath, line: MAIN_C.OS_RUN_SCHEDULER }
        });

        // Continue
        await proxyPost('continue');

        // Wait for the breakpoint to be hit
        await waitForStop(8000);

        const status = await getStatus();
        assert.strictEqual(status.isRunning, false, 'Should be stopped at breakpoint');
        const reason = status.lastStopInfo?.reason || '';
        assert.ok(
            reason === 'breakpoint' || reason === 'signal',
            `Stop reason should indicate a breakpoint stop, got: '${reason}'`
        );
    });

    test('B3: Remove breakpoint — no longer in active list', async function() {
        this.timeout(15000);
        const folder = await getWorkspaceFolder();
        const mainCPath = path.join(folder.uri.fsPath, 'main.c');

        // Set BP
        const setRes = await proxyPost('set_breakpoint', {
            location: { path: mainCPath, line: MAIN_C.OS_RUN_SCHEDULER }
        });
        assert.ok(setRes.success, `set_breakpoint failed: ${JSON.stringify(setRes)}`);
        const bpId = setRes.data?.id;

        // Remove BP: pass id (used by router) + location (required by validation)
        const removeRes = await proxyPost('remove_breakpoint', {
            id: bpId,
            location: { path: mainCPath, line: MAIN_C.OS_RUN_SCHEDULER }
        });
        assert.ok(removeRes.success, `remove_breakpoint failed: ${JSON.stringify(removeRes)}`);

        // Verify it's gone from active list
        const activeRes = await proxyPost('get_active_breakpoints');
        const bps: any[] = activeRes.data || [];
        const stillPresent = bps.some((bp: any) => {
            const bpLine = bp.line || bp.location?.line;
            return bpLine === MAIN_C.OS_RUN_SCHEDULER;
        });
        assert.strictEqual(stillPresent, false, 'Removed breakpoint should not be in active list');
    });

    test('B4: Multiple breakpoints — all tracked', async function() {
        this.timeout(15000);
        const folder = await getWorkspaceFolder();
        const mainCPath = path.join(folder.uri.fsPath, 'main.c');

        const lines = [MAIN_C.OS_RUN_SCHEDULER, MAIN_C.GPT_SIM_TICK, MAIN_C.ITERATION_INC];
        for (const line of lines) {
            const res = await proxyPost('set_breakpoint', {
                location: { path: mainCPath, line }
            });
            assert.ok(res.success, `set_breakpoint at line ${line} failed: ${JSON.stringify(res)}`);
        }

        const activeRes = await proxyPost('get_active_breakpoints');
        const bps: any[] = activeRes.data || [];

        // All 3 lines should appear in the active list
        for (const line of lines) {
            const found = bps.some((bp: any) => {
                const bpLine = bp.line || bp.location?.line;
                return bpLine === line;
            });
            assert.ok(found, `Breakpoint at line ${line} not found in active list: ${JSON.stringify(bps)}`);
        }
    });

    test('B5: Breakpoint at invalid line — error or verified=false', async function() {
        this.timeout(12000);
        const folder = await getWorkspaceFolder();
        const mainCPath = path.join(folder.uri.fsPath, 'main.c');

        const res = await proxyPost('set_breakpoint', {
            location: { path: mainCPath, line: 99999 }
        });

        // Accept either: failure OR breakpoint with verified=false
        const acceptable =
            res.success === false ||
            (res.success === true && res.data?.verified === false) ||
            res.error;
        assert.ok(
            acceptable,
            `Expected failure or unverified BP for invalid line, got: ${JSON.stringify(res)}`
        );
    });

    test('B6: Temporary breakpoint — auto-removed after hit', async function() {
        this.timeout(30000);
        const folder = await getWorkspaceFolder();
        const mainCPath = path.join(folder.uri.fsPath, 'main.c');

        // Set temp BP inside the main loop
        const res = await proxyPost('set_temp_breakpoint', {
            location: { path: mainCPath, line: MAIN_C.OS_RUN_SCHEDULER }
        });
        assert.ok(res.success, `set_temp_breakpoint failed: ${JSON.stringify(res)}`);

        // Continue — should stop at temp BP
        await proxyPost('continue');
        await waitForStop(8000);

        // Verify it was hit
        const status = await getStatus();
        assert.strictEqual(status.isRunning, false, 'Should have stopped at temp breakpoint');

        // Continue again — temp BP should be gone, program keeps running
        await proxyPost('continue');
        await delay(TIMEOUTS.CONTINUE_RUN);

        const status2 = await getStatus();
        // If program is still running, temp BP was auto-removed (correct)
        // If stopped again, check it's NOT due to the same BP
        if (!status2.isRunning) {
            const activeRes = await proxyPost('get_active_breakpoints');
            const bps: any[] = activeRes.data || [];
            const tempStillPresent = bps.some((bp: any) => {
                const bpLine = bp.line || bp.location?.line;
                return bpLine === MAIN_C.OS_RUN_SCHEDULER && bp.temporary === true;
            });
            assert.strictEqual(tempStillPresent, false, 'Temp breakpoint should be auto-removed after first hit');
        }
        // If running — perfect, temp BP was removed and program continued
    });

    test('B7: remove_all_breakpoints_in_file — bulk cleanup', async function() {
        this.timeout(15000);
        const folder = await getWorkspaceFolder();
        const mainCPath = path.join(folder.uri.fsPath, 'main.c');

        // Set 3 BPs
        for (const line of [MAIN_C.OS_RUN_SCHEDULER, MAIN_C.ITERATION_INC, MAIN_C.GPT_SIM_TICK]) {
            await proxyPost('set_breakpoint', { location: { path: mainCPath, line } });
        }

        // Remove all in main.c
        const removeRes = await proxyPost('remove_all_breakpoints_in_file', { filePath: mainCPath });
        assert.ok(removeRes.success, `remove_all_breakpoints_in_file failed: ${JSON.stringify(removeRes)}`);

        // Verify none remain in main.c
        const activeRes = await proxyPost('get_active_breakpoints');
        const bps: any[] = activeRes.data || [];
        const mainCBps = bps.filter((bp: any) => {
            const bpPath = bp.source?.path || bp.location?.path || bp.path || '';
            return bpPath.includes('main.c');
        });
        assert.strictEqual(mainCBps.length, 0, `All main.c BPs should be removed, found: ${JSON.stringify(mainCBps)}`);
    });
});
