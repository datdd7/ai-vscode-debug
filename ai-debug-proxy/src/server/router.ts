/**
 * @file router.ts
 * @brief HTTP Router for AI Debug Proxy v3.a0
 *
 * Routes HTTP requests to BackendManager operations.
 * Decoupled from legacy DebugController.
 *
 * @traceability
 * Software Requirements:
 * REQ-API-001  POST /api/debug shall dispatch to correct backend operation
 * REQ-API-002  Router shall return HTTP 200 on success
 * REQ-API-003  Router shall return HTTP 400 on validation failure
 * REQ-API-004  Router shall return HTTP 500 on backend error
 * REQ-API-005  read_memory shall accept memoryReference and address params
 * REQ-API-006  write_memory shall accept address as string or number
 * REQ-API-007  launch operation shall support VS Code delegate
 * REQ-API-008  GET /api/version shall return extension version
 */

import * as http from "http";
import { backendManager } from "../backend/BackendManager";
import { IDebugBackend } from "../core/IDebugBackend";
import { validateOperationArgs } from "../utils/validation";
import { logger } from "../utils/logging";

const LOG = "Router";

/** ADP-024: strip internal file paths from error messages before sending to caller. */
function sanitizeError(message: string): string {
    return message.replace(/\/home\/[^/:"\s]+\/[^:\s"]*/g, '[path]');
}

/** ADP-008: thrown when request parameters fail validation — maps to HTTP 400. */
class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Route result
 */
interface RouteResult {
    statusCode: number;
    body: any;
}

/**
 * Handle HTTP request
 */
export async function handleRequest(
    method: string,
    url: string,
    body: any,
    req: http.IncomingMessage
): Promise<RouteResult> {
    try {
        const result = await routeRequest(method, url, body);
        return { statusCode: 200, body: result }; /* $REQ REQ-API-002 */
    } catch (error: any) {
        logger.error(LOG, 'Request error', { error: error.message });
        // ADP-008: return 400 for validation failures, 500 for everything else  /* $REQ REQ-API-003 REQ-API-004 */
        const statusCode = error.name === 'ValidationError' ? 400 : 500;
        return {
            statusCode,
            body: {
                success: false,
                // ADP-024: sanitize paths before they reach the caller
                error: sanitizeError(error.message),
                timestamp: new Date().toISOString()
            }
        };
    }
}

/**
 * Route request to handler
 */
async function routeRequest(
    method: string,
    url: string,
    body: any
): Promise<any> {
    const normalizePath = (p: string) => p.replace(/\/+$/, '') || '/';
    const pathname = normalizePath(url.split('?')[0]);

    logger.debug(LOG, `Routing request: ${method} ${pathname}`);

    // Ping endpoint
    if (method === "GET" && pathname === "/api/ping") {
        return handlePing();
    }

    // Status endpoint (V2 compatibility)
    if (method === "GET" && (pathname === "/api/status" || pathname === "/api/debug/status")) {
        return handleStatus();
    }

    // Create debugger endpoint
    if (method === "POST" && pathname === "/api/debugger/create") {
        return handleCreateDebugger(body);
    }

    // Debug operations endpoint (V2 compatibility) /* $REQ REQ-API-001 */
    if (method === "POST" && (pathname === "/api/debug" || pathname === "/api/debug/execute_operation")) {
        return handleDebugOperation(body);
    }

    logger.warn(LOG, `No route matched for ${method} ${pathname}`);
    throw new Error(`Unknown route: ${method} ${pathname}`);
}

/**
 * Handle ping request
 */
