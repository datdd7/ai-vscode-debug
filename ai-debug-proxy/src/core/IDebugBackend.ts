/**
 * @file IDebugBackend.ts
 * @module core
 * @description Debug Backend Interface — the central contract for all debug backend implementations.
 *
 * This file defines the abstraction layer between the AI Debug Proxy and
 * specific debugger implementations (GDB, Lauterbach, etc.). All backends
 * must implement {@link IDebugBackend} to be usable by the proxy.
 *
 * @architecture Layer 0 (Core) — no dependencies on other layers.
 * @see {@link file://docs/arch/03-class-diagram.puml} for class relationships.
 */

import { EventEmitter } from 'events';

// ─── Configuration Types ────────────────────────────────────────────────────

/**
 * Backend configuration passed during {@link IDebugBackend.initialize}.
 *
 * @example
 * ```ts
 * const config: BackendConfig = {
 *   backendType: 'gdb',
 *   gdbPath: '/usr/bin/gdb'
 * };
 * ```
 */
export interface BackendConfig {
    /** Selects the debugger backend implementation. */
    backendType: 'gdb' | 'lauterbach';
    /** Path to the GDB executable. Defaults to 'gdb' if omitted. */
    gdbPath?: string;
    /** Lauterbach TRACE32 host address (e.g., 'localhost'). */
    lauterbachHost?: string;
    /** Lauterbach TRACE32 API port (default: 20000). */
    lauterbachPort?: number;
}

/**
 * Parameters for launching a new debug session.
 *
 * @example
 * ```ts
 * await backend.launch({
 *   program: '/path/to/binary',
 *   stopOnEntry: true
 * });
 * ```
 */
export interface LaunchParams {
    /** Absolute path to the target executable. */
    program: string;
    /** Working directory for the debuggee. Defaults to program's directory. */
    cwd?: string;
    /** If true, stop at main() on launch. Defaults to true. */
    stopOnEntry?: boolean;
}

/**
 * Parameters for attaching to a running process.
 */
export interface AttachParams {
    /** OS process ID to attach to. */
    processId: number;
}

// ─── Data Types ─────────────────────────────────────────────────────────────

/**
 * A source code location (file + line number).
 * Used for breakpoints and navigation commands.
 */
export interface SourceLocation {
    /** Absolute path to the source file. */
    path: string;
    /** 1-based line number in the source file. */
    line: number;
}

/**
 * A single frame in the call stack.
 * Returned by {@link IDebugBackend.getStackTrace}.
 */
export interface StackFrame {
    /** Unique frame identifier (0 = top frame). */
    id: number;
    /** Function name at this frame (e.g., 'main', 'Os_MainFunction'). */
    name: string;
    /** Absolute path to the source file. */
    path: string;
    /** 1-based line number in the source file. */
    line: number;
    /** 1-based column number (0 if unavailable). */
    column: number;
}

/**
 * Information about a thread in the debuggee.
 * Returned by {@link IDebugBackend.listThreads}.
 */
export interface ThreadInfo {
    /** GDB thread ID. */
    id: number;
    /** Thread name or target-id (e.g., "Thread 0x7ffff7..."). */
    name: string;
    /** Thread state: 'stopped' or 'running'. */
    state: string;
    /** Top stack frame if the thread is stopped. */
    frame?: StackFrame;
}

/**
 * A variable or expression result.
 * Returned by inspection operations ({@link IDebugBackend.getVariables}, {@link IDebugBackend.evaluate}).
 */
export interface Variable {
    /** Variable name (e.g., 'iteration', 'coolantTemp'). */
    name: string;
    /** String representation of the value (e.g., '42', '{x=1, y=2}'). */
    value: string;
    /** C type (e.g., 'int', 'uint8_t', 'struct RteData'). */
    type?: string;
    /** Non-zero if this variable has expandable children (structs/arrays). */
    variablesReference?: number;
    /** Number of child elements (for arrays/structs). */
    children?: number;
}

/**
 * A breakpoint set in the debugger.
 */
