/******************************************************************************
 * @file        DebugController.ts
 *
 * @brief       Main debug controller facade for DAP operations.
 *
 * @details
 * This module implements a facade pattern wrapping the VS Code debug API.
 * it translates incoming HTTP requests into Debug Adapter Protocol (DAP)
 * operations and manages session-related state.
 *
 * @project     AI Debug Proxy
 * @component   Debug Controller Module
 *
 * @author      Antigravity
 * @date        2026-03-11
 *
 ******************************************************************************/

/******************************************************************************
 * Revision History
 *
 * Version    Date        Author      Description
 * ---------------------------------------------------------------------------
 * 1.0        2026-03-11  Antigravity Initial implementation
 * 1.1        2026-03-11  Antigravity Added operation map pattern
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-1         DebugController Interface - Facade pattern for DAP operations
 * DD-1.1       Session Management operations
 * DD-1.2       Execution Control operations
 * DD-1.3       Breakpoint Management operations
 * DD-1.4       State Inspection operations
 *
 * Architecture Requirements:
 * ARCH-2       Debug Controller Pattern [Satisfies $SW SW-2]
 * ARCH-4       Session State Management [Satisfies $SW SW-4]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import { logger } from "../utils/logging";
import { validateOperationArgs } from "../utils/validation";
import type { WatchParams } from "../types";
import {
    launchSession,
    restartSession,
    quitSession,
    ensureActiveSession,
} from "./session";
import {
    setBreakpoint,
    setTempBreakpoint,
    removeBreakpointByLocation,
    removeAllBreakpointsInFile,
    toggleBreakpoint,
    ignoreBreakpoint,
    setBreakpointCondition,
    getActiveBreakpoints,
    getDataBreakpointInfo,
    setDataBreakpoint,
    setBreakpoints,
} from "./breakpoints";
import {
    continueExecution,
    nextStep,
    stepIn,
    stepOut,
    jumpToLine,
    listThreads,
    switchThread,
} from "./execution";
import {
    getRegisters,
    readMemory,
    disassemble,
} from "./hardware";
import {
    getStackTrace,
    getStackFrameVariables,
    listAllLocals,
    listSource,
    frameUp,
    frameDown,
    gotoFrame,
    getSource,
    evaluate,
    prettyPrint,
    whatis,
    executeStatement,
} from "./inspection";
import {
    onDapStopEvent,
    getLastStopEventBody,
    getLastStopSessionId,
    getCurrentTopFrameId,
} from "./events";
import type { SourceLocation, GetLastStopInfoResult } from "../types";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "Controller";

type OperationFn = (args?: any) => Promise<any>;

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-1
 *
 * @brief Debug Controller with operation map for HTTP routing.
 *
 * Provides a unified entry point for all debugging operations,
 * supporting session management, execution control, and inspection.
 *
 * Responsibilities:
 * * Operation dispatching
 * * Virtual breakpoint management
 * * Stop event handling
 *
 * [Satisfies $ARCH ARCH-2]
 */
class DebugController {
    private tempBreakpoints = new Map<string, vscode.SourceBreakpoint>();
    private operationMap: Record<string, OperationFn>;

    constructor() {
        this.operationMap = this.buildOperationMap();

        // Auto-remove temp breakpoints on stop
        onDapStopEvent((_sessionId, body) => {
            if (body?.reason === "breakpoint" && this.tempBreakpoints.size > 0) {
                this.handleTempBreakpointHit();
            }
        });
    }

