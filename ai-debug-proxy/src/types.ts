/******************************************************************************
 * @file        types.ts
 *
 * @brief       Global type definitions for the AI Debug Proxy.
 *
 * @details
 * This file contains all shared interfaces, types, and enumerations used
 * throughout the extension. It defines the schemas for API requests,
 * debug operations, and their respective results.
 *
 * @project     AI Debug Proxy
 * @component   Common Types
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
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-SW-3      API Schema & Protocol
 *
 * Architecture Requirements:
 * ARCH-3       RESTful HTTP API over localhost
 ******************************************************************************/

/******************************************************************************
 * Basic Debug Types
 ******************************************************************************/

/** @brief Represents a location in a source file. */
export interface SourceLocation {
  path: string; /**< Absolute path to the source file. */
  line: number; /**< 1-based line number. */
  column?: number; /**< 1-based column number (optional). */
}

/** @brief Detailed information about a debugger breakpoint. */
export interface BreakpointInfo {
  id?: number; /**< Unique breakpoint identifier. */
  verified: boolean; /**< Whether the breakpoint has been verified by the debugger. */
  location: SourceLocation; /**< Source location of the breakpoint. */
  condition?: string; /**< Optional hit condition expression. */
  hitCondition?: string; /**< Optional hit count condition. */
  logMessage?: string; /**< Optional message for logpoints. */
  enabled: boolean; /**< Whether the breakpoint is currently enabled. */
}

/** @brief Information about a stack frame. */
export interface StackFrameInfo {
  id: number; /**< Frame identifier. */
  name: string; /**< Frame name (usually function/method name). */
  sourcePath: string; /**< Absolute path to the source file for this frame. */
  line: number; /**< 1-based line number in the source file. */
  column: number; /**< 1-based column number in the source file. */
}

/** @brief Information about a program variable. */
export interface VariableInfo {
  name: string; /**< Variable name. */
  value: string; /**< Current string representation of the variable's value. */
  type?: string; /**< Data type of the variable. */
  variablesReference: number; /**< Reference for retrieving child properties (0 if none). */
}

/******************************************************************************
 * API Request/Response Types
 ******************************************************************************/

/** @brief Generic HTTP API request structure. */
export interface ApiRequest {
  operation: string; /**< Name of the operation to perform. */
  params?: Record<string, any>; /**< Operation-specific parameters. */
}

/** @brief Generic HTTP API response structure. */
export interface ApiResponse {
  success: boolean; /**< Whether the operation was successful. */
  operation?: string; /**< Re-statement of the performed operation. */
  data?: any; /**< Payload containing operation results. */
  error?: string | ErrorInfo; /**< Human-readable error message or structured error on failure. */
  timestamp?: string; /**< ISO format timestamp of the response. */
}

/******************************************************************************
 * Debug Operation Param Types
 ******************************************************************************/

/** @brief Parameters for launching a new debug session. */
export interface LaunchParams {
  program?: string; /**< Path to the executable. */
  args?: string[]; /**< Command-line arguments. */
  cwd?: string; /**< Working directory. */
  env?: Record<string, string | null>; /**< Environment variables. */
  configName?: string; /**< Name of config in launch.json. */
  workspacePath?: string; /**< Root path for config resolution (AIVS-006). */
  stopOnEntry?: boolean; /**< Whether to stop at main(). */
  type?: string; /**< Debugger type (e.g., "cppdbg", "python"). */
  request?: "launch" | "attach"; /**< Request type. */
  miDebuggerPath?: string; /**< Path to GDB/LLDB executable. */
  MIMode?: "gdb" | "lldb"; /**< Debugger MI mode. */
  extra?: Record<
    string,
    unknown
  >; /**< Unstructured debugger-specific options. */
}

/** @brief Parameters for setting a breakpoint. */
export interface SetBreakpointParams {
  location: SourceLocation; /**< Where to set the breakpoint. */
  condition?: string; /**< Hit condition. */
  hitCondition?: string; /**< Hit count condition. */
  logMessage?: string; /**< Message for logpoints. */
}

/** @brief Parameters for setting multiple breakpoints (AIVS-005). */
export interface SetBreakpointsParams {
  file: string; /**< Source file path. */
  breakpoints: BreakpointLineParams[]; /**< Array of breakpoint locations. */
}