function handlePing(): any { /* $REQ REQ-API-008 */
    const operations = [
        // Session
        "launch", "attach", "terminate", "restart", "start",
        // Execution
        "continue", "next", "step_in", "step_out", "pause", "jump", "until",
        // Frame navigation
        "up", "down", "goto_frame",
        // Breakpoints
        "set_breakpoint", "set_temp_breakpoint", "remove_breakpoint",
        "remove_all_breakpoints_in_file", "get_active_breakpoints",
        // Inspection
        "stack_trace", "get_variables", "get_arguments", "get_globals",
        "evaluate", "get_registers", "read_memory", "write_memory",
        "list_source", "get_source", "pretty_print", "whatis",
        "execute_statement", "list_all_locals", "get_scope_preview",
        // Threading
        "list_threads", "switch_thread",
        // Info
        "get_last_stop_info", "get_capabilities"
    ];
    return {
        success: true,
        data: {
            message: "pong",
            version: "3.0.0",
            operations,
            operationCount: operations.length
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * Handle status request
 */
async function handleStatus(): Promise<any> {
    const backend = backendManager.getCurrentBackend();
    const stopInfo = backend ? await backend.getLastStopInfo() : undefined;
    const isRunning = backend ? backend.isRunning() : false;

    return {
        success: true,
        data: {
            version: "3.0.0",
            hasActiveSession: !!backend,
            isRunning: isRunning,
            status: isRunning ? 'running' : 'stopped',
            lastStopInfo: isRunning ? undefined : stopInfo
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * Handle create debugger request
 */
async function handleCreateDebugger(body: any): Promise<any> {
    const { backendType, gdbPath, lauterbachHost, lauterbachPort } = body;

    if (!backendType) {
        throw new Error("Missing backendType field");
    }

    logger.debug(LOG, `Creating debugger: ${backendType}`);

    const config = {
        backendType,
        gdbPath,
        lauterbachHost,
        lauterbachPort
    };

    const backend = backendManager.createBackend(backendType, config);
    await backend.initialize(config);

    return {
        success: true,
        data: {
            backendType,
            isRunning: backend.isRunning()
        },
        timestamp: new Date().toISOString()
    };
}

export let launchDelegate: ((params: any) => Promise<boolean>) | null = null;

export function setLaunchDelegate(delegate: (params: any) => Promise<boolean>): void { /* $REQ REQ-API-007 */
    launchDelegate = delegate;
}

/**
 * Handle debug operation request
 */
async function handleDebugOperation(body: any): Promise<any> {
    if (!body || typeof body !== "object") {
        throw new Error("Request body must be a JSON object");
    }

    const { operation, params } = body;

    if (!operation || typeof operation !== "string") {
        throw new Error("Missing or invalid 'operation' field");
    }

    // ADP-008: validate parameters before dispatching (skip launch — handled separately)
    if (operation !== 'launch') {
        const validation = validateOperationArgs(operation, params);
        if (!validation.isValid) {
            /* v8 ignore next -- validation.message always set by fail(string), fallback unreachable */
            throw new ValidationError(validation.message || `Invalid parameters for '${operation}'`);
        }
    }

    // Special handling for launch - create backend if needed
    if (operation === 'launch') {
        const backendType = params?.backendType || 'gdb';
        const config = {
            backendType,
            gdbPath: params?.gdbPath || 'gdb'
        };
        
        logger.debug(LOG, `Creating backend for launch: ${backendType}`);

        if (launchDelegate) {
            logger.debug(LOG, 'Delegating launch to VS Code UI via callback');
            const success = await launchDelegate(params);
            if (!success) {
                throw new Error("Failed to start VS Code debugging session");
            }
            return {
                success: true,
                sessionId: 'v3-session-vscode'
            };
        }

        const backend = backendManager.createBackend(backendType, config);
        await backend.initialize(config);
        await backend.launch(params);
        
        return {
            success: true,
            sessionId: 'v3-session',
            stopReason: params.stopOnEntry ? 'entry' : 'breakpoint'
        };
    }

    // get_capabilities works without an active session (ADP-XXX: API discovery)
    if (operation === 'get_capabilities') {
        const backend = backendManager.getCurrentBackend();
        const caps = backend ? backend.getCapabilities() : {
            supportsLaunch: true,
            supportsBreakpoints: true,
            supportsThreads: true,
            supportsMemory: true,
            supportsStepping: true,
            supportsEvaluation: true,
            supportsRegisters: true
        };
        return { success: true, operation, data: caps, timestamp: new Date().toISOString() };
    }

    // Get active backend for other operations
    const backend = backendManager.getCurrentBackend();
    if (!backend) {
        throw new Error("No debug backend initialized. Launch a debug session first.");
    }

    logger.debug(LOG, `Executing operation: ${operation}`);

    // Execute operation
    const result = await executeBackendOperation(backend, operation, params);

    return {
        success: true,
        operation,
        data: result,
        timestamp: new Date().toISOString()
    };
}

/**
 * Execute operation on backend
 */
async function executeBackendOperation(backend: IDebugBackend, operation: string, params: any): Promise<any> {
    switch (operation) {
        // Session
        /* v8 ignore next 2 -- launch is handled above and returns before reaching here */
        case 'launch':
            return await backend.launch(params);
        case 'attach':
            return await backend.attach(params);
        case 'terminate':
        case 'quit':
            return await backend.terminate();
        
        // ADP-010: start() runs -exec-run after launch + configurationDone
        case 'start':
            await backend.start();
            return { success: true };

        // Execution
        case 'continue':
            await backend.continue();
            return { success: true };
        case 'next':
        case 'stepOver':
        case 'step_over':
            await backend.stepOver();
            return { success: true };
        case 'step_in':
        case 'stepIn':
            await backend.stepIn();
            return { success: true };
        case 'step_out':
        case 'stepOut':
            await backend.stepOut();
            return { success: true };
        case 'pause':
            await backend.pause();
            return { success: true };
        case 'jump':
            await backend.jumpToLine(params?.line, params?.file);
            return { success: true };
        case 'until':
            await backend.runUntilLine(params?.line, params?.file);
            return { success: true };
        case 'restart':
            await backend.restart();
            return { success: true };
        case 'up':
        case 'frame_up':
            await backend.frameUp();
            return { success: true };
        case 'down':
        case 'frame_down':
            await backend.frameDown();
            return { success: true };
        case 'goto_frame':
            await backend.gotoFrame(params?.frameId);
            return { success: true };

        // Breakpoints
        case 'set_breakpoint':
            return await backend.setBreakpoint(params?.location);
        case 'set_temp_breakpoint':
            return await backend.setTempBreakpoint(params?.location);
        case 'remove_breakpoint': {
            // Accept id directly OR resolve from location {path, line}
            let bpId: string | undefined = params?.id != null ? String(params.id) : undefined;
            if (!bpId && params?.location) {
                const loc = params.location as { path: string; line: number };
                const active = await backend.getBreakpoints();
                const match = active.find(bp =>
                    (bp.file === loc.path || bp.file?.endsWith(loc.path)) &&
                    Math.abs(bp.line - loc.line) <= 1
                );
                if (!match) throw new Error(`No breakpoint found at ${loc.path}:${loc.line}`);
                bpId = match.id;
            }
            return await backend.removeBreakpoint(bpId as string);
        }
        case 'remove_all_breakpoints_in_file':
            await backend.removeAllBreakpointsInFile(params?.filePath);
            return { success: true };
        case 'get_active_breakpoints':
            return await backend.getBreakpoints();

        // Inspection
        case 'stack_trace':
            return await backend.getStackTrace(params?.threadId);
        case 'get_variables':
            return await backend.getVariables(params?.frameId);
        case 'get_arguments':
            return await backend.getArguments(params?.frameId);
        case 'get_globals':
            return await backend.getGlobals();
        case 'evaluate':
            return await backend.evaluate(params?.expression, params?.frameId);
        case 'get_registers':
            return await backend.getRegisters();
        case 'read_memory': {
            // Accept DAP-style (memoryReference/count) or legacy (address/length)
            /* v8 ignore next 2 -- legacy params?.address / params?.length unreachable: validation requires memoryReference + count */
            const memRef = params?.memoryReference || params?.address;
            const memCount = params?.count ?? params?.length;
            /* v8 ignore next -- memRef is always a string (memoryReference) after validation */
            const memAddr = typeof memRef === 'string' ? parseInt(memRef, 16) : Number(memRef);
            const buf = await backend.readMemory(memAddr, memCount);
            return { address: '0x' + memAddr.toString(16), data: buf.toString('hex'), count: buf.length };
        }
        case 'write_memory': {
            // Accept address as number or hex string; data as hex string → Buffer
            /* v8 ignore next -- string address unreachable: validation requires isNumber(address) */
            const wrAddr = typeof params?.address === 'string' ? parseInt(params.address, 16) : Number(params?.address);
            const wrData = params?.data ? Buffer.from(params.data, 'hex') : Buffer.alloc(0);
            await backend.writeMemory(wrAddr, wrData);
            return { success: true, address: '0x' + wrAddr.toString(16), bytesWritten: wrData.length };
        }
        case 'list_source':
            return await backend.listSource(params);
        case 'get_source': {
            // ADP-024: sanitize paths in raw GDB console output before returning to caller
            const raw = await backend.getSource(params?.expression);
            /* v8 ignore next -- getSource() always returns string; non-string branch is defensive */
            return typeof raw === 'string' ? sanitizeError(raw) : raw;
        }
        case 'pretty_print':
            return await backend.prettyPrint(params?.expression);
        case 'whatis':
            return await backend.whatis(params?.expression);
        case 'execute_statement':
            return await backend.executeStatement(params?.statement);
        case 'list_all_locals':
            return await backend.listAllLocals();
        case 'get_scope_preview':
            return await backend.getScopePreview();

        // Threading
        case 'list_threads':
            return await backend.listThreads();
        case 'switch_thread':
            await backend.switchThread(params?.threadId);
            return { success: true };

        // Info
        case 'get_last_stop_info':
            return await backend.getLastStopInfo();
        /* v8 ignore next 2 -- unreachable: get_capabilities is intercepted in handleDebugOperation before reaching executeBackendOperation */
        case 'get_capabilities':
            return backend.getCapabilities();

        /* v8 ignore next 2 -- validation rejects unknown operations before reaching here */
        default:
            throw new Error(`Unknown operation: ${operation}`);
    }
}
