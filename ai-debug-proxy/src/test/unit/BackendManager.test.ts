/**
 * BackendManager Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackendManager } from '../../backend/BackendManager';

// Helper: create a fresh BackendManager instance (bypasses singleton)
const freshManager = () => new (BackendManager as any)() as BackendManager;

describe('BackendManager', () => {
    let manager: BackendManager;

    beforeEach(() => {
        // Use a fresh instance per test to avoid singleton state pollution
        manager = freshManager();
    });

    describe('createBackend()', () => {
        it('should create GDB backend for type "gdb"', () => {
            const backend = manager.createBackend('gdb', {
                backendType: 'gdb',
                gdbPath: 'gdb'
            });
            expect(backend).toBeDefined();
        });

        it('should throw for lauterbach (not implemented)', () => {
            expect(() => {
                manager.createBackend('lauterbach', {
                    backendType: 'lauterbach',
                    lauterbachHost: 'localhost'
                });
            }).toThrow('Lauterbach backend not yet implemented');
        });

        it('should throw for unknown backend type', () => {
            expect(() => {
                manager.createBackend('unknown' as any, {
                    backendType: 'unknown' as any
                });
            }).toThrow('Unknown backend type: unknown');
        });

        it('should reuse existing backend instance', () => {
            const backend1 = manager.createBackend('gdb', {
                backendType: 'gdb',
                gdbPath: 'gdb'
            });
            const backend2 = manager.createBackend('gdb', {
                backendType: 'gdb',
                gdbPath: 'gdb'
            });
            expect(backend1).toBe(backend2);
        });
    });

    describe('getCurrentBackend()', () => {
        it('should return undefined if no backend created', () => {
            expect(manager.getCurrentBackend()).toBeUndefined();
        });

        it('should return current backend after creation', () => {
            const backend = manager.createBackend('gdb', { backendType: 'gdb' });
            expect(manager.getCurrentBackend()).toBe(backend);
        });
    });

    describe('setActiveBackend()', () => {
        it('stores backend and makes it retrievable', () => {
            const mockBackend = { terminate: vi.fn() } as any;
            manager.setActiveBackend(mockBackend);
            expect(manager.getCurrentBackend()).toBe(mockBackend);
        });

        it('registers backend under "mock" key', () => {
            const mockBackend = { terminate: vi.fn() } as any;
            manager.setActiveBackend(mockBackend);
            // A second setActiveBackend replaces the mock entry
            const anotherMock = { terminate: vi.fn() } as any;
            manager.setActiveBackend(anotherMock);
            expect(manager.getCurrentBackend()).toBe(anotherMock);
        });
    });

    describe('getOrCreateBackend()', () => {
        it('returns existing backend without calling initialize', async () => {
            const mockBackend = { terminate: vi.fn() } as any;
            manager.setActiveBackend(mockBackend);
            const result = await manager.getOrCreateBackend('gdb', { backendType: 'gdb' });
            expect(result).toBe(mockBackend);
        });

        it('creates and initializes backend when none exists', async () => {
            const initSpy = vi.fn().mockResolvedValue(undefined);
            // Inject mock GDBBackend by using setActiveBackend as a side effect
            // We call getOrCreateBackend on a fresh manager — it will call createBackend
            // then initialize(). We can spy on the resulting instance.
            const m = freshManager();
            // Override createBackend to return a mock
            const mockBackend = { initialize: initSpy, terminate: vi.fn() } as any;
            vi.spyOn(m, 'createBackend').mockReturnValue(mockBackend);
            const result = await m.getOrCreateBackend('gdb', { backendType: 'gdb' });
            expect(result).toBe(mockBackend);
            expect(initSpy).toHaveBeenCalled();
        });
    });

    describe('releaseBackend()', () => {
        it('releases current backend and clears it', async () => {
            manager.createBackend('gdb', { backendType: 'gdb' });
            expect(manager.getCurrentBackend()).toBeDefined();
            await manager.releaseBackend();
            expect(manager.getCurrentBackend()).toBeUndefined();
        });

        it('is a no-op when no current backend', async () => {
            await expect(manager.releaseBackend()).resolves.toBeUndefined();
        });
    });

    describe('releaseAllBackends()', () => {
        it('releases all backends and clears map', async () => {
            manager.createBackend('gdb', { backendType: 'gdb' });
            await manager.releaseAllBackends();
            expect(manager.getCurrentBackend()).toBeUndefined();
        });

        it('logs error but continues when a backend terminate() throws', async () => {
            const faultyBackend = {
                terminate: vi.fn().mockRejectedValue(new Error('terminate failed'))
            } as any;
            manager.setActiveBackend(faultyBackend);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            await expect(manager.releaseAllBackends()).resolves.toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[BackendManager] Error releasing backend:'),
                expect.any(String),
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });
    });

    describe('executeOperation()', () => {
        it('throws when no backend initialized', async () => {
            await expect(manager.executeOperation('getVariables')).rejects.toThrow(
                'No backend initialized'
            );
        });

        it('throws for unknown operation', async () => {
            const mockBackend = { terminate: vi.fn() } as any;
            manager.setActiveBackend(mockBackend);
            await expect(manager.executeOperation('nonExistentOp')).rejects.toThrow(
                'Unknown operation: nonExistentOp'
            );
        });

        it('calls method on backend and returns result', async () => {
            const mockBackend = {
                terminate: vi.fn(),
                getBreakpoints: vi.fn().mockResolvedValue([{ id: '1' }])
            } as any;
            manager.setActiveBackend(mockBackend);
            const result = await manager.executeOperation('getBreakpoints');
            expect(mockBackend.getBreakpoints).toHaveBeenCalled();
            expect(result).toEqual([{ id: '1' }]);
        });
    });

    describe('getInstance() singleton', () => {
        it('returns the same instance on repeated calls', () => {
            const a = BackendManager.getInstance();
            const b = BackendManager.getInstance();
            expect(a).toBe(b);
        });
    });
});