/** @brief Parameters for a single breakpoint in a batch. */
export interface BreakpointLineParams {
  line: number; /**< Line number. */
  column?: number; /**< Optional column number. */
  condition?: string; /**< Optional condition. */
  hitCondition?: string; /**< Optional hit count. */
  logMessage?: string; /**< Optional log message. */
}

/** @brief Result of setting multiple breakpoints (AIVS-005). */
export interface SetBreakpointsResult extends DebuggerResponse {
  breakpoints: BreakpointResult[]; /**< Array of breakpoint results. */
}

/** @brief Result of a single breakpoint operation. */
export interface BreakpointResult {
  id?: number; /**< Breakpoint ID. */
  line: number; /**< Line number. */
  verified: boolean; /**< Whether verified by debugger. */
  condition?: string; /**< Condition if set. */
  source?: string; /**< Source file path. */
}

/** @brief Parameters for getting data breakpoint info. */
export interface GetDataBreakpointInfoParams {
  name: string; /**< Variable name or expression to watch. */
  variablesReference?: number; /**< Reference to variable container if applicable. */
  frameId?: number; /**< Stack frame context. */
}

/** @brief Parameters for setting a data breakpoint (watchpoint). */
export interface SetDataBreakpointParams {
  dataId: string; /**< Data ID obtained from dataBreakpointInfo. */
  accessType?: "read" | "write" | "readWrite"; /**< Type of access to watch. */
  condition?: string; /**< Hit condition. */
  hitCondition?: string; /**< Hit count condition. */
}

/** @brief Parameters for removing a breakpoint. */
export interface RemoveBreakpointParams {
  location: SourceLocation; /**< Location of the breakpoint to remove. */
}

/** @brief Parameters for removing all breakpoints in a file. */
export interface RemoveAllBreakpointsInFileParams {
  filePath: string; /**< Absolute path to the source file. */
}

/** @brief Parameters for enabling/disabling a breakpoint. */
export interface ToggleBreakpointParams {
  location: SourceLocation; /**< Location of the breakpoint. */
  enable: boolean; /**< New enabled state. */
}

/** @brief Parameters for ignoring a breakpoint hits. */
export interface IgnoreBreakpointParams {
  location: SourceLocation; /**< Location of the breakpoint. */
  ignoreCount: number | null; /**< Number of hits to ignore. */
}

/** @brief Parameters for setting a breakpoint's logical condition. */
export interface SetBreakpointConditionParams {
  location: SourceLocation; /**< Location of the breakpoint. */
  condition: string | null; /**< Condition expression. */
}

/** @brief Parameters for jumping to a specific line. */
export interface JumpParams {
  frameId?: number; /**< Stack frame context. */
  line: number; /**< Target line number. */
}

/** @brief Parameters for stepping until a line is reached. */
export interface UntilParams {
  line: number; /**< Target line number. */
}

/** @brief Parameters for listing source code around a frame. */
export interface ListSourceParams {
  frameId?: number; /**< Stack frame context. */
  linesAround?: number; /**< Number of context lines. */
}

/** @brief Parameters for finding the source of a symbol/expression. */
export interface GetSourceParams {
  frameId?: number; /**< Stack frame context. */
  expression: string; /**< Symbol or expression to locate. */
}

/** @brief Parameters for retrieving variables in a stack frame. */
export interface GetStackFrameVariablesParams {
  frameId?: number; /**< Stack frame context. */
  scopeFilter?: string[]; /**< Optional list of scope names to retrieve. */
}

/** @brief Parameters for evaluating an expression. */
export interface EvaluateParams {
  frameId?: number; /**< Stack frame context. */
  expression: string; /**< Expression to evaluate. */
  context?: "watch" | "repl" | "hover"; /**< Evaluation context. */
}

/** @brief Parameters for executing a statement. */
export interface ExecuteStatementParams {
  frameId?: number; /**< Stack frame context. */
  statement: string; /**< Statement to execute. */
}

/** @brief Parameters for moving to a specific frame. */
export interface GotoFrameParams {
  frameId?: number; /**< Target frame identifier. */
}

/******************************************************************************
 * Debug Operation Result Types
 ******************************************************************************/

