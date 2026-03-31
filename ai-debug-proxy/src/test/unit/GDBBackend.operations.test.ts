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

        it('getStackTrace() returns [] when resultData has no stack property', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
            const frames = await backend.getStackTrace();
            expect(frames).toEqual([]);
        });
    });

    describe('Extended Inspection', () => {
        it('listSource() sends list command (fallback, no params)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { value: 'Line 1\nLine 2' }
            });
            const result = await backend.listSource();
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-interpreter-exec console "list"');
            expect(result).toBe('Line 1\nLine 2');
        });

        it('listSource() with frameId sends frame-select then list range', async () => {
            // Call 1: -stack-select-frame, Call 2: -stack-info-frame, Call 3: list
            mi2Mock.sendCommand
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({
                    resultData: { frame: { fullname: '/src/main.c', line: '20' } }
                })
                .mockResolvedValueOnce({ resultData: { consoleOutput: 'source here' } });
            const result = await backend.listSource({ frameId: 2, linesAround: 10 });
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-select-frame 2');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-info-frame');
            expect(result).toBe('source here');
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

        it('whatis() falls back to interpreter-exec when -var-create throws', async () => {
            mi2Mock.sendCommand
                .mockRejectedValueOnce(new Error('var-create failed'))
                .mockResolvedValueOnce({ resultData: { value: 'type = int' } });
            const result = await backend.whatis('x');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith(
                expect.stringContaining('-interpreter-exec console "whatis x"')
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

// ---------------------------------------------------------------------------
// Execution Control
// ---------------------------------------------------------------------------
describe('GDBBackend - Execution Control', () => {
    let backend: GDBBackend;
    let mi2Mock: MockMI2;

    beforeEach(() => {
        mi2Mock = new MockMI2();
        backend = new GDBBackend();
        (backend as any).mi2 = mi2Mock;
    });

    it('continue() sends -exec-continue and sets running=true', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.continue();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-continue');
        expect((backend as any).running).toBe(true);
    });

    it('continue() throws when mi2 not initialized', async () => {
        (backend as any).mi2 = undefined;
        await expect(backend.continue()).rejects.toThrow('GDB not initialized');
    });

    it('stepOver() sends -exec-next', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.stepOver();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-next');
        expect((backend as any).running).toBe(true);
    });

    it('stepOver() throws when mi2 not initialized', async () => {
        (backend as any).mi2 = undefined;
        await expect(backend.stepOver()).rejects.toThrow('GDB not initialized');
    });

    it('stepIn() sends -exec-step', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.stepIn();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-step');
        expect((backend as any).running).toBe(true);
    });

    it('stepOut() sends -exec-finish', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.stepOut();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-finish');
        expect((backend as any).running).toBe(true);
    });

    it('pause() sends -exec-interrupt', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.pause();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-interrupt');
    });

    it('jumpToLine() with file sends temp bp + exec-jump', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.jumpToLine(15, 'main.c');
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-break-insert -t main.c:15');
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-jump main.c:15');
    });

    it('jumpToLine() without file gets stack trace first', async () => {
        mi2Mock.sendCommand
            .mockResolvedValueOnce({ resultData: { stack: [{ level: '0', func: 'main', fullname: '/src/main.c', line: '10' }] } })
            .mockResolvedValue({});
        await backend.jumpToLine(20);
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-list-frames');
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith(expect.stringContaining('-break-insert -t'));
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith(expect.stringContaining('-exec-jump'));
    });

    it('jumpToLine() without file throws when stack is empty', async () => {
        mi2Mock.sendCommand.mockResolvedValue({ resultData: { stack: [] } });
        await expect(backend.jumpToLine(20)).rejects.toThrow('Cannot jump');
    });

    it('runUntilLine() with file sends temp bp + exec-continue', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.runUntilLine(30, 'other.c');
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-break-insert -t other.c:30');
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-continue');
    });

    it('runUntilLine() without file gets stack trace first', async () => {
        mi2Mock.sendCommand
            .mockResolvedValueOnce({ resultData: { stack: [{ level: '0', func: 'main', fullname: '/src/main.c', line: '10' }] } })
            .mockResolvedValue({});
        await backend.runUntilLine(25);
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-list-frames');
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-continue');
    });

    it('runUntilLine() without file throws when stack is empty', async () => {
        mi2Mock.sendCommand.mockResolvedValue({ resultData: { stack: [] } });
        await expect(backend.runUntilLine(25)).rejects.toThrow('Cannot run until line');
    });

    it('jumpToLine() throws when stack frame has empty path', async () => {
        // frame.path = '' is falsy → hits the "No file path available" guard
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: { stack: [{ level: '0', func: 'main', fullname: '', file: '', line: '10' }] }
        });
        await expect(backend.jumpToLine(20)).rejects.toThrow('No file path available');
    });

    it('runUntilLine() throws when stack frame has empty path', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: { stack: [{ level: '0', func: 'main', fullname: '', file: '', line: '10' }] }
        });
        await expect(backend.runUntilLine(20)).rejects.toThrow('No file path available');
    });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
