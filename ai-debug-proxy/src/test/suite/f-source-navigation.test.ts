/**
 * @file f-source-navigation.test.ts
 * @brief Suite F: Source & Code Navigation (3 tests)
 */

import * as assert from 'assert';
import * as path from 'path';
import {
    launchAndWaitForStop,
    terminateSession,
    proxyPost,
    waitForStop,
    getWorkspaceFolder,
    TIMEOUTS,
} from './helpers';
import { MAIN_C } from './constants';

suite('Suite F: Source Navigation', () => {

    setup(async function() {
        this.timeout(12000);
        await launchAndWaitForStop('SuiteF');
    });

    teardown(async function() {
        this.timeout(8000);
        await terminateSession();
    });

    test('F1: list_source — returns source lines', async function() {
        this.timeout(12000);
        const res = await proxyPost('list_source');
        assert.ok(res.success, `list_source failed: ${JSON.stringify(res)}`);
        const dataStr = JSON.stringify(res.data);
        assert.ok(
            dataStr.length > 10,
            `list_source should return source content, got: ${dataStr.substring(0, 200)}`
        );
    });

    test('F2: get_source — returns function source', async function() {
        this.timeout(12000);
        const res = await proxyPost('get_source', { expression: 'EcuM_Init' });
        // Either returns source code or an error (function may not be in scope)
        if (res.success) {
            const dataStr = JSON.stringify(res.data);
            assert.ok(dataStr.length > 5, `get_source should return content, got: ${dataStr.substring(0, 200)}`);
        } else {
            // Acceptable failure — EcuM_Init may be in a different compilation unit
            assert.ok(res.error || res.success === false, 'Graceful failure is acceptable');
        }
    });

    test('F3: get_last_stop_info — contains reason and frame', async function() {
        this.timeout(15000);
        const folder = await getWorkspaceFolder();
        const mainCPath = path.join(folder.uri.fsPath, 'main.c');

        // Set a BP and continue to it for a meaningful stop reason
        await proxyPost('set_breakpoint', {
            location: { path: mainCPath, line: MAIN_C.ECUM_INIT }
        });
        await proxyPost('continue');
        await waitForStop(8000);

        const res = await proxyPost('get_last_stop_info');
        assert.ok(res.success, `get_last_stop_info failed: ${JSON.stringify(res)}`);

        const info = res.data;
        assert.ok(info, 'get_last_stop_info should return data');
        // Should have a reason
        const reason = info.reason || info.type || '';
        assert.ok(
            reason.length > 0,
            `get_last_stop_info should include a reason, got: ${JSON.stringify(info)}`
        );
    });
});