/** @brief Structured error information. */
export interface ErrorInfo {
  code: string; /**< Machine-readable error code. */
  message: string; /**< Human-readable error message. */
  suggestion?: string; /**< Optional suggestion for resolving the error. */
  details?: Record<string, any>; /**< Optional additional context. */
}

/** @brief Base interface for debugger responses. */
export interface DebuggerResponse {
  success: boolean; /**< Whether the debugger operation succeeded. */
  errorMessage?: string; /**< Detailed error message on failure. */
  error?: ErrorInfo; /**< Structured error information (AIVS-002). */
}

/** @brief Result of a launch operation. */
export interface LaunchResult extends DebuggerResponse {
  sessionId?: string; /**< Assigned session identifier. */
  frame?: StackFrameInfo; /**< Current stack frame if stopped. */
  stopReason?: string; /**< Reason for the stop (e.g., "entry"). */
}

/** @brief Result of a navigation operation (step, continue). */
export interface NavigationResult extends DebuggerResponse {
  frame?: StackFrameInfo; /**< Resulting stack frame. */
  exceptionMessage?: string; /**< Error message if an exception occurred. */
  stopReason?: string; /**< Reason for the resulting stop. */
  crashInfo?: { /**< Crash information for AI agents (auto-attached on crash). */
    reason: string; /**< Stop reason: exception, signal, breakpoint */
    description: string; /**< Human-readable error description */
    stackTrace?: any; /**< Auto-captured stack trace */
  };
}

/** @brief Result of setting a breakpoint. */
export interface SetBreakpointResult extends DebuggerResponse { }

/** @brief Result of a stack trace request. */
export interface StackTraceResult extends DebuggerResponse {
  frames: StackFrameInfo[]; /**< List of frames in the call stack. */
  totalFrames?: number; /**< Total number of frames available. */
}

/** @brief Result of a source listing request. */
export interface ListSourceResult extends DebuggerResponse {
  sourceCode?: string; /**< Formatted source code snippet. */
  currentLine?: number; /**< Current execution line. */
}

/** @brief Result of a symbol location request. */
export interface GetSourceResult extends DebuggerResponse {
  sourcePath?: string; /**< Path identified for the symbol. */
  line?: number; /**< Line identified for the symbol. */
}

/** @brief Result of retrieving active breakpoints. */
export interface GetActiveBreakpointsResult extends DebuggerResponse {
  breakpoints: BreakpointInfo[]; /**< List of active breakpoints. */
}

/** @brief Result of retrieving stack frame variables. */
export interface GetStackFrameVariablesResult extends DebuggerResponse {
  /** @brief Grouped variables by their respective scopes. */
  scopes: {
    name: string; /**< Scope name (e.g., "Local", "Global"). */
    variables: VariableInfo[]; /**< Variables within this scope. */
  }[];
}

/** @brief Result of an expression evaluation. */
export interface EvaluateResult extends DebuggerResponse {
  result: string; /**< Evaluated value string. */
  type?: string; /**< Result type. */
  variablesReference: number; /**< Reference for child inspection. */
}

/** @brief One field in a pretty-printed struct/array. */
export interface PrettyPrintField {
  name: string; /**< Field name. */
  type?: string; /**< Field type (if available). */
  value: string; /**< String representation of value. */
}

/** @brief Result of a pretty-print evaluation with optional field expansion. */
export interface PrettyPrintResult extends DebuggerResponse {
  result: string; /**< Top-level value string. */
  type?: string; /**< Type of the expression. */
  variablesReference: number; /**< Non-zero if children exist. */
  fields?: PrettyPrintField[]; /**< One level of expanded children (struct/array fields). */
}

/** @brief Parameters for setting a watchpoint on a variable. */
export interface WatchParams {
  name: string; /**< Variable name to watch. */
  accessType?: "read" | "write" | "readWrite"; /**< Access type (default: "write"). */
  condition?: string; /**< Optional hit condition. */
}

/** @brief Information about the most recent stop event. */
export interface GetLastStopInfoResult extends DebuggerResponse {
  sessionId?: string; /**< Session associated with the stop. */
  stopInfo?: any; /**< Raw DAP stop event body. */
}

/******************************************************************************
 * End of File
 ******************************************************************************/