describe('GDBBackend - Lifecycle', () => {
    let backend: GDBBackend;
    let mi2Mock: MockMI2;

    beforeEach(() => {
        mi2Mock = new MockMI2();
        backend = new GDBBackend();
        (backend as any).mi2 = mi2Mock;
    });

    it('start() sends -exec-run and sets running=true', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.start();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-run');
        expect((backend as any).running).toBe(true);
    });

    it('start() throws when mi2 not initialized', async () => {
        (backend as any).mi2 = undefined;
        await expect(backend.start()).rejects.toThrow('GDB not initialized');
    });

    it('launch() sends file-exec-and-symbols', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.launch({ program: '/path/to/binary' });
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-file-exec-and-symbols "/path/to/binary"');
    });

    it('launch() sends cwd when provided', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.launch({ program: '/a.out', cwd: '/workspace' });
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-environment-cd "/workspace"');
    });

    it('launch() sends env vars when provided', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.launch({ program: '/a.out', env: { FOO: 'bar', BAZ: 'qux' } });
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-interpreter-exec console "set environment FOO=bar"');
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-interpreter-exec console "set environment BAZ=qux"');
    });

    it('launch() sets breakpoint at main when stopOnEntry=true', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.launch({ program: '/a.out', stopOnEntry: true });
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-break-insert -f main');
    });

    it('launch() does not set entry breakpoint when stopOnEntry=false', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.launch({ program: '/a.out', stopOnEntry: false });
        const calls = mi2Mock.sendCommand.mock.calls.map((c: any[]) => c[0]);
        expect(calls.some((c: string) => c.includes('-break-insert'))).toBe(false);
    });

    it('launch() escapes special chars in path (ADP-021)', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.launch({ program: '/path/with "quotes"/a.out' });
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-file-exec-and-symbols "/path/with \\"quotes\\"/a.out"');
    });

    it('launch() throws when mi2 not initialized', async () => {
        (backend as any).mi2 = undefined;
        await expect(backend.launch({ program: '/a.out' })).rejects.toThrow('GDB not initialized');
    });

    it('attach() sends -target-attach with processId', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.attach({ processId: 1234 });
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-target-attach 1234');
    });

    it('attach() throws when mi2 not initialized', async () => {
        (backend as any).mi2 = undefined;
        await expect(backend.attach({ processId: 1 })).rejects.toThrow('GDB not initialized');
    });

    it('terminate() clears mi2 and breakpoints', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        (backend as any).breakpoints.set('1', { id: '1', verified: true, line: 10, file: 'main.c' });
        await backend.terminate();
        expect(mi2Mock.kill).toHaveBeenCalled();
        expect((backend as any).mi2).toBeUndefined();
        expect((backend as any).running).toBe(false);
        expect((backend as any).breakpoints.size).toBe(0);
    });

    it('terminate() does not throw when mi2 is already undefined', async () => {
        (backend as any).mi2 = undefined;
        await expect(backend.terminate()).resolves.toBeUndefined();
    });

    it('isRunning() returns current running state', () => {
        (backend as any).running = false;
        expect(backend.isRunning()).toBe(false);
        (backend as any).running = true;
        expect(backend.isRunning()).toBe(true);
    });

    it('getBreakpoints() returns all breakpoints from map', async () => {
        const bp1 = { id: '1', verified: true, line: 10, file: 'a.c' };
        const bp2 = { id: '2', verified: false, line: 20, file: 'b.c' };
        (backend as any).breakpoints.set('1', bp1);
        (backend as any).breakpoints.set('2', bp2);
        const result = await backend.getBreakpoints();
        expect(result).toHaveLength(2);
        expect(result).toContainEqual(bp1);
        expect(result).toContainEqual(bp2);
    });

    it('getCapabilities() returns correct capability flags', () => {
        const caps = backend.getCapabilities();
        expect(caps.supportsLaunch).toBe(true);
        expect(caps.supportsAttach).toBe(true);
        expect(caps.supportsThreads).toBe(true);
        expect(caps.supportsWatchpoints).toBe(true);
        expect(caps.supportedArchitectures).toContain('x86_64');
    });
});