    /**
     * @brief Build the operation map.
     *
     * Maps operation names to controller methods.
     *
     * @return Operation map object.
     *
     * [Satisfies $ARCH-2]
     */
    private buildOperationMap(): Record<string, OperationFn> {
        return {
            // Session Management $DD-1.1
            launch: (args) => launchSession(args || {}),
            restart: () => restartSession(),
            quit: () => quitSession(),

            // Execution Control $DD-1.2
            continue: () => continueExecution(ensureActiveSession("continue")),
            next: () => nextStep(ensureActiveSession("next")),
            step_in: () => stepIn(ensureActiveSession("step_in")),
            step_out: () => stepOut(ensureActiveSession("step_out")),
            jump: (args) => jumpToLine(ensureActiveSession("jump"), args),
            until: (args) => this.executeUntil(args),

            // Breakpoint Management $DD-1.3
            set_breakpoint: (args) => setBreakpoint(args),
            set_breakpoints: (args) => setBreakpoints(args), // AIVS-005: Batch operation
            set_temp_breakpoint: (args) => this.setTempBreakpointTracked(args),
            remove_breakpoint: (args) => removeBreakpointByLocation(args),
            remove_all_breakpoints_in_file: (args) =>
                removeAllBreakpointsInFile(args.filePath),
            disable_breakpoint: (args) =>
                toggleBreakpoint({ ...args, enable: false }),
            enable_breakpoint: (args) => toggleBreakpoint({ ...args, enable: true }),
            ignore_breakpoint: (args) => ignoreBreakpoint(args),
            set_breakpoint_condition: (args) => setBreakpointCondition(args),
            get_active_breakpoints: () => getActiveBreakpoints(),
            get_data_breakpoint_info: (args) => getDataBreakpointInfo(ensureActiveSession("get_data_breakpoint_info"), args),
            set_data_breakpoint: (args) => setDataBreakpoint(args),
            watch: (args) => this.watchVariable(args),

            // Hardware & Thread Management (Phase 3)
            list_threads: () => listThreads(ensureActiveSession("list_threads")),
            switch_thread: (args) => switchThread(ensureActiveSession("switch_thread"), args.threadId),
            get_registers: (args) => getRegisters(ensureActiveSession("get_registers"), args?.frameId),
            read_memory: (args) => readMemory(ensureActiveSession("read_memory"), args.memoryReference, args.offset, args.count),
            disassemble: (args) => disassemble(ensureActiveSession("disassemble"), args),

            // Stack & Code Inspection $DD-1.4
            stack_trace: () => getStackTrace(ensureActiveSession("stack_trace")),
            list_source: (args) =>
                listSource(ensureActiveSession("list_source"), args || {}),
            up: () => frameUp(ensureActiveSession("up")),
            down: () => frameDown(ensureActiveSession("down")),
            goto_frame: (args) => gotoFrame(ensureActiveSession("goto_frame"), args),
            get_source: (args) => getSource(ensureActiveSession("get_source"), args),

            // State Inspection & Evaluation $DD-1.4
            // Default scopeFilter to "Locals" only so ai_vars shows local vars distinct from args.
            // Callers may override by passing explicit scopeFilter in params.
            get_stack_frame_variables: (args) =>
                getStackFrameVariables(
                    ensureActiveSession("get_stack_frame_variables"),
                    { scopeFilter: ["Locals", "Local"], ...args },
                ),
            list_all_locals: (args) =>
                listAllLocals(ensureActiveSession("list_all_locals"), args?.frameId),
            get_args: (args) => this.getArgs(args || {}),
            evaluate: (args) => evaluate(ensureActiveSession("evaluate"), args),
            pretty_print: (args) =>
                prettyPrint(ensureActiveSession("pretty_print"), args),
            whatis: (args) => whatis(ensureActiveSession("whatis"), args),
            execute_statement: (args) =>
                executeStatement(ensureActiveSession("execute_statement"), args),

            // Status $DD-1.5
            get_last_stop_info: () => this.getLastStopInfo(),
        };
    }

    /**
     * $DD DD-1.6
     *
     * @brief Execute an operation by name.
     *
     * Dispatches the request to the appropriate DAP operation handler.
     *
     * @param [in]  operation   Name of the operation to execute.
     * @param [in]  params      Optional parameters for the operation.
     *
     * @return Promise resolving to the operation result.
     *
     * @throws Error if the operation is unknown.
     *
     * $ARCH ARCH-2
     */
    async executeOperation(operation: string, params?: any): Promise<any> {
        const fn = this.operationMap[operation];
        if (!fn) {
            throw new Error(`Unknown operation: '${operation}'`);
        }

        logger.info(LOG, `Executing: ${operation}`, params);
        const result = await fn(params);
        logger.info(LOG, `Result: ${operation}`, {
            success: result?.success,
            stopReason: result?.stopReason,
        });

        return result;
    }

    /**
     * @brief Get list of supported operations.
     *
     * @return Array of operation names.
     */
    getOperations(): string[] {
        return Object.keys(this.operationMap);
    }

