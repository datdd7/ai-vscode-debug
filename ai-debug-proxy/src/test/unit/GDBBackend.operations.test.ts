/**
 * GDBBackend Operations Unit Tests
 * Tests for new PI3 operations: frame nav, breakpoints, inspection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GDBBackend } from '../../backend/GDBBackend';

// Mock MI2
class MockMI2 {
    sendCommand = vi.fn();
    on = vi.fn();
    removeListener = vi.fn();
    kill = vi.fn();
}

describe('GDBBackend - PI3 Operations', () => {
    let backend: GDBBackend;
    let mi2Mock: MockMI2;

    beforeEach(() => {
        mi2Mock = new MockMI2();
        backend = new GDBBackend();
        (backend as any).mi2 = mi2Mock;
        (backend as any).running = true;
    });

    describe('Frame Navigation', () => {
        it('restart() sends -exec-run', async () => {
            mi2Mock.sendCommand.mockResolvedValue({});
            await backend.restart();
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-run');
        });

        // ADP-002 regression: frameUp must send an absolute frame number, not "+1"
        it('frameUp() increments currentFrameId and sends absolute index', async () => {
            mi2Mock.sendCommand.mockResolvedValue({});
            // starts at frame 0 → frameUp should go to 1
            await backend.frameUp();
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-select-frame 1');
        });

        it('frameUp() twice sends frame 2', async () => {
            mi2Mock.sendCommand.mockResolvedValue({});
            await backend.frameUp(); // → 1
            await backend.frameUp(); // → 2
            expect(mi2Mock.sendCommand).toHaveBeenLastCalledWith('-stack-select-frame 2');
        });

        // ADP-002 regression: frameDown must not use "-1"
        it('frameDown() from frame 0 stays at 0 (floor guard)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({});
            await backend.frameDown();
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-select-frame 0');
        });

        it('frameDown() after frameUp returns to 0', async () => {
            mi2Mock.sendCommand.mockResolvedValue({});
            await backend.frameUp();  // → 1
            await backend.frameDown(); // → 0
            expect(mi2Mock.sendCommand).toHaveBeenLastCalledWith('-stack-select-frame 0');
        });

        it('gotoFrame() sends correct command and updates currentFrameId', async () => {
            mi2Mock.sendCommand.mockResolvedValue({});
            await backend.gotoFrame(5);
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-select-frame 5');
            // subsequent frameUp should go to 6
            await backend.frameUp();
            expect(mi2Mock.sendCommand).toHaveBeenLastCalledWith('-stack-select-frame 6');
        });
    });

    describe('Extended Breakpoints', () => {
        // ADP-007 regression: setBreakpoint must parse verified and ID from GDB response
        it('setBreakpoint() uses GDB number as id and reads verified from response', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    bkpt: { number: '3', enabled: 'y', line: '42', fullname: 'main.c' }
                }
            });
            const bp = await backend.setBreakpoint({ path: 'main.c', line: 42 });
            expect(bp.id).toBe('3');       // ADP-006: real GDB number, not Date.now()
            expect(bp.verified).toBe(true); // ADP-007: from GDB enabled field
            expect(bp.line).toBe(42);
        });

        it('setBreakpoint() returns verified:false when GDB reports enabled:"n"', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { bkpt: { number: '5', enabled: 'n', line: '10' } }
            });
            const bp = await backend.setBreakpoint({ path: 'other.c', line: 10 });
            expect(bp.verified).toBe(false);
        });

        // ADP-001 regression: removeBreakpoint MUST send -break-delete to GDB
        it('removeBreakpoint() sends -break-delete <id> to GDB', async () => {
            mi2Mock.sendCommand.mockResolvedValue({});
            await backend.removeBreakpoint('7');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-break-delete 7');
        });

        it('setTempBreakpoint() uses GDB number as id', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    bkpt: { number: '9', enabled: 'y', line: '42', fullname: 'main.c' }
                }
            });
            const result = await backend.setTempBreakpoint({ path: 'main.c', line: 42 });
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-break-insert -t main.c:42');
            expect(result.verified).toBe(true);
            expect(result.id).toBe('9');  // ADP-006: GDB number, not tbp-${Date.now()}
        });

        it('removeAllBreakpointsInFile() deletes matching breakpoints', async () => {
            mi2Mock.sendCommand.mockResolvedValueOnce({
                resultData: {
                    BreakpointTable: {
                        body: [
                            ['1', 'breakpoint', 'keep', 'y', 'main.c', '42'],
                            ['2', 'breakpoint', 'keep', 'y', 'other.c', '10'],
                            ['3', 'breakpoint', 'keep', 'y', 'main.c', '50']
                        ]
                    }
                }
            });
            await backend.removeAllBreakpointsInFile('main.c');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-break-delete 1');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-break-delete 3');
        });
    });

    describe('Threading', () => {
        it('listThreads() sends -thread-info and parses result', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    threads: [
                        { id: '1', 'target-id': 'Thread 0x7fff1', state: 'stopped', frame: { func: 'main', file: 'main.c', fullname: '/src/main.c', line: '10' } },
                        { id: '2', 'target-id': 'Thread 0x7fff2', state: 'stopped', frame: { func: 'worker', file: 'main.c', fullname: '/src/main.c', line: '20' } },
                    ]
                }
            });
            const threads = await backend.listThreads();
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-thread-info');
            expect(threads).toHaveLength(2);
            expect(threads[0].id).toBe(1);
            expect(threads[0].name).toBe('Thread 0x7fff1');
            expect(threads[1].frame?.name).toBe('worker');
        });

        it('switchThread() sends -thread-select', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
            await backend.switchThread(3);
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-thread-select 3');
        });

        it('getStackTrace() uses --thread flag when threadId provided', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: { stack: [] } });
            await backend.getStackTrace(2);
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-list-frames --thread 2');
        });

        it('getStackTrace() without threadId sends plain command', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: { stack: [] } });
            await backend.getStackTrace();
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-list-frames');
        });
    });

    describe('Extended Inspection', () => {
        it('listSource() sends list command', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { value: 'Line 1\nLine 2' }
            });
            const result = await backend.listSource();
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-interpreter-exec console "list"');
            expect(result).toBe('Line 1\nLine 2');
        });

        it('getSource() sends info source command', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { value: 'main.c' }
            });
            const result = await backend.getSource('main');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-interpreter-exec console "info source"');
            expect(result).toBe('main.c');
        });

        it('prettyPrint() evaluates expression', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { value: '42', type: 'int' }
            });
            const result = await backend.prettyPrint('x');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-data-evaluate-expression "x"');
            expect(result.value).toBe('42');
            expect(result.type).toBe('int');
        });

        it('whatis() sends whatis command', async () => {
            // New impl uses -var-create to get structured type info
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { type: 'int' }
            });
            const result = await backend.whatis('x');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith(
                expect.stringMatching(/^-var-create wt\d+ \* x$/)
            );
            expect(result).toBe('type = int');
        });

        it('executeStatement() sends console command', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { value: 'Output' }
            });
            const result = await backend.executeStatement('print x');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-interpreter-exec console "print x"');
            expect(result).toBe('Output');
        });

        it('listAllLocals() calls getVariables()', async () => {
            // Mock getVariables
            backend.getVariables = vi.fn().mockResolvedValue([{ name: 'x', value: '1' }]);
            const result = await backend.listAllLocals();
            expect(backend.getVariables).toHaveBeenCalled();
            expect(result).toEqual([{ name: 'x', value: '1' }]);
        });

        it('getScopePreview() returns locals + args', async () => {
            backend.getVariables = vi.fn().mockResolvedValue([{ name: 'x', value: '1' }]);
            backend.getArguments = vi.fn().mockResolvedValue([{ name: 'arg', value: '2' }]);
            
            const result = await backend.getScopePreview();
            expect(result).toEqual({
                locals: [{ name: 'x', value: '1' }],
                args: [{ name: 'arg', value: '2' }]
            });
        });
    });
});