// ---------------------------------------------------------------------------
// Variables and Inspection
// ---------------------------------------------------------------------------
describe('GDBBackend - Variables and Inspection', () => {
    let backend: GDBBackend;
    let mi2Mock: MockMI2;

    beforeEach(() => {
        mi2Mock = new MockMI2();
        backend = new GDBBackend();
        (backend as any).mi2 = mi2Mock;
    });

    it('getVariables() sends -stack-list-locals and parses result', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: { locals: [{ name: 'x', value: '42', type: 'int' }] }
        });
        const vars = await backend.getVariables();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-list-locals 1');
        expect(vars).toHaveLength(1);
        expect(vars[0].name).toBe('x');
        expect(vars[0].value).toBe('42');
        expect(vars[0].type).toBe('int');
    });

    it('getVariables() with frameId selects frame first', async () => {
        mi2Mock.sendCommand
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ resultData: { locals: [] } });
        await backend.getVariables(3);
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-select-frame 3');
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-list-locals 1');
    });

    it('getVariables() returns [] when no locals in result', async () => {
        mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
        const vars = await backend.getVariables();
        expect(vars).toEqual([]);
    });

    it('getVariables() throws when mi2 not initialized', async () => {
        (backend as any).mi2 = undefined;
        await expect(backend.getVariables()).rejects.toThrow('GDB not initialized');
    });

    it('getArguments() sends -stack-list-arguments and parses result', async () => {
        mi2Mock.sendCommand
            .mockResolvedValueOnce({}) // -stack-select-frame 0
            .mockResolvedValueOnce({
                resultData: {
                    'stack-args': [{ args: [{ name: 'argc', value: '1', type: 'int' }] }]
                }
            });
        const args = await backend.getArguments(0);
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-select-frame 0');
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-list-arguments 1 0 0');
        expect(args).toHaveLength(1);
        expect(args[0].name).toBe('argc');
    });

    it('getArguments() returns [] when no stack-args', async () => {
        mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
        const args = await backend.getArguments(0);
        expect(args).toEqual([]);
    });

    it('getArguments() returns [] when frame has no args field', async () => {
        mi2Mock.sendCommand
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({
                resultData: { 'stack-args': [{}] }
            });
        const args = await backend.getArguments(0);
        expect(args).toEqual([]);
    });

    it('getGlobals() parses info variables console output', async () => {
        backend.executeStatement = vi.fn().mockResolvedValue(
            'All defined variables:\n\nFile main.c:\n33:\tint iteration;\n34:\tuint32_t g_count;\n'
        );
        const vars = await backend.getGlobals();
        expect(backend.executeStatement).toHaveBeenCalledWith('info variables');
        expect(vars.length).toBeGreaterThan(0);
    });

    it('getGlobals() returns [] when executeStatement returns empty', async () => {
        backend.executeStatement = vi.fn().mockResolvedValue('');
        const vars = await backend.getGlobals();
        expect(vars).toEqual([]);
    });

    it('evaluate() sends -data-evaluate-expression', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: { value: '42', type: 'int' }
        });
        const result = await backend.evaluate('x + 1');
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-data-evaluate-expression "x + 1"');
        expect(result.value).toBe('42');
        expect(result.name).toBe('x + 1');
    });

    it('evaluate() with frameId selects frame first', async () => {
        mi2Mock.sendCommand
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ resultData: { value: '0' } });
        await backend.evaluate('y', 2);
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-select-frame 2');
    });

    it('getRegisters() sends -data-list-register-values x and parses', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: {
                'register-values': [
                    { number: '0', value: '0x0' },
                    { number: '1', value: '0x1' }
                ]
            }
        });
        const regs = await backend.getRegisters();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-data-list-register-values x');
        expect(regs).toHaveLength(2);
        expect(regs[0].name).toBe('r0');
        expect(regs[0].value).toBe('0x0');
    });

    it('getRegisters() returns [] when no register-values', async () => {
        mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
        const regs = await backend.getRegisters();
        expect(regs).toEqual([]);
    });

    it('readMemory() sends -data-read-memory-bytes and decodes hex', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: { memory: [{ contents: 'deadbeef' }] }
        });
        const buf = await backend.readMemory(0x1000, 4);
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-data-read-memory-bytes "0x1000" 4');
        expect(buf).toEqual(Buffer.from('deadbeef', 'hex'));
    });

    it('readMemory() returns Buffer.alloc when no memory data', async () => {
        mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
        const buf = await backend.readMemory(0x1000, 4);
        expect(buf).toEqual(Buffer.alloc(4));
    });

    it('readMemory() throws when length > 65536 (ADP-022)', async () => {
        await expect(backend.readMemory(0, 65537)).rejects.toThrow('64KB');
    });

    it('writeMemory() sends set command with hex data', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        const data = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
        await backend.writeMemory(0x2000, data);
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith(
            expect.stringContaining('-interpreter-exec console "set {char[4]} 0x2000')
        );
    });

    it('writeMemory() throws when mi2 not initialized', async () => {
        (backend as any).mi2 = undefined;
        await expect(backend.writeMemory(0, Buffer.alloc(1))).rejects.toThrow('GDB not initialized');
    });

    it('getLastStopInfo() returns cached lastStopEvent', async () => {
        const stopEvent = { reason: 'breakpoint' as const, threadId: 1, allThreadsStopped: true };
        (backend as any).lastStopEvent = stopEvent;
        const result = await backend.getLastStopInfo();
        expect(result).toBe(stopEvent);
    });

    it('getLastStopInfo() calls getStackTrace when no cached event', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: {
                stack: [{ level: '0', func: 'main', fullname: '/src/main.c', line: '10' }]
            }
        });
        const result = await backend.getLastStopInfo();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-list-frames');
        expect(result.reason).toBe('pause');
        expect(result.threadId).toBe(1);
    });

    it('getLastStopInfo() handles empty stack trace', async () => {
        mi2Mock.sendCommand.mockResolvedValue({ resultData: { stack: [] } });
        const result = await backend.getLastStopInfo();
        expect(result.reason).toBe('pause');
        expect(result.frame).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Internal helpers: createStopEvent, updateCurrentFrame
// ---------------------------------------------------------------------------
describe('GDBBackend - createStopEvent reason mapping', () => {
    let backend: GDBBackend;

    beforeEach(() => {
        backend = new GDBBackend();
    });

    it('maps breakpoint-hit to breakpoint', () => {
        const ev = (backend as any).createStopEvent({ reason: 'breakpoint-hit', threadId: 1 });
        expect(ev.reason).toBe('breakpoint');
    });

    it('maps end-stepping-range to step', () => {
        const ev = (backend as any).createStopEvent({ reason: 'end-stepping-range', threadId: 1 });
        expect(ev.reason).toBe('step');
    });

    it('maps function-finished to step', () => {
        const ev = (backend as any).createStopEvent({ reason: 'function-finished', threadId: 1 });
        expect(ev.reason).toBe('step');
    });

    it('maps signal-received SIGINT to pause', () => {
        const ev = (backend as any).createStopEvent({ reason: 'signal-received', signalName: 'SIGINT', threadId: 1 });
        expect(ev.reason).toBe('pause');
    });

    it('maps signal-received SIGSEGV to exception', () => {
        const ev = (backend as any).createStopEvent({ reason: 'signal-received', signalName: 'SIGSEGV', threadId: 1 });
        expect(ev.reason).toBe('exception');
    });

    it('maps exited to exited', () => {
        const ev = (backend as any).createStopEvent({ reason: 'exited', threadId: 1 });
        expect(ev.reason).toBe('exited');
    });

    it('unknown reason maps to pause', () => {
        const ev = (backend as any).createStopEvent({ reason: 'unknown-reason', threadId: 2 });
        expect(ev.reason).toBe('pause');
    });

    it('includes frame when present', () => {
        const ev = (backend as any).createStopEvent({
            reason: 'breakpoint-hit',
            threadId: 1,
            frame: { func: 'main', fullname: '/src/main.c', file: 'main.c', line: '10' }
        });
        expect(ev.frame?.name).toBe('main');
        expect(ev.frame?.path).toBe('/src/main.c');
        expect(ev.frame?.line).toBe(10);
    });

    it('updateCurrentFrame resets frameId to 0 and sets currentFrame', () => {
        (backend as any).currentFrameId = 5;
        (backend as any).updateCurrentFrame({
            reason: 'breakpoint-hit',
            frame: { func: 'foo', fullname: '/src/foo.c', line: '5' }
        });
        expect((backend as any).currentFrameId).toBe(0);
        expect((backend as any).currentFrame?.name).toBe('foo');
    });
});