    /**
     * @brief Execute a batch of operations.
     *
     * @param operations Array of { operation, params } objects.
     * @param parallel   If true, executes them concurrently using Promise.all().
     * @return Array of results mapping to the input operations.
     */
    async executeBatchOperations(
        operations: { operation: string; params?: any }[],
        parallel: boolean = false,
    ): Promise<any[]> {
        logger.info(LOG, `Executing batch of ${operations.length} operations (parallel: ${parallel})`);

        // Validate all operations first
        for (const op of operations) {
            if (!this.operationMap[op.operation]) {
                throw new Error(`Unknown operation in batch: '${op.operation}'`);
            }
            const validationResult = validateOperationArgs(op.operation, op.params);
            if (!validationResult.isValid) {
                throw new Error(`Validation failed for '${op.operation}': ${validationResult.message}`);
            }
            // Update params to validated params
            op.params = validationResult.params;
        }

        if (parallel) {
            return Promise.all(
                operations.map(async (op) => {
                    try {
                        const res = await this.operationMap[op.operation](op.params);
                        return { operation: op.operation, success: true, data: res };
                    } catch (e: any) {
                        return { operation: op.operation, success: false, error: e.message };
                    }
                }),
            );
        } else {
            const results = [];
            for (const op of operations) {
                try {
                    const res = await this.operationMap[op.operation](op.params);
                    results.push({ operation: op.operation, success: true, data: res });
                } catch (e: any) {
                    results.push({ operation: op.operation, success: false, error: e.message });
                    // Provide option to fail-fast or continue? For now, we continue and record the error.
                }
            }
            return results;
        }
    }

    /**************************************************************************
     * Internal Helpers
     **************************************************************************/

    private async setTempBreakpointTracked(params: any): Promise<any> {
        const result = await setTempBreakpoint(params);
        if (result.success) {
            const key = this.locationKey(params.location);
            // Find the actual SourceBreakpoint object just added by VS Code
            const uri = vscode.Uri.file(params.location.path);
            const line = params.location.line - 1; // 0-based
            const bp = vscode.debug.breakpoints.find(
                (b) =>
                    b instanceof vscode.SourceBreakpoint &&
                    b.location.uri.fsPath === uri.fsPath &&
                    b.location.range.start.line === line,
            ) as vscode.SourceBreakpoint | undefined;

            if (bp) {
                this.tempBreakpoints.set(key, bp);
                logger.debug(LOG, `Registered temp breakpoint: ${key}`);
            }
        }
        return result;
    }

    private async handleTempBreakpointHit(): Promise<void> {
        try {
            const session = vscode.debug.activeDebugSession;
            if (!session) return;

            const trace = await getStackTrace(session);
            if (!trace.success || trace.frames.length === 0) return;

            const top = trace.frames[0];
            const key = this.locationKey({ path: top.sourcePath, line: top.line });
            const bp = this.tempBreakpoints.get(key);

            if (bp) {
                logger.debug(LOG, `Removing temp breakpoint: ${key}`);
                vscode.debug.removeBreakpoints([bp]);
                this.tempBreakpoints.delete(key);
            }
        } catch (e: any) {
            logger.warn(LOG, `Error handling temp breakpoint: ${e.message}`);
        }
    }

    private async executeUntil(params: any): Promise<any> {
        const session = ensureActiveSession("until");
        const trace = await getStackTrace(session);
        if (!trace.success || trace.frames.length === 0) {
            return {
                success: false,
                errorMessage: "Cannot get current frame for 'until'",
            };
        }

        const currentFile = trace.frames[0].sourcePath;
        if (!currentFile) {
            return {
                success: false,
                errorMessage: "No source path for current frame",
            };
        }

        const tempResult = await this.setTempBreakpointTracked({
            location: { path: currentFile, line: params.line },
        });
        if (!tempResult.success) {
            return {
                success: false,
                errorMessage: `Failed to set temp breakpoint: ${tempResult.errorMessage}`,
            };
        }

        return continueExecution(session);
    }

