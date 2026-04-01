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

        it('restart() throws when mi2 is null (branch line 681)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.restart()).rejects.toThrow('GDB not initialized');
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

        it('frameUp() throws when mi2 is null (branch line 692)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.frameUp()).rejects.toThrow('GDB not initialized');
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

        it('frameDown() throws when mi2 is null (branch line 703)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.frameDown()).rejects.toThrow('GDB not initialized');
        });

        it('gotoFrame() sends correct command and updates currentFrameId', async () => {
            mi2Mock.sendCommand.mockResolvedValue({});
            await backend.gotoFrame(5);
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-select-frame 5');
            // subsequent frameUp should go to 6
            await backend.frameUp();
            expect(mi2Mock.sendCommand).toHaveBeenLastCalledWith('-stack-select-frame 6');
        });

        it('gotoFrame() throws when mi2 is null (branch line 714)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.gotoFrame(3)).rejects.toThrow('GDB not initialized');
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

        it('setBreakpoint() throws when mi2 is null (branch line 364)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.setBreakpoint({ path: 'main.c', line: 1 })).rejects.toThrow('GDB not initialized');
        });

        it('setBreakpoint() uses tmp- id when bkpt.number absent (branch line 374)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: { bkpt: { enabled: 'y', line: '1' } } });
            const bp = await backend.setBreakpoint({ path: 'main.c', line: 1 });
            expect(bp.id).toMatch(/^tmp-/);
        });

        it('setBreakpoint() uses location.line when bkpt.line absent (branch line 376)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { bkpt: { number: '6', enabled: 'y', fullname: 'foo.c' } }
            });
            const bp = await backend.setBreakpoint({ path: 'foo.c', line: 77 });
            expect(bp.line).toBe(77);
        });

        // ADP-001 regression: removeBreakpoint MUST send -break-delete to GDB
        it('removeBreakpoint() sends -break-delete <id> to GDB', async () => {
            mi2Mock.sendCommand.mockResolvedValue({});
            await backend.removeBreakpoint('7');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-break-delete 7');
        });

        it('removeBreakpoint() throws when mi2 is null (branch line 395)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.removeBreakpoint('5')).rejects.toThrow('GDB not initialized');
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

        it('setTempBreakpoint() throws when mi2 is null (branch line 725)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.setTempBreakpoint({ path: 'main.c', line: 1 })).rejects.toThrow('GDB not initialized');
        });

        it('setTempBreakpoint() uses tmp- id when bkpt.number absent (branch line 731)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: { bkpt: { enabled: 'n' } } });
            const result = await backend.setTempBreakpoint({ path: 'main.c', line: 5 });
            expect(result.id).toMatch(/^tmp-/);
        });

        it('setTempBreakpoint() uses location.line when bkpt.line absent (branch line 735)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { bkpt: { number: '2', enabled: 'y', fullname: 'foo.c' } }
            });
            const result = await backend.setTempBreakpoint({ path: 'foo.c', line: 99 });
            expect(result.line).toBe(99);
        });

        it('setTempBreakpoint() uses bkpt.file when fullname absent (branch line 736)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { bkpt: { number: '3', enabled: 'y', line: '1', file: 'bar.c' } }
            });
            const result = await backend.setTempBreakpoint({ path: 'orig.c', line: 1 });
            expect(result.file).toBe('bar.c');
        });

        it('setTempBreakpoint() uses location.path when fullname and file absent (branch line 736)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { bkpt: { number: '4', enabled: 'y', line: '1' } }
            });
            const result = await backend.setTempBreakpoint({ path: 'orig.c', line: 1 });
            expect(result.file).toBe('orig.c');
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

        it('removeAllBreakpointsInFile() throws when mi2 is null (branch line 744)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.removeAllBreakpointsInFile('main.c')).rejects.toThrow('GDB not initialized');
        });

        it('removeAllBreakpointsInFile() returns early when body is absent (branch line 748)', async () => {
            mi2Mock.sendCommand.mockResolvedValueOnce({ resultData: {} });
            await backend.removeAllBreakpointsInFile('main.c');
            expect(mi2Mock.sendCommand).toHaveBeenCalledTimes(1); // only -break-list, no -break-delete
        });

        it('removeAllBreakpointsInFile() uses bp.file when bp[4] absent (branch line 752)', async () => {
            mi2Mock.sendCommand
                .mockResolvedValueOnce({
                    resultData: {
                        BreakpointTable: {
                            body: [{ file: 'main.c', number: '7' }]
                        }
                    }
                })
                .mockResolvedValue({});
            await backend.removeAllBreakpointsInFile('main.c');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-break-delete 7');
        });

        it('removeAllBreakpointsInFile() uses bp.number when bp[0] absent (branch line 754)', async () => {
            mi2Mock.sendCommand
                .mockResolvedValueOnce({
                    resultData: {
                        BreakpointTable: {
                            body: [{ number: '5', file: 'main.c' }]
                        }
                    }
                })
                .mockResolvedValue({});
            await backend.removeAllBreakpointsInFile('main.c');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-break-delete 5');
        });

        it('removeAllBreakpointsInFile() skips bp when file info absent (branch line 752 empty string)', async () => {
            // bp has neither bp[4] nor bp.file → bpFile='' which does not match → no delete
            mi2Mock.sendCommand.mockResolvedValueOnce({
                resultData: {
                    BreakpointTable: {
                        body: [{ number: '9' }]  // no file info at all
                    }
                }
            });
            await backend.removeAllBreakpointsInFile('main.c');
            // Only one sendCommand call: -break-list; no -break-delete since no match
            expect(mi2Mock.sendCommand).toHaveBeenCalledTimes(1);
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

        it('switchThread() throws when mi2 is null (branch line 653)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.switchThread(1)).rejects.toThrow('GDB not initialized');
        });

        it('listThreads() throws when mi2 is null (branch line 626)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.listThreads()).rejects.toThrow('GDB not initialized');
        });

        it('listThreads() returns [] when threads absent (branch line 630)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
            const threads = await backend.listThreads();
            expect(threads).toEqual([]);
        });

        it('listThreads() id defaults to 1 when t.id is non-numeric (branch line 635)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    threads: [{ id: 'abc', 'target-id': 'T', state: 'running',
                        frame: { func: 'f', fullname: '/f.c', line: '1' } }]
                }
            });
            const threads = await backend.listThreads();
            expect(threads[0].id).toBe(1);
        });

        it('listThreads() uses t.name when target-id absent (branch line 636)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    threads: [{ id: '2', name: 'worker-thread', state: 'stopped',
                        frame: { func: 'w', fullname: '/w.c', line: '5' } }]
                }
            });
            const threads = await backend.listThreads();
            expect(threads[0].name).toBe('worker-thread');
        });

        it('listThreads() uses Thread fallback when no target-id or name (branch line 636)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    threads: [{ id: '3', state: 'stopped',
                        frame: { func: 'x', fullname: '/x.c', line: '2' } }]
                }
            });
            const threads = await backend.listThreads();
            expect(threads[0].name).toBe('Thread 3');
        });

        it('listThreads() state defaults to "stopped" when absent (branch line 637)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    threads: [{ id: '1', 'target-id': 'T',
                        frame: { func: 'f', fullname: '/f.c', line: '1' } }]
                }
            });
            const threads = await backend.listThreads();
            expect(threads[0].state).toBe('stopped');
        });

        it('listThreads() frame is undefined when t.frame absent (branch line 638)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    threads: [{ id: '1', 'target-id': 'T', state: 'stopped' }]
                }
            });
            const threads = await backend.listThreads();
            expect(threads[0].frame).toBeUndefined();
        });

        it('listThreads() frame.path uses file when fullname absent (branch line 641)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    threads: [{ id: '1', 'target-id': 'T', state: 'stopped',
                        frame: { func: 'f', file: 'main.c', line: '3' } }]
                }
            });
            const threads = await backend.listThreads();
            expect(threads[0].frame?.path).toBe('main.c');
        });

        it('listThreads() frame.path is empty when fullname and file absent (branch line 641)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    threads: [{ id: '1', 'target-id': 'T', state: 'stopped',
                        frame: { func: 'f', line: '3' } }]
                }
            });
            const threads = await backend.listThreads();
            expect(threads[0].frame?.path).toBe('');
        });

        it('listThreads() frame.line defaults to 0 when line is non-numeric (branch line 642)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    threads: [{ id: '1', 'target-id': 'T', state: 'stopped',
                        frame: { func: 'f', fullname: '/f.c', line: 'abc' } }]
                }
            });
            const threads = await backend.listThreads();
            expect(threads[0].frame?.line).toBe(0);
        });

        it('listThreads() frame.name uses "??" when func absent (branch line 640)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: {
                    threads: [{ id: '1', 'target-id': 'T', state: 'stopped',
                        frame: { fullname: '/f.c', line: '1' } }]  // no func
                }
            });
            const threads = await backend.listThreads();
            expect(threads[0].frame?.name).toBe('??');
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

        it('getStackTrace() frame.name uses "??" when func absent (branch line 426)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { stack: [{ level: '0', fullname: '/f.c', line: '1' }] }  // no func
            });
            const frames = await backend.getStackTrace();
            expect(frames[0].name).toBe('??');
        });

        it('getStackTrace() frame.line defaults to 0 when non-numeric (branch line 428)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { stack: [{ level: '0', func: 'f', fullname: '/f.c', line: 'abc' }] }
            });
            const frames = await backend.getStackTrace();
            expect(frames[0].line).toBe(0);
        });

        it('getStackTrace() throws when mi2 is null (branch line 412)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.getStackTrace()).rejects.toThrow('GDB not initialized');
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

        it('listSource() throws when mi2 is null (branch line 764)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.listSource()).rejects.toThrow('GDB not initialized');
        });

        it('listSource() fallback returns consoleOutput when present (branch line 788)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { consoleOutput: 'fallback console output' }
            });
            const result = await backend.listSource();
            expect(result).toBe('fallback console output');
        });

        it('listSource() fallback returns empty string when no data (branch line 788)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
            const result = await backend.listSource();
            expect(result).toBe('');
        });

        it('listSource() with frameId uses frame.file when fullname absent (branch line 774)', async () => {
            mi2Mock.sendCommand
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({
                    resultData: { frame: { file: 'main.c', line: '10' } }
                })
                .mockResolvedValueOnce({ resultData: { consoleOutput: 'lines' } });
            const result = await backend.listSource({ frameId: 1 });
            expect(result).toBe('lines');
        });

        it('listSource() with frameId returns value when no consoleOutput (branch line 782)', async () => {
            mi2Mock.sendCommand
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({
                    resultData: { frame: { fullname: '/src/foo.c', line: '5' } }
                })
                .mockResolvedValueOnce({ resultData: { value: 'value output' } });
            const result = await backend.listSource({ frameId: 0 });
            expect(result).toBe('value output');
        });

        it('listSource() with frameId returns empty string when no data (branch line 782)', async () => {
            mi2Mock.sendCommand
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({
                    resultData: { frame: { fullname: '/src/bar.c', line: '3' } }
                })
                .mockResolvedValueOnce({ resultData: {} });
            const result = await backend.listSource({ frameId: 0 });
            expect(result).toBe('');
        });

        it('listSource() with frameId skips list when file or line missing (branch line 776)', async () => {
            // frame has no file and no line → skip to fallback
            mi2Mock.sendCommand
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ resultData: { frame: {} } })
                .mockResolvedValueOnce({ resultData: { consoleOutput: 'fallback' } });
            const result = await backend.listSource({ frameId: 0 });
            expect(result).toBe('fallback');
        });

        it('getSource() sends info source command', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { value: 'main.c' }
            });
            const result = await backend.getSource('main');
            expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-interpreter-exec console "info source"');
            expect(result).toBe('main.c');
        });

        it('getSource() throws when mi2 is null (branch line 795)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.getSource('main.c')).rejects.toThrow('GDB not initialized');
        });

        it('getSource() returns consoleOutput when present (branch line 798)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { consoleOutput: 'Current source file: main.c' }
            });
            const result = await backend.getSource('main.c');
            expect(result).toBe('Current source file: main.c');
        });

        it('getSource() returns empty string when no data (branch line 798)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
            const result = await backend.getSource('main.c');
            expect(result).toBe('');
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

        it('prettyPrint() throws when mi2 is null (branch line 805)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.prettyPrint('x')).rejects.toThrow('GDB not initialized');
        });

        it('prettyPrint() returns "undefined" value when result has no value (branch line 810)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: { type: 'int' } });
            const result = await backend.prettyPrint('x');
            expect(result.value).toBe('undefined');
        });

        it('prettyPrint() returns "unknown" type when result has no type (branch line 811)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { value: '42' }
            });
            const result = await backend.prettyPrint('x');
            expect(result.type).toBe('unknown');
        });

        it('whatis() throws "GDB not initialized" when mi2 is null (branch line 819)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.whatis('x')).rejects.toThrow('GDB not initialized');
        });

        it('whatis() returns empty string when var-create has no type (branches lines 826+828)', async () => {
            // var-create succeeds but type is absent → type = '' → return ''
            mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
            const result = await backend.whatis('x');
            expect(result).toBe('');
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

        it('executeStatement() returns consoleOutput when present (branch line 843)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({
                resultData: { consoleOutput: 'console out' }
            });
            const result = await backend.executeStatement('print x');
            expect(result).toBe('console out');
        });

        it('executeStatement() returns empty string when no consoleOutput or value (branch line 843)', async () => {
            mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
            const result = await backend.executeStatement('print x');
            expect(result).toBe('');
        });

        it('executeStatement() throws when mi2 is null (branch line 840)', async () => {
            (backend as any).mi2 = null;
            await expect(backend.executeStatement('print x')).rejects.toThrow('GDB not initialized');
        });

        it('whatis() fallback returns consoleOutput when present (catch branch line 832)', async () => {
            mi2Mock.sendCommand
                .mockRejectedValueOnce(new Error('var-create failed'))
                .mockResolvedValueOnce({ resultData: { consoleOutput: 'type = struct Foo' } });
            const result = await backend.whatis('x');
            expect(result).toBe('type = struct Foo');
        });

        it('whatis() fallback returns empty string when catch result has no data (branch line 832)', async () => {
            mi2Mock.sendCommand
                .mockRejectedValueOnce(new Error('var-create failed'))
                .mockResolvedValueOnce({ resultData: {} });
            const result = await backend.whatis('x');
            expect(result).toBe('');
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

    it('stepIn() throws when mi2 is null (branch line 272)', async () => {
        (backend as any).mi2 = null;
        await expect(backend.stepIn()).rejects.toThrow('GDB not initialized');
    });

    it('stepOut() sends -exec-finish', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.stepOut();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-finish');
        expect((backend as any).running).toBe(true);
    });

    it('stepOut() throws when mi2 is null (branch line 283)', async () => {
        (backend as any).mi2 = null;
        await expect(backend.stepOut()).rejects.toThrow('GDB not initialized');
    });

    it('pause() sends -exec-interrupt', async () => {
        mi2Mock.sendCommand.mockResolvedValue({});
        await backend.pause();
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-exec-interrupt');
    });

    it('pause() throws when mi2 is null (branch line 294)', async () => {
        (backend as any).mi2 = null;
        await expect(backend.pause()).rejects.toThrow('GDB not initialized');
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

    it('jumpToLine() throws when mi2 is null (branch line 304)', async () => {
        (backend as any).mi2 = null;
        await expect(backend.jumpToLine(10, 'main.c')).rejects.toThrow('GDB not initialized');
    });

    it('runUntilLine() throws when stack frame has empty path', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: { stack: [{ level: '0', func: 'main', fullname: '', file: '', line: '10' }] }
        });
        await expect(backend.runUntilLine(20)).rejects.toThrow('No file path available');
    });

    it('runUntilLine() throws when mi2 is null (branch line 334)', async () => {
        (backend as any).mi2 = null;
        await expect(backend.runUntilLine(10, 'main.c')).rejects.toThrow('GDB not initialized');
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

    it('getVariables() uses fallback "unknown" name when local.name absent (branch line 453)', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: { locals: [{ value: '0', type: 'int' }] }  // no name
        });
        const vars = await backend.getVariables();
        expect(vars[0].name).toBe('unknown');
    });

    it('getVariables() uses fallback "undefined" value when local.value absent (branch line 454)', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: { locals: [{ name: 'x', type: 'int' }] }  // no value
        });
        const vars = await backend.getVariables();
        expect(vars[0].value).toBe('undefined');
    });

    it('getVariables() uses fallback "unknown" type when local.type absent (branch line 455)', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: { locals: [{ name: 'x', value: '1' }] }  // no type
        });
        const vars = await backend.getVariables();
        expect(vars[0].type).toBe('unknown');
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

    it('getArguments() uses fallback type "unknown" when arg.type absent (branch line 484)', async () => {
        mi2Mock.sendCommand
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({
                resultData: {
                    'stack-args': [{ args: [{ name: 'argc', value: '1' }] }]  // no type
                }
            });
        const args = await backend.getArguments(0);
        expect(args[0].type).toBe('unknown');
    });

    it('getArguments() throws when mi2 is null (branch line 464)', async () => {
        (backend as any).mi2 = null;
        await expect(backend.getArguments(0)).rejects.toThrow('GDB not initialized');
    });

    it('getArguments() uses 0 when frameId and currentFrameId both undefined (branch line 468)', async () => {
        (backend as any).currentFrameId = undefined;
        mi2Mock.sendCommand
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ resultData: { 'stack-args': [{ args: [] }] } });
        const args = await backend.getArguments(undefined);
        expect(mi2Mock.sendCommand).toHaveBeenCalledWith('-stack-select-frame 0');
        expect(args).toEqual([]);
    });

    it('getArguments() uses fallback name "unknown" when arg.name absent (branch line 482)', async () => {
        mi2Mock.sendCommand
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({
                resultData: {
                    'stack-args': [{ args: [{ value: '42', type: 'int' }] }]  // no name
                }
            });
        const args = await backend.getArguments(0);
        expect(args[0].name).toBe('unknown');
    });

    it('getArguments() uses fallback value "undefined" when arg.value absent (branch line 483)', async () => {
        mi2Mock.sendCommand
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({
                resultData: {
                    'stack-args': [{ args: [{ name: 'ptr', type: 'int*' }] }]  // no value
                }
            });
        const args = await backend.getArguments(0);
        expect(args[0].value).toBe('undefined');
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

    it('getGlobals() throws when mi2 is null (branch line 493)', async () => {
        (backend as any).mi2 = null;
        await expect(backend.getGlobals()).rejects.toThrow('GDB not initialized');
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

    it('evaluate() throws when mi2 is null (branch line 520)', async () => {
        (backend as any).mi2 = null;
        await expect(backend.evaluate('x')).rejects.toThrow('GDB not initialized');
    });

    it('evaluate() returns "undefined" value when result has no value (branch line 533)', async () => {
        mi2Mock.sendCommand.mockResolvedValue({ resultData: {} });
        const result = await backend.evaluate('x');
        expect(result.value).toBe('undefined');
        expect(result.type).toBe('unknown');
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

    it('getRegisters() throws when mi2 is null (branch line 544)', async () => {
        (backend as any).mi2 = null;
        await expect(backend.getRegisters()).rejects.toThrow('GDB not initialized');
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

    it('readMemory() throws when mi2 is null (branch line 567)', async () => {
        (backend as any).mi2 = null;
        await expect(backend.readMemory(0x1000, 4)).rejects.toThrow('GDB not initialized');
    });

    it('readMemory() returns empty buffer when memory.contents absent (branch line 583)', async () => {
        mi2Mock.sendCommand.mockResolvedValue({
            resultData: { memory: [{ begin: '0x1000' }] }  // no contents field
        });
        const buf = await backend.readMemory(0x1000, 4);
        expect(buf).toEqual(Buffer.from('', 'hex'));
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

    it('createStopEvent frame.line defaults to 0 when non-numeric (branch line 139)', () => {
        const ev = (backend as any).createStopEvent({
            reason: 'breakpoint-hit', threadId: 1,
            frame: { func: 'f', fullname: '/f.c', line: 'abc' }
        });
        expect(ev.frame?.line).toBe(0);
    });

    it('createStopEvent threadId defaults to 1 when absent (branch line 133)', () => {
        const ev = (backend as any).createStopEvent({ reason: 'breakpoint-hit' });  // no threadId
        expect(ev.threadId).toBe(1);
    });

    it('createStopEvent frame.name uses "??" when func absent (branch line 137)', () => {
        const ev = (backend as any).createStopEvent({
            reason: 'breakpoint-hit', threadId: 1,
            frame: { fullname: '/f.c', line: '1' }  // no func
        });
        expect(ev.frame?.name).toBe('??');
    });

    it('createStopEvent frame.path uses file when fullname absent (branch line 138)', () => {
        const ev = (backend as any).createStopEvent({
            reason: 'breakpoint-hit', threadId: 1,
            frame: { func: 'f', file: 'bar.c', line: '2' }  // no fullname
        });
        expect(ev.frame?.path).toBe('bar.c');
    });

    it('createStopEvent frame.path is empty string when fullname and file absent (branch line 138)', () => {
        const ev = (backend as any).createStopEvent({
            reason: 'breakpoint-hit', threadId: 1,
            frame: { func: 'f', line: '1' }  // no fullname, no file
        });
        expect(ev.frame?.path).toBe('');
    });

    it('updateCurrentFrame uses "??" when func absent (branch line 154)', () => {
        (backend as any).updateCurrentFrame({
            reason: 'breakpoint-hit',
            frame: { fullname: '/x.c', line: '1' }  // no func
        });
        expect((backend as any).currentFrame?.name).toBe('??');
    });

    it('updateCurrentFrame uses file when fullname absent (branch line 155)', () => {
        (backend as any).updateCurrentFrame({
            reason: 'breakpoint-hit',
            frame: { func: 'f', file: 'x.c', line: '1' }  // no fullname
        });
        expect((backend as any).currentFrame?.path).toBe('x.c');
    });

    it('updateCurrentFrame uses empty string when fullname and file absent (branch line 155)', () => {
        (backend as any).updateCurrentFrame({
            reason: 'breakpoint-hit',
            frame: { func: 'f', line: '1' }  // no fullname, no file
        });
        expect((backend as any).currentFrame?.path).toBe('');
    });

    it('updateCurrentFrame frame.line defaults to 0 when non-numeric (branch line 156)', () => {
        (backend as any).updateCurrentFrame({
            reason: 'breakpoint-hit',
            frame: { func: 'f', fullname: '/f.c', line: 'xyz' }
        });
        expect((backend as any).currentFrame?.line).toBe(0);
    });
});