export interface Breakpoint {
    /** Backend-assigned breakpoint identifier (e.g., GDB breakpoint number). */
    id: string;
    /** Whether GDB confirmed the breakpoint was placed successfully. */
    verified: boolean;
    /** Actual line where the breakpoint was placed (may differ from requested). */
    line: number;
    /** Absolute path to the source file. */
    file: string;
}

/**
 * Event emitted when the debuggee stops execution.
 * Stored as {@link IDebugBackend.getLastStopInfo} for AI agent polling.
 *
 * @see {@link file://docs/arch/06-state-machine.puml} for state transitions.
 */
export interface StopEvent {
    /**
     * Why the program stopped:
     * - `'breakpoint'` — Hit a breakpoint
     * - `'step'` — Completed a step operation (next/stepIn/stepOut)
     * - `'pause'` — User-initiated interrupt (SIGINT)
     * - `'exception'` — Signal received (SIGSEGV, etc.)
     * - `'entry'` — Stopped on entry (stopOnEntry=true)
     * - `'exited'` — Program terminated
     */
    reason: 'breakpoint' | 'step' | 'exception' | 'pause' | 'entry' | 'exited';
    /** Thread that stopped (typically 1 for single-threaded targets). */
    threadId: number;
    /** Whether all threads stopped (true for GDB's all-stop mode). */
    allThreadsStopped?: boolean;
    /** Top stack frame at the stop location. */
    frame?: StackFrame;
}

/**
 * Capabilities advertised by a debug backend.
 * Used by the proxy to enable/disable features.
 */
export interface DebuggerCapabilities {
    /** Backend supports launching new processes. */
    supportsLaunch: boolean;
    /** Backend supports attaching to running processes. */
    supportsAttach: boolean;
    /** Backend supports hardware breakpoints (e.g., Lauterbach). */
    supportsHardwareBreakpoints: boolean;
    /** Backend supports data watchpoints. */
    supportsWatchpoints: boolean;
    /** Backend supports trace recording. */
    supportsTrace: boolean;
    /** Backend supports multi-core debugging. */
    supportsMultiCore: boolean;
    /** Backend supports multi-thread debugging. */
    supportsThreads?: boolean;
    /** Supported CPU architectures (e.g., ['arm', 'x86_64']). */
    supportedArchitectures: string[];
    /** Supported target types (e.g., ['native', 'remote', 'simulator']). */
    supportedTargets: string[];
}

// ─── Backend Interface ──────────────────────────────────────────────────────

/**
 * Debug Backend Interface.
 *
 * The central abstraction for all debug backend implementations. Extends
 * {@link EventEmitter} to support asynchronous notifications:
 *
 * **Events:**
 * - `'stopped'` — Emitted with a {@link StopEvent} when the program halts.
 * - `'running'` — Emitted when the program resumes execution.
 * - `'exited'` — Emitted with the exit code when the session terminates.
 * - `'output'` — Emitted with (text, category) for debuggee console output.
 *
 * @see {@link file://docs/arch/03-class-diagram.puml} for inheritance diagram.
 * @see {@link file://docs/arch/04-sequence-launch.puml} for lifecycle flow.
 */
export interface IDebugBackend extends EventEmitter {
    // ── Lifecycle ───────────────────────────────────────────────────────

    /** Initialize the backend with the given configuration. Must be called first. */
    initialize(config: BackendConfig): Promise<void>;
    /** Launch a new debug session with the given program. */
    launch(params: LaunchParams): Promise<void>;
    /** Attach to an already-running process. */
    attach(params: AttachParams): Promise<void>;
    /** Terminate the debug session and clean up resources. */
    terminate(): Promise<void>;
    /** Returns true if the debuggee is currently executing (not stopped). */
    isRunning(): boolean;

    // ── Execution Control ───────────────────────────────────────────────
    // These return immediately. The backend emits 'stopped' when the program halts.

