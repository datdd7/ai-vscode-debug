/**
 * Router Operations Unit Tests
 * Tests that router correctly dispatches new PI3 operations to backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleRequest } from '../../server/router';
import { backendManager } from '../../backend/BackendManager';

// Mock backend
const mockBackend = {
    restart: vi.fn(),
    frameUp: vi.fn(),
    frameDown: vi.fn(),
    gotoFrame: vi.fn(),
    setTempBreakpoint: vi.fn(),
    removeAllBreakpointsInFile: vi.fn(),
    listSource: vi.fn(),
    getSource: vi.fn(),
    prettyPrint: vi.fn(),
    whatis: vi.fn(),
    executeStatement: vi.fn(),
    listAllLocals: vi.fn(),
    getScopePreview: vi.fn(),
    start: vi.fn(),          // ADP-010
    continue: vi.fn(),
    setBreakpoint: vi.fn(),
};

// Spy on backendManager
vi.spyOn(backendManager, 'createBackend').mockReturnValue(mockBackend as any);
vi.spyOn(backendManager, 'getCurrentBackend').mockReturnValue(mockBackend as any);

describe('Router - PI3 Operations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Frame Navigation', () => {
        it('routes "restart" to backend.restart()', async () => {
            mockBackend.restart.mockResolvedValue({});
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'restart'
            }, {} as any);
            expect(result.body.error).toBeUndefined();
            expect(result.statusCode).toBe(200);
            expect(mockBackend.restart).toHaveBeenCalled();
        });

        it('routes "up" to backend.frameUp()', async () => {
            mockBackend.frameUp.mockResolvedValue({});
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'up'
            }, {} as any);
            expect(mockBackend.frameUp).toHaveBeenCalled();
            expect(result.statusCode).toBe(200);
        });

        it('routes "down" to backend.frameDown()', async () => {
            mockBackend.frameDown.mockResolvedValue({});
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'down'
            }, {} as any);
            expect(mockBackend.frameDown).toHaveBeenCalled();
            expect(result.statusCode).toBe(200);
        });

        it('routes "goto_frame" to backend.gotoFrame()', async () => {
            mockBackend.gotoFrame.mockResolvedValue({});
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'goto_frame',
                params: { frameId: 5 }
            }, {} as any);
            expect(mockBackend.gotoFrame).toHaveBeenCalledWith(5);
            expect(result.statusCode).toBe(200);
        });
    });

    describe('Extended Breakpoints', () => {
        it('routes "set_temp_breakpoint" to backend.setTempBreakpoint()', async () => {
            mockBackend.setTempBreakpoint.mockResolvedValue({ id: 'tbp-1', verified: true });
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'set_temp_breakpoint',
                params: { location: { path: 'main.c', line: 42 } }
            }, {} as any);
            expect(mockBackend.setTempBreakpoint).toHaveBeenCalledWith({ path: 'main.c', line: 42 });
            expect(result.statusCode).toBe(200);
        });

        it('routes "remove_all_breakpoints_in_file" correctly', async () => {
            mockBackend.removeAllBreakpointsInFile.mockResolvedValue({});
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'remove_all_breakpoints_in_file',
                params: { filePath: 'main.c' }
            }, {} as any);
            expect(mockBackend.removeAllBreakpointsInFile).toHaveBeenCalledWith('main.c');
            expect(result.statusCode).toBe(200);
        });
    });

    describe('Extended Inspection', () => {
        it('routes "list_source" to backend.listSource()', async () => {
            mockBackend.listSource.mockResolvedValue('source code');
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'list_source'
            }, {} as any);
            expect(mockBackend.listSource).toHaveBeenCalled();
            expect(result.statusCode).toBe(200);
        });

        it('routes "pretty_print" to backend.prettyPrint()', async () => {
            mockBackend.prettyPrint.mockResolvedValue({ value: '42' });
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'pretty_print',
                params: { expression: 'x' }
            }, {} as any);
            expect(mockBackend.prettyPrint).toHaveBeenCalledWith('x');
            expect(result.statusCode).toBe(200);
        });

        it('routes "whatis" to backend.whatis()', async () => {
            mockBackend.whatis.mockResolvedValue('type = int');
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'whatis',
                params: { expression: 'x' }
            }, {} as any);
            expect(mockBackend.whatis).toHaveBeenCalledWith('x');
            expect(result.statusCode).toBe(200);
        });

        it('routes "execute_statement" to backend.executeStatement()', async () => {
            mockBackend.executeStatement.mockResolvedValue('output');
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'execute_statement',
                params: { statement: 'print x' }
            }, {} as any);
            expect(mockBackend.executeStatement).toHaveBeenCalledWith('print x');
            expect(result.statusCode).toBe(200);
        });

        it('routes "list_all_locals" to backend.listAllLocals()', async () => {
            mockBackend.listAllLocals.mockResolvedValue([]);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'list_all_locals'
            }, {} as any);
            expect(mockBackend.listAllLocals).toHaveBeenCalled();
            expect(result.statusCode).toBe(200);
        });

        it('routes "get_scope_preview" to backend.getScopePreview()', async () => {
            mockBackend.getScopePreview.mockResolvedValue({ locals: [], args: [] });
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'get_scope_preview'
            }, {} as any);
            expect(mockBackend.getScopePreview).toHaveBeenCalled();
            expect(result.statusCode).toBe(200);
        });
    });

    // ADP-010: start operation must be routable
    describe('Session Lifecycle', () => {
        it('routes "start" to backend.start()', async () => {
            mockBackend.start.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'start'
            }, {} as any);
            expect(mockBackend.start).toHaveBeenCalled();
            expect(result.statusCode).toBe(200);
        });
    });

    // ADP-008: validateOperationArgs must be called — invalid params return 400
    describe('Input Validation (ADP-008)', () => {
        it('returns 400 when goto_frame is missing frameId', async () => {
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'goto_frame',
                params: {}   // missing frameId
            }, {} as any);
            expect(result.statusCode).toBe(400);
            expect(result.body.success).toBe(false);
            expect(result.body.error).toContain('frameId');
        });

        it('returns 400 when evaluate is missing expression', async () => {
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'evaluate',
                params: {}
            }, {} as any);
            expect(result.statusCode).toBe(400);
            expect(result.body.error).toContain('expression');
        });

        it('returns 400 for unknown operation', async () => {
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'nonexistent_op'
            }, {} as any);
            expect(result.statusCode).toBe(400);
            expect(result.body.error).toContain('Unknown operation');
        });

        it('returns 200 for valid continue (no params required)', async () => {
            mockBackend.continue.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'continue'
            }, {} as any);
            expect(result.statusCode).toBe(200);
        });

        it('returns 200 for set_breakpoint with valid location', async () => {
            mockBackend.setBreakpoint.mockResolvedValue({ id: '1', verified: true, line: 10, file: 'a.c' });
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'set_breakpoint',
                params: { location: { path: '/src/a.c', line: 10 } }
            }, {} as any);
            expect(result.statusCode).toBe(200);
        });
    });
});
