/**
 * BackendManager Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BackendManager } from '../../backend/BackendManager';

describe('BackendManager', () => {
    let manager: BackendManager;

    beforeEach(() => {
        manager = BackendManager.getInstance();
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
            // Create fresh manager
            const freshManager = new (BackendManager as any)();
            expect(freshManager.getCurrentBackend()).toBeUndefined();
        });

        it('should return current backend after creation', () => {
            const backend = manager.createBackend('gdb', {
                backendType: 'gdb',
                gdbPath: 'gdb'
            });
            expect(manager.getCurrentBackend()).toBe(backend);
        });
    });

    describe('releaseBackend()', () => {
        it('should release current backend', async () => {
            manager.createBackend('gdb', {
                backendType: 'gdb',
                gdbPath: 'gdb'
            });
            expect(manager.getCurrentBackend()).toBeDefined();
            
            await manager.releaseBackend();
            expect(manager.getCurrentBackend()).toBeUndefined();
        });
    });

    describe('releaseAllBackends()', () => {
        it('should release all backends', async () => {
            manager.createBackend('gdb', {
                backendType: 'gdb',
                gdbPath: 'gdb'
            });
            
            await manager.releaseAllBackends();
            expect(manager.getCurrentBackend()).toBeUndefined();
        });
    });
});
