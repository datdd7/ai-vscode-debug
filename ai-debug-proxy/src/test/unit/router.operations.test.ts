/**
 * Router Operations Unit Tests
 * Tests that router correctly dispatches new PI3 operations to backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleRequest, setLaunchDelegate } from '../../server/router';
import { backendManager } from '../../backend/BackendManager';

// Full mock backend covering all IDebugBackend methods
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
    start: vi.fn(),
    continue: vi.fn(),
    setBreakpoint: vi.fn(),
    // Additional methods for full coverage
    attach: vi.fn(),
    terminate: vi.fn(),
    launch: vi.fn(),
    initialize: vi.fn(),
    stepOver: vi.fn(),
    stepIn: vi.fn(),
    stepOut: vi.fn(),
    pause: vi.fn(),
    jumpToLine: vi.fn(),
    runUntilLine: vi.fn(),
    removeBreakpoint: vi.fn(),
    getBreakpoints: vi.fn(),
    getStackTrace: vi.fn(),
    getVariables: vi.fn(),
    getArguments: vi.fn(),
    getGlobals: vi.fn(),
    evaluate: vi.fn(),
    getRegisters: vi.fn(),
    readMemory: vi.fn(),
    writeMemory: vi.fn(),
    listThreads: vi.fn(),
    switchThread: vi.fn(),
    getLastStopInfo: vi.fn(),
    getCapabilities: vi.fn(),
    isRunning: vi.fn().mockReturnValue(false),
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

    describe('Ping & Status', () => {
        it('GET /api/ping returns pong with operation list', async () => {
            const result = await handleRequest('GET', '/api/ping', null, {} as any);
            expect(result.statusCode).toBe(200);
            expect(result.body.data.message).toBe('pong');
            expect(Array.isArray(result.body.data.operations)).toBe(true);
        });

        it('GET /api/status returns session status', async () => {
            mockBackend.getLastStopInfo.mockResolvedValue({ reason: 'breakpoint-hit' });
            const result = await handleRequest('GET', '/api/status', null, {} as any);
            expect(result.statusCode).toBe(200);
            expect(result.body.data.hasActiveSession).toBe(true);
        });

        it('GET /api/debug/status also works (v2 compat)', async () => {
            mockBackend.getLastStopInfo.mockResolvedValue(undefined);
            const result = await handleRequest('GET', '/api/debug/status', null, {} as any);
            expect(result.statusCode).toBe(200);
        });

        it('GET /api/status returns isRunning true when backend running', async () => {
            mockBackend.isRunning.mockReturnValue(true);
            const result = await handleRequest('GET', '/api/status', null, {} as any);
            expect(result.body.data.isRunning).toBe(true);
            mockBackend.isRunning.mockReturnValue(false);
        });
    });

    describe('Create Debugger', () => {
        it('POST /api/debugger/create creates and initializes backend', async () => {
            mockBackend.initialize.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debugger/create', {
                backendType: 'gdb',
                gdbPath: '/usr/bin/gdb'
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(result.body.data.backendType).toBe('gdb');
        });

        it('returns 500 when backendType missing', async () => {
            const result = await handleRequest('POST', '/api/debugger/create', {}, {} as any);
            expect(result.statusCode).toBe(500);
            expect(result.body.error).toContain('backendType');
        });
    });

    describe('Execution Operations', () => {
        it('routes "next" to backend.stepOver()', async () => {
            mockBackend.stepOver.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', { operation: 'next' }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.stepOver).toHaveBeenCalled();
        });

        it('routes "step_in" to backend.stepIn()', async () => {
            mockBackend.stepIn.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', { operation: 'step_in' }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.stepIn).toHaveBeenCalled();
        });

        it('routes "step_out" to backend.stepOut()', async () => {
            mockBackend.stepOut.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', { operation: 'step_out' }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.stepOut).toHaveBeenCalled();
        });

        it('routes "pause" to backend.pause()', async () => {
            mockBackend.pause.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', { operation: 'pause' }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.pause).toHaveBeenCalled();
        });

        it('routes "jump" to backend.jumpToLine()', async () => {
            mockBackend.jumpToLine.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'jump', params: { line: 42 }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.jumpToLine).toHaveBeenCalledWith(42, undefined);
        });

        it('routes "until" to backend.runUntilLine()', async () => {
            mockBackend.runUntilLine.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'until', params: { line: 55 }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.runUntilLine).toHaveBeenCalledWith(55, undefined);
        });
    });

    describe('Breakpoint Operations', () => {
        it('routes "remove_breakpoint" to backend.removeBreakpoint()', async () => {
            mockBackend.removeBreakpoint.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'remove_breakpoint', params: { location: { path: 'main.c', line: 10 } }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.removeBreakpoint).toHaveBeenCalled();
        });

        it('routes "get_active_breakpoints" to backend.getBreakpoints()', async () => {
            mockBackend.getBreakpoints.mockResolvedValue([]);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'get_active_breakpoints'
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.getBreakpoints).toHaveBeenCalled();
        });
    });

    describe('Inspection Operations', () => {
        it('routes "stack_trace" to backend.getStackTrace()', async () => {
            mockBackend.getStackTrace.mockResolvedValue([]);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'stack_trace'
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.getStackTrace).toHaveBeenCalled();
        });

        it('routes "get_variables" to backend.getVariables()', async () => {
            mockBackend.getVariables.mockResolvedValue([]);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'get_variables', params: { frameId: 0 }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.getVariables).toHaveBeenCalledWith(0);
        });

        it('routes "get_arguments" to backend.getArguments()', async () => {
            mockBackend.getArguments.mockResolvedValue([]);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'get_arguments'
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.getArguments).toHaveBeenCalled();
        });

        it('routes "get_globals" to backend.getGlobals()', async () => {
            mockBackend.getGlobals.mockResolvedValue([]);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'get_globals'
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.getGlobals).toHaveBeenCalled();
        });

        it('routes "evaluate" to backend.evaluate()', async () => {
            mockBackend.evaluate.mockResolvedValue({ result: '42' });
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'evaluate', params: { expression: 'x' }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.evaluate).toHaveBeenCalledWith('x', undefined);
        });

        it('routes "get_registers" to backend.getRegisters()', async () => {
            mockBackend.getRegisters.mockResolvedValue([]);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'get_registers'
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.getRegisters).toHaveBeenCalled();
        });

        it('routes "read_memory" to backend.readMemory()', async () => {
            mockBackend.readMemory.mockResolvedValue(Buffer.from('deadbeef', 'hex'));
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'read_memory', params: { memoryReference: '0x1000', count: 4 }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(result.body.data.data).toBe('deadbeef');
        });

        it('routes "write_memory" to backend.writeMemory()', async () => {
            mockBackend.writeMemory.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'write_memory', params: { address: 0x1000, data: 'deadbeef' }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.writeMemory).toHaveBeenCalled();
        });

        it('routes "list_threads" to backend.listThreads()', async () => {
            mockBackend.listThreads.mockResolvedValue([]);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'list_threads'
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.listThreads).toHaveBeenCalled();
        });

        it('routes "switch_thread" to backend.switchThread()', async () => {
            mockBackend.switchThread.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'switch_thread', params: { threadId: 2 }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.switchThread).toHaveBeenCalledWith(2);
        });

        it('routes "get_last_stop_info" to backend.getLastStopInfo()', async () => {
            mockBackend.getLastStopInfo.mockResolvedValue({ reason: 'breakpoint-hit' });
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'get_last_stop_info'
            }, {} as any);
            expect(result.statusCode).toBe(200);
        });

        it('routes "get_capabilities" to backend.getCapabilities()', async () => {
            mockBackend.getCapabilities.mockReturnValue({ operations: [] });
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'get_capabilities'
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.getCapabilities).toHaveBeenCalled();
        });

        it('routes "terminate" to backend.terminate()', async () => {
            mockBackend.terminate.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'terminate'
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.terminate).toHaveBeenCalled();
        });

        it('routes "attach" to backend.attach()', async () => {
            mockBackend.attach.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'attach', params: { processId: 1234 }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.attach).toHaveBeenCalled();
        });
    });

    describe('Launch Operation', () => {
        it('launch without delegate creates backend and calls launch()', async () => {
            setLaunchDelegate(null);
            mockBackend.initialize.mockResolvedValue(undefined);
            mockBackend.launch.mockResolvedValue(undefined);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'launch', params: { program: '/a.out', backendType: 'gdb' }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(result.body.sessionId).toBe('v3-session');
        });

        it('launch with delegate uses delegate and returns vscode session', async () => {
            setLaunchDelegate(async () => true);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'launch', params: { program: '/a.out' }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(result.body.sessionId).toBe('v3-session-vscode');
            setLaunchDelegate(null);
        });

        it('launch with delegate that returns false → 500', async () => {
            setLaunchDelegate(async () => false);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'launch', params: {}
            }, {} as any);
            expect(result.statusCode).toBe(500);
            setLaunchDelegate(null);
        });
    });

    describe('Error Paths', () => {
        it('returns 500 when body is not an object', async () => {
            const result = await handleRequest('POST', '/api/debug', null, {} as any);
            expect(result.statusCode).toBe(500);
        });

        it('returns 500 when operation field missing', async () => {
            const result = await handleRequest('POST', '/api/debug', { params: {} }, {} as any);
            expect(result.statusCode).toBe(500);
            expect(result.body.error).toContain('operation');
        });

        it('returns 500 for unknown route', async () => {
            const result = await handleRequest('GET', '/api/unknown', null, {} as any);
            expect(result.statusCode).toBe(500);
        });

        it('sanitizes internal paths in error messages (ADP-024)', async () => {
            mockBackend.getStackTrace.mockRejectedValue(new Error('Failed at /home/user/project/src/main.c:42'));
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'stack_trace'
            }, {} as any);
            expect(result.statusCode).toBe(500);
            expect(result.body.error).not.toContain('/home/user');
            expect(result.body.error).toContain('[path]');
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

    describe('No-backend guard (line 256)', () => {
        it('returns 500 when no backend is initialized for non-launch op', async () => {
            vi.spyOn(backendManager, 'getCurrentBackend').mockReturnValueOnce(undefined as any);
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'continue'
            }, {} as any);
            expect(result.statusCode).toBe(500);
            expect(result.body.error).toContain('No debug backend initialized');
        });
    });

    describe('get_source operation', () => {
        it('routes "get_source" to backend.getSource()', async () => {
            mockBackend.getSource.mockResolvedValue('int main() { ... }');
            const result = await handleRequest('POST', '/api/debug', {
                operation: 'get_source',
                params: { expression: '/src/main.c' }
            }, {} as any);
            expect(result.statusCode).toBe(200);
            expect(mockBackend.getSource).toHaveBeenCalledWith('/src/main.c');
        });
    });
});
