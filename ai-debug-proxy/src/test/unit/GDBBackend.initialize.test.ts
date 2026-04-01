/**
 * GDBBackend.initialize() and log() Unit Tests
 * Covers lines 67 (log catch) and 78-118 (initialize method)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs to allow controlling appendFileSync behaviour
vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return { ...actual, appendFileSync: vi.fn().mockImplementation(actual.appendFileSync) };
});

// Mock MI2 before importing GDBBackend so GDBBackend picks up the mock
vi.mock('../../protocol/mi2/MI2', () => ({
    MI2: vi.fn().mockImplementation((): any => ({
        on: vi.fn(),
        start: vi.fn().mockResolvedValue(undefined),
        kill: vi.fn(),
        removeListener: vi.fn(),
    }))
}));

import * as fs from 'fs';
import { GDBBackend } from '../../backend/GDBBackend';
import { MI2 } from '../../protocol/mi2/MI2';

const getMI2Instance = () => (vi.mocked(MI2)).mock.results[0]?.value;

describe('GDBBackend - initialize()', () => {
    let backend: GDBBackend;

    beforeEach(() => {
        vi.clearAllMocks();
        // Restore default mock implementation after clearAllMocks resets it
        vi.mocked(MI2).mockImplementation((): any => ({
            on: vi.fn(),
            start: vi.fn().mockResolvedValue(undefined),
            kill: vi.fn(),
            removeListener: vi.fn(),
        }));
        backend = new GDBBackend();
    });

    it('creates MI2 with gdbPath and calls start()', async () => {
        await backend.initialize({ backendType: 'gdb', gdbPath: '/usr/bin/gdb' });
        expect(vi.mocked(MI2)).toHaveBeenCalledWith('/usr/bin/gdb', ['--interpreter=mi2']);
        expect(getMI2Instance().start).toHaveBeenCalled();
    });

    it('uses default "gdb" when gdbPath not provided', async () => {
        await backend.initialize({ backendType: 'gdb' });
        expect(vi.mocked(MI2)).toHaveBeenCalledWith('gdb', ['--interpreter=mi2']);
    });

    it('sets running=false after start()', async () => {
        await backend.initialize({ backendType: 'gdb' });
        expect((backend as any).running).toBe(false);
    });

    it('stores config', async () => {
        const config = { backendType: 'gdb' as const, gdbPath: 'gdb' };
        await backend.initialize(config);
        expect((backend as any).config).toBe(config);
    });

    it('registers msg, stopped, running, exited listeners on mi2', async () => {
        await backend.initialize({ backendType: 'gdb' });
        const events = getMI2Instance().on.mock.calls.map((c: any[]) => c[0]);
        expect(events).toContain('msg');
        expect(events).toContain('stopped');
        expect(events).toContain('running');
        expect(events).toContain('exited');
    });

    it('stopped handler: sets running=false, emits stopped, stores lastStopEvent', async () => {
        await backend.initialize({ backendType: 'gdb' });
        const stoppedCb = getMI2Instance().on.mock.calls.find((c: any[]) => c[0] === 'stopped')[1];
        const spy = vi.fn();
        backend.on('stopped', spy);
        (backend as any).running = true;
        stoppedCb({ reason: 'breakpoint-hit', threadId: 1 });
        expect((backend as any).running).toBe(false);
        expect(spy).toHaveBeenCalled();
        expect((backend as any).lastStopEvent).toBeDefined();
    });

    it('running handler: sets running=true and emits running', async () => {
        await backend.initialize({ backendType: 'gdb' });
        const runningCb = getMI2Instance().on.mock.calls.find((c: any[]) => c[0] === 'running')[1];
        const spy = vi.fn();
        backend.on('running', spy);
        runningCb();
        expect((backend as any).running).toBe(true);
        expect(spy).toHaveBeenCalled();
    });

    it('exited handler: sets running=false and emits exited with code', async () => {
        await backend.initialize({ backendType: 'gdb' });
        const exitedCb = getMI2Instance().on.mock.calls.find((c: any[]) => c[0] === 'exited')[1];
        const spy = vi.fn();
        backend.on('exited', spy);
        exitedCb(1);
        expect((backend as any).running).toBe(false);
        expect(spy).toHaveBeenCalledWith(1);
    });

    it('msg handler calls log() (coverage for line 85)', async () => {
        await backend.initialize({ backendType: 'gdb' });
        const msgCb = getMI2Instance().on.mock.calls.find((c: any[]) => c[0] === 'msg')[1];
        // Should not throw
        expect(() => msgCb('test output')).not.toThrow();
    });

    it('log() catch block silently ignores fs.appendFileSync errors (line 67)', async () => {
        vi.mocked(fs.appendFileSync).mockImplementationOnce(() => {
            throw new Error('disk full');
        });
        // initialize() calls log() which calls appendFileSync — error must be ignored
        await expect(backend.initialize({ backendType: 'gdb' })).resolves.toBeUndefined();
    });
});
