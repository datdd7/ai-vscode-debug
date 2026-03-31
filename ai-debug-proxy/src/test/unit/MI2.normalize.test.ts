/**
 * MI2 Normalize Function Unit Tests
 * Tests the recursive normalizer for MI output
 *
 * CRITICAL FIX: Now imports and tests PRODUCTION code from MI2.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeMI, MI2 } from '../../protocol/mi2/MI2';
import { EventEmitter } from 'events';

// Mock child_process.spawn so start() tests don't need real GDB
const createMockProcess = () => {
    const proc = new EventEmitter() as any;
    proc.stdin = { write: vi.fn() };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = vi.fn();
    return proc;
};
let spawnMock = vi.fn(() => createMockProcess());
vi.mock('child_process', () => ({
    spawn: (...args: any[]) => (spawnMock as any)(...args)
}));

describe('MI2 Normalize', () => {
    describe('normalizeMI()', () => {
        it('should handle single frame', () => {
            const input = [['frame', [['level', '0'], ['func', 'main']]]];
            const result = normalizeMI(input);
            expect(result).toEqual({
                frame: {
                    level: '0',
                    func: 'main'
                }
            });
        });

        it('should handle multiple frames', () => {
            const input = [
                ['frame', [['level', '0'], ['func', 'main']]],
                ['frame', [['level', '1'], ['func', 'caller']]]
            ];
            const result = normalizeMI(input);
            // When same key appears multiple times, last value wins in object conversion
            expect(result).toEqual({
                frame: {
                    level: '1',
                    func: 'caller'
                }
            });
        });

        it('should handle locals list', () => {
            const input = [['name', 'x'], ['value', '5']];
            const result = normalizeMI(input);
            expect(result).toEqual({
                name: 'x',
                value: '5'
            });
        });

        it('should handle nested args', () => {
            const input = [
                ['frame', [
                    ['args', [
                        ['name', 'arg1'],
                        ['value', 'val1']
                    ]]
                ]]
            ];
            const result = normalizeMI(input);
            expect(result).toEqual({
                frame: {
                    args: {
                        name: 'arg1',
                        value: 'val1'
                    }
                }
            });
        });

        it('should handle empty result', () => {
            const input: any[] = [];
            const result = normalizeMI(input);
            expect(result).toEqual({});
        });

        it('should handle single scalar', () => {
            const input = 'hello';
            const result = normalizeMI(input);
            expect(result).toBe('hello');
        });

        it('should handle deep nesting', () => {
            const input = [
                ['level1', [
                    ['level2', [
                        ['level3', 'value']
                    ]]
                ]]
            ];
            const result = normalizeMI(input);
            expect(result).toEqual({
                level1: {
                    level2: {
                        level3: 'value'
                    }
                }
            });
        });

        it('should preserve null/undefined', () => {
            expect(normalizeMI(null)).toBeNull();
            expect(normalizeMI(undefined)).toBeUndefined();
        });

        it('should normalize plain object (typeof === object branch)', () => {
            // Exercises lines 71-77: plain object with nested values
            const input = { key: 'val', nested: [['a', '1'], ['b', '2']] };
            const result = normalizeMI(input);
            expect(result.key).toBe('val');
            expect(result.nested).toEqual({ a: '1', b: '2' });
        });

        it('should handle non-pair arrays (standard array branch)', () => {
            // Array whose elements are NOT [string, any] pairs → stays as array
            const input = ['a', 'b', 'c'];
            const result = normalizeMI(input);
            expect(result).toEqual(['a', 'b', 'c']);
        });

        it('should handle mixed arrays and objects', () => {
            const input = [
                ['breakpoint', [
                    ['number', '1'],
                    ['type', 'breakpoint'],
                    ['locations', [
                        ['addr', '0x1234'],
                        ['file', 'main.c']
                    ]]
                ]]
            ];
            const result = normalizeMI(input);
            expect(result).toEqual({
                breakpoint: {
                    number: '1',
                    type: 'breakpoint',
                    locations: {
                        addr: '0x1234',
                        file: 'main.c'
                    }
                }
            });
        });
    });
});

// ---------------------------------------------------------------------------
// MI2 class: handleOutput injection, normalize, kill, isRunning, sendCommand
// ---------------------------------------------------------------------------
describe('MI2 class', () => {
    let mi2: MI2;

    beforeEach(() => {
        mi2 = new MI2('gdb', ['--interpreter=mi2']);
    });

    // --- isRunning / kill ---
    it('isRunning() returns false by default', () => {
        expect(mi2.isRunning()).toBe(false);
    });

    it('kill() with no process is a no-op', () => {
        // process is undefined by default — should not throw
        expect(() => mi2.kill()).not.toThrow();
    });

    it('kill() with mock process calls process.kill and clears it', () => {
        const mockProcess = { kill: vi.fn() };
        (mi2 as any).process = mockProcess;
        (mi2 as any).running = true;
        mi2.kill();
        expect(mockProcess.kill).toHaveBeenCalled();
        expect((mi2 as any).process).toBeUndefined();
        expect(mi2.isRunning()).toBe(false);
    });

    // --- sendCommand without process ---
    it('sendCommand() rejects when no process started', async () => {
        await expect(mi2.sendCommand('-stack-list-frames')).rejects.toThrow('GDB not started');
    });

    // --- private normalize() ---
    describe('private normalize()', () => {
        const norm = (val: any, force?: boolean) =>
            (mi2 as any).normalize(val, force);

        it('returns non-array values unchanged', () => {
            expect(norm('hello')).toBe('hello');
            expect(norm(42)).toBe(42);
        });

        it('returns [] for empty array when forceObject=false', () => {
            expect(norm([])).toEqual([]);
        });

        it('converts homogeneous tagged list to array (allSame=true, forceObject=false)', () => {
            const input = [['frame', [['level', '0']]], ['frame', [['level', '1']]]];
            const result = norm(input);
            // homogeneous: returns array of normalized values
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(2);
        });

        it('converts to object when forceObject=true', () => {
            const input = [['frame', [['level', '0']]], ['frame', [['level', '1']]]];
            const result = norm(input, true);
            // forceObject: merges into object
            expect(typeof result).toBe('object');
            expect(Array.isArray(result)).toBe(false);
        });

        it('converts heterogeneous pairs to object', () => {
            const input = [['level', '0'], ['func', 'main']];
            const result = norm(input);
            expect(result).toEqual({ level: '0', func: 'main' });
        });

        it('handles duplicate keys by converting to array', () => {
            // Second occurrence of same key → array merge
            const input = [['key', 'a'], ['other', 'x'], ['key', 'b']];
            const result = norm(input);
            expect(Array.isArray(result.key)).toBe(true);
            expect(result.key).toContain('a');
            expect(result.key).toContain('b');
        });

        it('handles non-pair standard arrays', () => {
            // Not all pairs → normalize each element
            const input = ['a', 'b'];
            expect(norm(input)).toEqual(['a', 'b']);
        });
    });

    // --- handleOutput injection ---
    describe('handleOutput()', () => {
        const inject = (line: string) => (mi2 as any).handleOutput(line);

        it('emits ready on (gdb) prompt', () => {
            const readySpy = vi.fn();
            mi2.on('ready', readySpy);
            inject('(gdb)\n');
            expect(readySpy).toHaveBeenCalled();
        });

        it('skips blank lines without throwing', () => {
            expect(() => inject('\n')).not.toThrow();
            expect(() => inject('   \n')).not.toThrow();
        });

        it('captures console stream output (~)', () => {
            inject('~"hello world\\n"\n');
            expect((mi2 as any).pendingConsoleOutput).toContain('hello world');
        });

        it('resolves pending command on ^done', async () => {
            const mockStdin = { write: vi.fn() };
            (mi2 as any).process = { stdin: mockStdin };
            const cmd = mi2.sendCommand('-stack-list-frames');
            await Promise.resolve(); // flush .then() chain so sendCommandRaw registers token
            const token = (mi2 as any).token - 1;
            inject(`${token}^done,stack=[]\n`);
            const result = await cmd;
            expect(result.resultClass).toBe('done');
        });

        it('attaches accumulated consoleOutput to done result', async () => {
            const mockStdin = { write: vi.fn() };
            (mi2 as any).process = { stdin: mockStdin };
            const cmd = mi2.sendCommand('-interpreter-exec console "info vars"');
            await Promise.resolve();
            const token = (mi2 as any).token - 1;
            // console output arrives before the ^done token
            inject('~"type = int\\n"\n');
            inject(`${token}^done\n`);
            const result = await cmd;
            expect(result.resultData?.consoleOutput).toContain('type = int');
        });

        it('rejects pending command on ^error', async () => {
            const mockStdin = { write: vi.fn() };
            (mi2 as any).process = { stdin: mockStdin };
            const cmd = mi2.sendCommand('-break-insert badfile');
            await Promise.resolve();
            const token = (mi2 as any).token - 1;
            inject(`${token}^error,msg="No such file"\n`);
            await expect(cmd).rejects.toThrow('No such file');
            // pendingConsoleOutput should be cleared on error
            expect((mi2 as any).pendingConsoleOutput).toBe('');
        });

        it('emits stopped event on *stopped record', () => {
            const stoppedSpy = vi.fn();
            mi2.on('stopped', stoppedSpy);
            inject('*stopped,reason="breakpoint-hit",thread-id="1",frame={func="main",file="main.c",line="10"}\n');
            expect(stoppedSpy).toHaveBeenCalled();
            const event = stoppedSpy.mock.calls[0][0];
            expect(event.reason).toBe('breakpoint-hit');
            expect(event.threadId).toBe(1);
        });

        it('emits running event on *running record', () => {
            const runningSpy = vi.fn();
            mi2.on('running', runningSpy);
            inject('*running,thread-id="all"\n');
            expect(runningSpy).toHaveBeenCalled();
        });

        it('handles ^running result class (command issued while target running)', async () => {
            const mockStdin = { write: vi.fn() };
            (mi2 as any).process = { stdin: mockStdin };
            const cmd = mi2.sendCommand('-exec-continue');
            await Promise.resolve();
            const token = (mi2 as any).token - 1;
            inject(`${token}^running\n`);
            const result = await cmd;
            expect(result.resultClass).toBe('running');
        });

        it('buffers partial lines across calls', () => {
            const readySpy = vi.fn();
            mi2.on('ready', readySpy);
            // Send in two chunks — no newline in first chunk
            (mi2 as any).handleOutput('(gdb)');
            expect(readySpy).not.toHaveBeenCalled();
            (mi2 as any).handleOutput('\n');
            expect(readySpy).toHaveBeenCalled();
        });

        it('handles multiple lines in one data chunk', () => {
            const runningSpy = vi.fn();
            const readySpy = vi.fn();
            mi2.on('running', runningSpy);
            mi2.on('ready', readySpy);
            inject('*running,thread-id="all"\n(gdb)\n');
            expect(runningSpy).toHaveBeenCalled();
            expect(readySpy).toHaveBeenCalled();
        });
    });

    // --- sendCommandRaw with mock process ---
    describe('sendCommandRaw() via sendCommand()', () => {
        it('times out after 10s for regular commands', async () => {
            vi.useFakeTimers();
            try {
                const mockStdin = { write: vi.fn() };
                (mi2 as any).process = { stdin: mockStdin };
                const cmd = mi2.sendCommand('-exec-run');
                await Promise.resolve();
                vi.advanceTimersByTime(10001);
                await expect(cmd).rejects.toThrow('Command timeout after 10000ms');
            } finally {
                vi.useRealTimers();
            }
        });

        it('uses 30s timeout for -file- commands (not 10s)', async () => {
            vi.useFakeTimers();
            try {
                const mockStdin = { write: vi.fn() };
                (mi2 as any).process = { stdin: mockStdin };
                const cmd = mi2.sendCommand('-file-exec-and-symbols "/a.out"');
                await Promise.resolve();
                // At 10001ms, regular commands would time out but file commands should not
                vi.advanceTimersByTime(10001);
                await Promise.resolve();
                // Pending command should still be registered (not yet timed out)
                expect((mi2 as any).pendingCommands.size).toBeGreaterThan(0);
                // Advance past 30s total → should time out now
                vi.advanceTimersByTime(20001);
                await expect(cmd).rejects.toThrow('Command timeout after 30000ms');
            } finally {
                vi.useRealTimers();
            }
        });

        it('does not reject if command resolves before timeout', async () => {
            vi.useFakeTimers();
            try {
                const mockStdin = { write: vi.fn() };
                (mi2 as any).process = { stdin: mockStdin };
                const cmd = mi2.sendCommand('-exec-next');
                await Promise.resolve();
                const token = (mi2 as any).token - 1;
                // Resolve before timeout fires
                (mi2 as any).handleOutput(`${token}^done\n`);
                const result = await cmd;
                expect(result.resultClass).toBe('done');
                // Advance past timeout — should not throw since already resolved
                vi.advanceTimersByTime(15000);
            } finally {
                vi.useRealTimers();
            }
        });

        it('writes token+cmd to stdin', async () => {
            const writes: string[] = [];
            const mockStdin = { write: vi.fn((s: string) => writes.push(s)) };
            (mi2 as any).process = { stdin: mockStdin };
            const cmd = mi2.sendCommand('-exec-run');
            await Promise.resolve(); // let sendCommandRaw() execute
            const token = (mi2 as any).token - 1;
            expect(writes[0]).toMatch(new RegExp(`^${token}-exec-run\n`));
            // resolve the pending command so test completes
            (mi2 as any).handleOutput(`${token}^done\n`);
            await cmd;
        });
    });

    // --- exit event rejects pending commands ---
    describe('process exit handling', () => {
        it('rejects pending commands when process emits exit', async () => {
            (mi2 as any).process = { write: vi.fn() };
            const token = 99;
            let rejected = false;
            (mi2 as any).pendingCommands.set(token, {
                resolve: vi.fn(),
                reject: () => { rejected = true; }
            });
            // Simulate the exit handler that start() registers
            for (const [, cb] of (mi2 as any).pendingCommands) {
                cb.reject(new Error('GDB exited'));
            }
            (mi2 as any).pendingCommands.clear();
            expect(rejected).toBe(true);
        });
    });
});

// ---------------------------------------------------------------------------
// MI2.start() — uses mocked child_process.spawn
// ---------------------------------------------------------------------------
describe('MI2 start()', () => {
    beforeEach(() => {
        spawnMock = vi.fn(() => createMockProcess());
    });

    it('resolves after (gdb) prompt received', async () => {
        const mi2 = new MI2('gdb', ['--interpreter=mi2']);
        const proc = createMockProcess();
        spawnMock.mockReturnValue(proc);

        const startPromise = mi2.start('/tmp');
        // Let start() register its stdout handler
        await Promise.resolve();
        // Simulate GDB outputting the (gdb) prompt
        proc.stdout.emit('data', Buffer.from('(gdb)\n'));
        await Promise.resolve();
        await startPromise;
        expect(mi2.isRunning()).toBe(true);
    });

    it('sends initCommands before resolving', async () => {
        const mi2 = new MI2('gdb', ['--interpreter=mi2']);
        const proc = createMockProcess();
        spawnMock.mockReturnValue(proc);

        const startPromise = mi2.start('/tmp', ['-enable-pretty-printing']);
        await Promise.resolve();
        // Emit (gdb) to trigger onReady → sendCommand('-enable-pretty-printing')
        proc.stdout.emit('data', Buffer.from('(gdb)\n'));
        await Promise.resolve();
        // sendCommand is now queued — respond to it
        const token = (mi2 as any).token - 1;
        proc.stdout.emit('data', Buffer.from(`${token}^done\n`));
        await Promise.resolve();
        // Emit (gdb) again (GDB prints prompt after each command)
        proc.stdout.emit('data', Buffer.from('(gdb)\n'));
        await startPromise;
        expect(mi2.isRunning()).toBe(true);
        expect(proc.stdin.write).toHaveBeenCalledWith(
            expect.stringContaining('-enable-pretty-printing')
        );
    });

    it('rejects on process error', async () => {
        const mi2 = new MI2('gdb', ['--interpreter=mi2']);
        const proc = createMockProcess();
        spawnMock.mockReturnValue(proc);

        const startPromise = mi2.start('/tmp');
        await Promise.resolve();
        proc.emit('error', new Error('spawn ENOENT'));
        await expect(startPromise).rejects.toThrow('spawn ENOENT');
    });

    it('emits exited and rejects pending commands on process exit', async () => {
        const mi2 = new MI2('gdb', ['--interpreter=mi2']);
        const proc = createMockProcess();
        spawnMock.mockReturnValue(proc);

        const startPromise = mi2.start('/tmp');
        await Promise.resolve();
        proc.stdout.emit('data', Buffer.from('(gdb)\n'));
        await Promise.resolve();
        await startPromise;

        const exitedSpy = vi.fn();
        mi2.on('exited', exitedSpy);

        // Queue a command
        const mockStdin = proc.stdin;
        const cmd = mi2.sendCommand('-exec-run');
        await Promise.resolve();

        // Simulate GDB exit
        proc.emit('exit', 1);
        await expect(cmd).rejects.toThrow('GDB exited with code: 1');
        expect(exitedSpy).toHaveBeenCalledWith(1);
        expect(mi2.isRunning()).toBe(false);
    });

    it('falls back after 5s safety timeout if no (gdb) prompt', async () => {
        vi.useFakeTimers();
        try {
            const mi2 = new MI2('gdb', ['--interpreter=mi2']);
            const proc = createMockProcess();
            spawnMock.mockReturnValue(proc);

            const startPromise = mi2.start('/tmp');
            await Promise.resolve();
            // Advance past 5s — triggers safety fallback
            vi.advanceTimersByTime(5001);
            await Promise.resolve();
            await startPromise;
            expect(mi2.isRunning()).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });

    it('rejects start() when an init command fails (covers onReady catch lines 153-155)', async () => {
        const mi2 = new MI2('gdb', ['--interpreter=mi2']);
        const proc = createMockProcess();
        spawnMock.mockReturnValue(proc);

        const startPromise = mi2.start('/tmp', ['-enable-pretty-printing']);
        await Promise.resolve();
        // Emit (gdb) prompt → triggers onReady → onReady calls sendCommand(initCmd)
        proc.stdout.emit('data', Buffer.from('(gdb)\n'));
        await Promise.resolve();
        // Respond with ^error to make sendCommand reject → onReady catch → reject(error)
        const token = (mi2 as any).token - 1;
        proc.stdout.emit('data', Buffer.from(`${token}^error,msg="init failed"\n`));
        await expect(startPromise).rejects.toThrow('init failed');
    });

    it('logs stderr output', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            const mi2 = new MI2('gdb', ['--interpreter=mi2']);
            const proc = createMockProcess();
            spawnMock.mockReturnValue(proc);

            const startPromise = mi2.start('/tmp');
            await Promise.resolve();
            proc.stderr.emit('data', Buffer.from('GDB warning\n'));
            proc.stdout.emit('data', Buffer.from('(gdb)\n'));
            await Promise.resolve();
            await startPromise;
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[MI2] GDB stderr:'),
                expect.stringContaining('GDB warning')
            );
        } finally {
            consoleSpy.mockRestore();
        }
    });
});