    /** Start program execution after launch (called after configurationDone). */
    start(): Promise<void>;
    /** Resume execution from the current stop point. */
    continue(): Promise<void>;
    /** Step over the current line (execute one source line). */
    stepOver(): Promise<void>;
    /** Step into the next function call. */
    stepIn(): Promise<void>;
    /** Step out of the current function. */
    stepOut(): Promise<void>;
    /** Interrupt the running program (sends SIGINT). Maps to 'pause' reason. */
    pause(): Promise<void>;
    /** Jump to a specific line without executing intermediate code. */
    jumpToLine(line: number, file?: string): Promise<void>;
    /** Set a temporary breakpoint and continue until it's hit. */
    runUntilLine(line: number, file?: string): Promise<void>;
    /** Restart the debug session from the beginning. */
    restart(): Promise<void>;
    /** Move one frame up in the call stack. */
    frameUp(): Promise<void>;
    /** Move one frame down in the call stack. */
    frameDown(): Promise<void>;
    /** Jump to a specific frame by its ID. */
    gotoFrame(frameId: number): Promise<void>;

    // ── Breakpoints ─────────────────────────────────────────────────────

    /** Set a persistent breakpoint at the given source location. */
    setBreakpoint(location: SourceLocation): Promise<Breakpoint>;
    /** Set a one-shot breakpoint (auto-removed after first hit). */
    setTempBreakpoint(location: SourceLocation): Promise<Breakpoint>;
    /** Remove a breakpoint by its backend-assigned ID. */
    removeBreakpoint(id: string): Promise<void>;
    /** Remove all breakpoints in the specified file. */
    removeAllBreakpointsInFile(filePath: string): Promise<void>;
    /** List all currently active breakpoints. */
    getBreakpoints(): Promise<Breakpoint[]>;

    // ── Inspection ──────────────────────────────────────────────────────

    /** Get the call stack for the given thread. */
    getStackTrace(threadId?: number): Promise<StackFrame[]>;
    /** Get local variables in the current or specified frame. */
    getVariables(frameId?: number): Promise<Variable[]>;
    /** Get function arguments in the current or specified frame. */
    getArguments(frameId?: number): Promise<Variable[]>;
    /** Get global variables visible in the current context. */
    getGlobals(): Promise<Variable[]>;
    /**
     * Evaluate an expression in the debuggee's context.
     * @param expression - C expression (e.g., 'iteration', 'a + b', 'ptr->field').
     * @param frameId - Optional frame to evaluate in (defaults to top frame).
     * @returns Variable with the result value and type.
     * @throws Error if the expression is invalid or the variable is not in scope.
     */
    evaluate(expression: string, frameId?: number): Promise<Variable>;
    /** Read CPU register values. */
    getRegisters(): Promise<Variable[]>;
    /** Read raw memory from the target. */
    readMemory(address: number, length: number): Promise<Buffer>;
    /** Write raw memory to the target. */
    writeMemory(address: number, data: Buffer): Promise<void>;
    /** List source code lines around the current position. */
    listSource(params?: any): Promise<string>;
    /** Get source code around a specific location. */
    getSource(expression: string): Promise<string>;
    /** Pretty-print a complex expression (structs, arrays). */
    prettyPrint(expression: string): Promise<Variable>;
    /** Get the C type of an expression (GDB 'whatis' command). */
    whatis(expression: string): Promise<string>;
    /** Execute a statement with side effects (e.g., assignment). */
    executeStatement(statement: string): Promise<string>;
    /** List all local variables across all visible scopes. */
    listAllLocals(): Promise<Variable[]>;
    /** Get a compact preview of all scopes (locals + args + globals). */
    getScopePreview(): Promise<any>;

    // ── Threading ────────────────────────────────────────────────────────

    /** List all threads in the debuggee. */
    listThreads(): Promise<ThreadInfo[]>;
    /** Switch debugger focus to a specific thread. */
    switchThread(threadId: number): Promise<void>;

    // ── Info ─────────────────────────────────────────────────────────────

    /**
     * Get the last stop event. Used by the `/api/status` endpoint
     * to report why the debugger stopped.
     */
    getLastStopInfo(): Promise<StopEvent>;
    /** Get the capabilities of this backend implementation. */
    getCapabilities(): DebuggerCapabilities;
}
