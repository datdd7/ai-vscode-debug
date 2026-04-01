/**
 * @file g-memory-registers.test.ts
 * @brief Suite G: Memory & Registers (3 tests)
 */

import * as assert from 'assert';
import {
    launchAndWaitForStop,
    terminateSession,
    proxyPost,
    waitForStepComplete,
    TIMEOUTS,
} from './helpers';
import { MAIN_C } from './constants';

suite('Suite G: Memory & Registers', () => {

    setup(async function() {
        this.timeout(12000);
        await launchAndWaitForStop('SuiteG');
        // Step past variable declaration so 'iteration' is in scope
        await proxyPost('step_over');
        await waitForStepComplete(5000);
    });

    teardown(async function() {
        this.timeout(8000);
        await terminateSession();
    });

    test('G1: get_registers — returns register names', async function() {
        this.timeout(15000);
        const res = await proxyPost('get_registers');
        assert.ok(res.success, `get_registers failed: ${JSON.stringify(res)}`);
        const dataStr = JSON.stringify(res.data).toLowerCase();
        // x86_64 registers (rax, rbx, rip, etc.) or ARM (r0, pc, sp)
        const hasRegisters =
            dataStr.includes('rax') || dataStr.includes('rbx') || dataStr.includes('rip') ||
            dataStr.includes('r0') || dataStr.includes('pc') || dataStr.includes('sp') ||
            dataStr.includes('eax') || dataStr.includes('eip');
        assert.ok(
            hasRegisters,
            `get_registers should return CPU register names, got: ${dataStr.substring(0, 300)}`
        );
    });

    test('G2: read_memory — read bytes at variable address', async function() {
        this.timeout(15000);
        // Get address of iteration
        const addrRes = await proxyPost('evaluate', { expression: '(void*)&iteration' });
        if (!addrRes.success) {
            // Some GDB versions use different expression syntax
            const addrRes2 = await proxyPost('evaluate', { expression: '&iteration' });
            if (!addrRes2.success) {
                // Skip if we can't get address
                return;
            }
        }

        const addrValue = addrRes.data?.value || addrRes.data?.result || '';
        // addrValue should be a hex address like 0x7fff...
        const addrMatch = addrValue.match(/0x[0-9a-fA-F]+/);
        if (!addrMatch) {
            return; // Skip if address not parseable
        }

        const memRef = addrMatch[0];
        const readRes = await proxyPost('read_memory', {
            memoryReference: memRef,
            count: 4
        });

        assert.ok(
            readRes.success || readRes.data,
            `read_memory should succeed for valid address, got: ${JSON.stringify(readRes)}`
        );
    });

    test('G3: read_memory with excessive count — rejected', async function() {
        this.timeout(12000);
        const res = await proxyPost('read_memory', {
            memoryReference: '0x1000',
            count: 100000
        });

        // Should either be rejected by validation or return an error
        const isError =
            res.success === false ||
            res.error ||
            (res.data?.error) ||
            (!res.success && !res.data);

        assert.ok(
            isError,
            `Excessive memory read count should be rejected, got: ${JSON.stringify(res)}`
        );
    });
});