    private async getArgs(params: { frameId?: number; scopeFilter?: string[] }): Promise<any> {
        const session = ensureActiveSession("get_args");
        // Try dedicated argument scopes first (some adapters expose these separately)
        const result = await getStackFrameVariables(session, {
            frameId: params.frameId,
            scopeFilter: params.scopeFilter || ["Arguments", "Args", "Parameters"],
        });
        // cppdbg puts everything in "Locals" — fall back when no argument scope found
        if (result.success && result.scopes.every((s) => s.variables.length === 0)) {
            return getStackFrameVariables(session, {
                frameId: params.frameId,
                scopeFilter: ["Locals", "Local"],
            });
        }
        return result;
    }

    private async watchVariable(params: WatchParams): Promise<any> {
        const session = ensureActiveSession("watch");
        const accessType = params.accessType || "write";
        const frameId = getCurrentTopFrameId();

        if (frameId === undefined) {
            return { success: false, errorMessage: "No frame available. Ensure debugger is stopped at a breakpoint." };
        }

        // Step 1: Find the SCOPE's variablesReference that contains the variable.
        // DAP dataBreakpointInfo requires the container's reference, not the variable's own.
        let scopeRef: number | undefined;
        try {
            const scopesRes = await session.customRequest("scopes", { frameId });
            for (const scope of scopesRes.scopes || []) {
                if (scope.expensive) continue;
                const varsRes = await session.customRequest("variables", {
                    variablesReference: scope.variablesReference,
                });
                const found = (varsRes.variables || []).find((v: any) => v.name === params.name);
                if (found) {
                    scopeRef = scope.variablesReference;
                    break;
                }
            }
        } catch (e: any) {
            return { success: false, errorMessage: `Cannot get variables: ${e.message}` };
        }

        if (scopeRef === undefined) {
            return {
                success: false,
                errorMessage: `Variable '${params.name}' not found in current scope. Ensure the debugger is stopped at a frame where it is visible.`,
            };
        }

        // Step 2: Get data breakpoint info using the scope's variablesReference
        const infoResult = await getDataBreakpointInfo(session, {
            name: params.name,
            variablesReference: scopeRef,
        });

        if (!infoResult.success || !infoResult.dataId) {
            return {
                success: false,
                errorMessage: infoResult.errorMessage
                    || `Watchpoint not supported for '${params.name}'. Check that your debug adapter supports data breakpoints.`,
            };
        }

        // Step 3: Set the data breakpoint via DAP, fall back to GDB MI on failure
        try {
            const bpResult = await setDataBreakpoint({
                dataId: infoResult.dataId,
                accessType,
                condition: params.condition,
            });
            if (bpResult.success) {
                return { ...bpResult, dataId: infoResult.dataId, accessType };
            }
        } catch {
            // Fall through to GDB fallback
        }

        // Fallback: use GDB watch/rwatch/awatch command directly via repl.
        // Bypass our evaluate() wrapper (which filters GDB output) and call DAP directly.
        const gdbCmd = accessType === "read" ? `rwatch ${params.name}`
            : accessType === "readWrite" ? `awatch ${params.name}`
                : `watch ${params.name}`;
        try {
            const res = await session.customRequest("evaluate", {
                expression: gdbCmd,
                frameId,
                context: "repl",
            });
            // GDB returns something like "Hardware watchpoint 2: errorCode" on success
            if (res.result && !res.result.toLowerCase().includes("error")) {
                return { success: true, method: "gdb", command: gdbCmd, result: res.result, accessType };
            }
            return { success: false, errorMessage: res.result || `GDB '${gdbCmd}' returned no result` };
        } catch (e: any) {
            return { success: false, errorMessage: `Failed to set watchpoint: ${e.message}` };
        }
    }

    private async getLastStopInfo(): Promise<GetLastStopInfoResult> {
        const body = getLastStopEventBody();
        const sessionId = getLastStopSessionId();

        if (!body || !sessionId) {
            return { success: false, errorMessage: "No stop event recorded" };
        }
        return { success: true, sessionId, stopInfo: body };
    }

    private locationKey(loc: SourceLocation): string {
        try {
            return `${vscode.Uri.file(loc.path).toString()}:${loc.line}`;
        } catch {
            return `${loc.path}:${loc.line}`;
        }
    }
}

/******************************************************************************
 * Module Exports
 ******************************************************************************/

export const debugController = new DebugController();

/******************************************************************************
 * End of File
 ******************************************************************************/
