/**
 * @file e-variable-inspection.test.ts
 * @brief Suite E: Variable Inspection & Evaluation (7 tests)
 */

import * as assert from 'assert';
import {
    launchAndWaitForStop,
    terminateSession,
    proxyPost,
    waitForStepComplete,
    delay,
    TIMEOUTS,
} from './helpers';
import { MAIN_C } from './constants';

suite('Suite E: Variable Inspection', () => {

    setup(async function() {
        this.timeout(15000);
        await launchAndWaitForStop('SuiteE');
        // Step past the 'uint32 iteration = 0u;' declaration so it's in scope
        await proxyPost('step_over');
        await waitForStepComplete(5000);
    });

    teardown(async function() {
        this.timeout(8000);
        await terminateSession();
    });

    test('E1: get_variables — includes iteration', async function() {
        this.timeout(15000);
        const res = await proxyPost('get_variables');
        assert.ok(res.success, `get_variables failed: ${JSON.stringify(res)}`);

        // Result may be array of scopes or flat array of variables
        const data = res.data;
        const dataStr = JSON.stringify(data);
        assert.ok(
            dataStr.includes('iteration'),
            `Variables should include 'iteration'. Got: ${dataStr.substring(0, 300)}`
        );
    });

    test('E2: evaluate — read variable value', async function() {
        this.timeout(12000);
        const res = await proxyPost('evaluate', { expression: 'iteration' });
        assert.ok(res.success, `evaluate failed: ${JSON.stringify(res)}`);
        const value = res.data?.value || res.data?.result || String(res.data);
        assert.ok(
            value !== undefined && value !== '',
            `evaluate should return a value for 'iteration', got: ${JSON.stringify(res.data)}`
        );
        // At the beginning, iteration should be 0
        assert.ok(
            value.includes('0') || value === '0u' || value === '0',
            `iteration should be 0 at start, got: ${value}`
        );
    });

    test('E3: evaluate — arithmetic expression', async function() {
        this.timeout(12000);
        const res = await proxyPost('evaluate', { expression: 'iteration + 42' });
        assert.ok(res.success, `evaluate arithmetic failed: ${JSON.stringify(res)}`);
        const value = res.data?.value || res.data?.result || String(res.data);
        // iteration=0, so result should be 42
        assert.ok(
            value.includes('42'),
            `iteration + 42 should evaluate to 42, got: ${value}`
        );
    });

    test('E4: evaluate — write to variable (mutation)', async function() {
        this.timeout(15000);
        // Set iteration to 999
        const setRes = await proxyPost('evaluate', { expression: 'iteration = 999' });
        assert.ok(setRes.success, `evaluate mutation failed: ${JSON.stringify(setRes)}`);

        // Read back
        const readRes = await proxyPost('evaluate', { expression: 'iteration' });
        assert.ok(readRes.success, `evaluate read-back failed: ${JSON.stringify(readRes)}`);
        const value = readRes.data?.value || readRes.data?.result || String(readRes.data);
        assert.ok(
            value.includes('999'),
            `Mutated iteration should be 999, got: ${value}`
        );
    });

    test('E5: whatis — type inspection', async function() {
        this.timeout(12000);
        const res = await proxyPost('whatis', { expression: 'iteration' });
        assert.ok(res.success, `whatis failed: ${JSON.stringify(res)}`);
        const dataStr = JSON.stringify(res.data).toLowerCase();
        assert.ok(
            dataStr.includes('uint') || dataStr.includes('unsigned') || dataStr.includes('int'),
            `whatis should return type info for 'iteration', got: ${dataStr.substring(0, 200)}`
        );
    });

    test('E6: list_all_locals — returns multiple locals', async function() {
        this.timeout(12000);
        // May need to be inside the loop to have simTemp in scope
        // For now check iteration is listed
        const res = await proxyPost('list_all_locals');
        assert.ok(res.success, `list_all_locals failed: ${JSON.stringify(res)}`);
        const dataStr = JSON.stringify(res.data);
        assert.ok(
            dataStr.includes('iteration'),
            `list_all_locals should include 'iteration', got: ${dataStr.substring(0, 300)}`
        );
    });

    test('E7: evaluate invalid expression — graceful error', async function() {
        this.timeout(12000);
        const res = await proxyPost('evaluate', { expression: 'nonexistent_variable_xyz_abc' });
        // Should either fail (success=false) or return an error message
        const isError =
            res.success === false ||
            res.error ||
            (res.data?.value || '').toLowerCase().includes('error') ||
            (res.data?.value || '').toLowerCase().includes('no symbol') ||
            (res.data?.value || '').toLowerCase().includes('not found');
        assert.ok(
            isError,
            `Evaluating nonexistent variable should produce an error, got: ${JSON.stringify(res)}`
        );
    });
});
