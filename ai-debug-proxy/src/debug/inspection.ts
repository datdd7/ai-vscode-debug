/******************************************************************************
 * @file        inspection.ts
 *
 * @brief       Code and state inspection operations.
 *
 * @details
 * This module provides functions for inspecting the state of a debugged
 * program, including stack traces, variable evaluation, and source code
 * listing. It leverages VS Code's debug protocol to retrieve runtime info.
 *
 * @project     AI Debug Proxy
 * @component   Debug Module
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
 * DD-1.4       Variables & Code Inspection
 * DD-1.5       Expression Evaluation
 *
 * Architecture Requirements:
 * ARCH-2       Debug Controller Pattern [Satisfies $SW SW-2]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import {
  StackTraceResult,
  StackFrameInfo,
  GetStackFrameVariablesResult,
  ListSourceParams,
  ListSourceResult,
  GetSourceParams,
  GetSourceResult,
  EvaluateParams,
  EvaluateResult,
  PrettyPrintResult,
  ExecuteStatementParams,
  GotoFrameParams,
  DebuggerResponse,
} from "../types";
import { logger } from "../utils/logging";
import {
  getCurrentTopFrameId,
  updateCurrentTopFrameId,
  getLastStopEventBody,
  getCurrentThreadId,
  getCurrentFrameId,
  isStateValid,
  setCurrentFrameId,
} from "./events";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "Inspection";

/******************************************************************************
 * Internal Helpers
 ******************************************************************************/

/**
 * @brief Get the thread ID for the current stop event.
 *
 * Falls back to the first available thread if the stop body doesn't specify one.
 *
 * @param [in]  session   VS Code debug session.
 *
 * @return Thread ID.
 */
async function getThreadId(session: vscode.DebugSession): Promise<number> {
  // NEW: Use auto-resolved current thread ID first
  const currentThreadId = getCurrentThreadId(session.id);
  if (currentThreadId !== undefined) {
    logger.debug(LOG, `Using cached threadId: ${currentThreadId}`);
    return currentThreadId;
  }
  
  const stopBody = getLastStopEventBody(session.id);
  if (stopBody?.threadId) {
    return stopBody.threadId;
  }
  try {
    const res = await session.customRequest("threads");
    if (!stopBody?.threadId) {
      logger.warn(LOG, "No stop event threadId, falling back to first thread");
    }
    return res.threads?.[0]?.id ?? 1;
  } catch {
    return 1;
  }
}

/******************************************************************************
 * Public Interface - Stack & Variables
 ******************************************************************************/

/**
 * $DD DD-1.4.1
 *
 * @brief Get the stack trace for the current thread.
 *
 * @param [in]  session   VS Code debug session.
 *
 * @return Promise resolving to stack trace result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function getStackTrace(
  session: vscode.DebugSession,
): Promise<StackTraceResult> {
  try {
    const threadId = await getThreadId(session);
    const res = await session.customRequest("stackTrace", {
      threadId,
      startFrame: 0,
      levels: 50,
    });

    const frames: StackFrameInfo[] = (res.stackFrames || []).map((f: any) => ({
      id: f.id,
      name: f.name || "<unknown>",
      sourcePath: f.source?.path || "",
      line: f.line || 0,
      column: f.column || 0,
    }));

    if (frames.length > 0) {
      updateCurrentTopFrameId(frames[0].id);
      // NEW: Also update last location from top frame
      const topFrame = frames[0];
      setCurrentFrameId(topFrame.id, session.id);
    }

    return { success: true, frames, totalFrames: res.totalFrames };
  } catch (e: any) {
    logger.error(LOG, `Stack trace failed: ${e.message}`);
    return { success: false, errorMessage: e.message, frames: [] };
  }
}

/**
 * $DD DD-1.4.2
 *
 * @brief Get variables for a specific stack frame.
 *
 * @param [in]  session   VS Code debug session.
 * @param [in]  params    Parameters including frameId and scope filters.
 *
 * @return Promise resolving to variables result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function getStackFrameVariables(
  session: vscode.DebugSession,
  params: { frameId?: number; scopeFilter?: string[] },
): Promise<GetStackFrameVariablesResult> {
  const frameId = params.frameId ?? getCurrentTopFrameId();
  if (frameId === undefined) {
    return {
      success: false,
      errorMessage: "No frame ID available. Get stack trace first.",
      scopes: [],
    };
  }

  try {
    const scopesRes = await session.customRequest("scopes", { frameId });
    const scopes: { name: string; variables: any[] }[] = [];

    for (const scope of scopesRes.scopes || []) {
      if (params.scopeFilter && !params.scopeFilter.includes(scope.name)) {
        continue;
      }

      if (scope.expensive && !params.scopeFilter?.includes(scope.name)) {
        continue;
      }

      try {
        const varsRes = await session.customRequest("variables", {
          variablesReference: scope.variablesReference,
        });

        scopes.push({
          name: scope.name,
          variables: (varsRes.variables || []).map((v: any) => ({
            name: v.name,
            // Sanitize value: strip control characters that cause jq parse
            // errors in shell pipelines (e.g. GDB emits \v, raw \x?? seqs)
            value: typeof v.value === "string"
              ? v.value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
              : v.value,
            type: v.type || undefined,
            variablesReference: v.variablesReference || 0,
          })),
        });
      } catch (e: any) {
        logger.warn(
          LOG,
          `Failed to get variables for scope '${scope.name}': ${e.message}`,
        );
        scopes.push({ name: scope.name, variables: [] });
      }
    }

    return { success: true, scopes };
  } catch (e: any) {
    logger.error(LOG, `Get variables failed: ${e.message}`);
    return { success: false, errorMessage: e.message, scopes: [] };
  }
}

/**
 * @brief Get a consolidated list of all local variables and arguments.
 *
 * Merges "Locals" and "Arguments" scopes into a single flat list for
 * easier AI consumption.
 *
 * @param [in]  session   VS Code debug session.
 * @param [in]  frameId   Stack frame context.
 *
 * @return Promise resolving to a list of variables.
 */
export async function listAllLocals(
  session: vscode.DebugSession,
  frameId?: number,
): Promise<{ success: boolean; variables: any[]; errorMessage?: string }> {
  try {
    const res = await getStackFrameVariables(session, {
      frameId,
      scopeFilter: ["Locals", "Local", "Arguments", "Args", "Parameters"],
    });

    if (!res.success) {
      return { success: false, variables: [], errorMessage: res.errorMessage };
    }

    const allVars: any[] = [];
    const seen = new Set<string>();

    for (const scope of res.scopes) {
      for (const v of scope.variables) {
        if (!seen.has(v.name)) {
          allVars.push(v);
          seen.add(v.name);
        }
      }
    }

    return { success: true, variables: allVars };
  } catch (e: any) {
    return { success: false, variables: [], errorMessage: e.message };
  }
}

/******************************************************************************
 * Public Interface - Source Tools
 ******************************************************************************/

/**
 * $DD DD-1.4.3
 *
 * @brief List source code around the current execution point.
 *
 * @param [in]  session   VS Code debug session.
 * @param [in]  params    Parameters for line context.
 *
 * @return Promise resolving to source listing result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function listSource(
  session: vscode.DebugSession,
  params: ListSourceParams,
): Promise<ListSourceResult> {
  const frameId = params.frameId ?? getCurrentTopFrameId();
  if (frameId === undefined) {
    return { success: false, errorMessage: "No frame ID available" };
  }

  try {
    const traceRes = await getStackTrace(session);
    const frame =
      traceRes.frames.find((f) => f.id === frameId) || traceRes.frames[0];
    if (!frame || !frame.sourcePath) {
      return { success: false, errorMessage: "No source path for frame" };
    }

    let fsPath = frame.sourcePath;
    if (/^[a-z][\w+\-.]*:\/\//i.test(fsPath)) {
      fsPath = vscode.Uri.parse(fsPath).path;
    }

    let uri: vscode.Uri;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const relPath = vscode.workspace.asRelativePath(fsPath, false);
      if (relPath === fsPath) {
        uri = vscode.Uri.file(fsPath);
      } else {
        uri = vscode.Uri.joinPath(workspaceFolder.uri, relPath);
      }
    } else {
      uri = vscode.Uri.file(fsPath);
    }

    const doc = await vscode.workspace.openTextDocument(uri);
    const lines = doc.getText().split("\n");
    const around = params.linesAround ?? 10;
    const start = Math.max(0, frame.line - 1 - around);
    const end = Math.min(lines.length, frame.line - 1 + around + 1);

    const sourceLines = lines.slice(start, end).map((line, i) => {
      const lineNum = start + i + 1;
      const marker = lineNum === frame.line ? ">>>" : "   ";
      // Replace all control characters (U+0000 through U+001F) to avoid JSON serialization issues
      const cleanLine = line.replace(/[\x00-\x1F]/g, (char) => {
        if (char === '\t') return '    '; // Tab to 4 spaces
        return ''; // Remove other control characters
      });
      return `${marker} ${String(lineNum).padStart(4)} | ${cleanLine}`;
    });

    return {
      success: true,
      sourceCode: sourceLines.join("\n"),
      currentLine: frame.line,
    };
  } catch (e: any) {
    return { success: false, errorMessage: e.message };
  }
}

/******************************************************************************
 * Public Interface - Navigation
 ******************************************************************************/

/**
 * $DD DD-1.4.4
 *
 * @brief Move one frame up the call stack (VS Code command).
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function frameUp(
  session: vscode.DebugSession,
): Promise<DebuggerResponse> {
  try {
    await vscode.commands.executeCommand("workbench.action.debug.callStackUp");
    return { success: true };
  } catch (e: any) {
    return { success: false, errorMessage: e.message };
  }
}

/**
 * $DD DD-1.4.5
 *
 * @brief Move one frame down the call stack (VS Code command).
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function frameDown(
  session: vscode.DebugSession,
): Promise<DebuggerResponse> {
  try {
    await vscode.commands.executeCommand(
      "workbench.action.debug.callStackDown",
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, errorMessage: e.message };
  }
}

/**
 * $DD DD-1.4.6
 *
 * @brief Set the current active frame.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function gotoFrame(
  session: vscode.DebugSession,
  params: GotoFrameParams,
): Promise<DebuggerResponse> {
  if (params.frameId !== undefined) {
    updateCurrentTopFrameId(params.frameId);
    return { success: true };
  }
  return { success: false, errorMessage: "frameId is required" };
}

/******************************************************************************
 * Public Interface - Expression Evaluation
 ******************************************************************************/

/**
 * $DD DD-1.5.1
 *
 * @brief Evaluate an expression in the current debug context.
 *
 * @param [in]  session   VS Code debug session.
 * @param [in]  params    Expression and context.
 *
 * @return Promise resolving to evaluation result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function evaluate(
  session: vscode.DebugSession,
  params: EvaluateParams,
): Promise<EvaluateResult> {
  // NEW: Auto-resolve frameId from session state if not provided
  const frameId = params.frameId ?? getCurrentFrameId(session.id) ?? getCurrentTopFrameId();

  if (frameId === undefined) {
    return {
      success: false,
      errorMessage: "No frame available for evaluation. Ensure debugger is stopped at a breakpoint.",
      result: "",
      variablesReference: 0,
    };
  }

  try {
    const res = await session.customRequest("evaluate", {
      expression: params.expression,
      frameId,
      context: params.context || "watch",
    });

    if (params.raw) {
      return {
        success: true,
        result: res.result,
        type: res.type,
        variablesReference: res.variablesReference || 0,
      };
    }

    // Check if result contains GDB error messages (returned as "successful" responses)
    if (res.result && typeof res.result === 'string') {
      const result = res.result;

      // Detect GDB error messages in result
      if (result.includes("-var-create") ||
        result.includes("unable to create variable") ||
        result.includes("No symbol") ||
        result.includes("not available")) {

        let errorMessage = `Cannot evaluate expression '${params.expression}'.`;

        if (result.includes("-var-create") || result.includes("unable to create")) {
          errorMessage += " Variable may be optimized out or not in current scope.";
        } else if (result.includes("No symbol")) {
          errorMessage += " Symbol not found. Check variable name and scope.";
        } else if (result.includes("not available")) {
          errorMessage += " Expression is not available in the current context.";
        }

        logger.debug(LOG, `Evaluation returned error for '${params.expression}': ${result}`);

        return {
          success: false,
          errorMessage,
          result: "",
          variablesReference: 0,
        };
      }
    }

    return {
      success: true,
      result: res.result,
      type: res.type,
      variablesReference: res.variablesReference || 0,
    };
  } catch (e: any) {
    if (params.raw) {
      return {
        success: false,
        errorMessage: e.message,
        result: "",
        variablesReference: 0,
      };
    }

    // Provide user-friendly error messages instead of raw backend errors
    let errorMessage = e.message;

    if (errorMessage.includes("-var-create")) {
      errorMessage = `Cannot evaluate expression '${params.expression}'. Variable may be optimized out or not in current scope.`;
    } else if (errorMessage.includes("not available")) {
      errorMessage = `Expression '${params.expression}' is not available in the current context.`;
    } else if (errorMessage.includes("No symbol")) {
      errorMessage = `Symbol '${params.expression}' not found. Check variable name and scope.`;
    }

    logger.debug(LOG, `Evaluation failed for '${params.expression}': ${e.message}`);

    return {
      success: false,
      errorMessage,
      result: "",
      variablesReference: 0,
    };
  }
}

/**
 * $DD DD-1.5.2
 *
 * @brief Pretty-print an expression with one level of field expansion.
 *
 * Evaluates the expression, then — if the result has a non-zero
 * variablesReference — fetches one level of child fields via the DAP
 * `variables` request and returns them in a `fields` array.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function prettyPrint(
  session: vscode.DebugSession,
  params: EvaluateParams,
): Promise<PrettyPrintResult> {
  const evalResult = await evaluate(session, params);

  if (!evalResult.success) {
    return {
      success: false,
      errorMessage: evalResult.errorMessage,
      result: "",
      variablesReference: 0,
    };
  }

  const base: PrettyPrintResult = {
    success: true,
    result: evalResult.result,
    type: evalResult.type,
    variablesReference: evalResult.variablesReference,
  };

  if (evalResult.variablesReference > 0) {
    try {
      const varsRes = await session.customRequest("variables", {
        variablesReference: evalResult.variablesReference,
      });
      base.fields = (varsRes.variables || []).map((v: any) => ({
        name: v.name,
        type: v.type || undefined,
        value: typeof v.value === "string"
          ? v.value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
          : String(v.value ?? ""),
      }));
    } catch {
      // Non-fatal — fields omitted if expansion fails
    }
  }

  return base;
}

/**
 * $DD DD-1.5.3
 *
 * @brief Get the type of an expression.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function whatis(
  session: vscode.DebugSession,
  params: EvaluateParams,
): Promise<EvaluateResult> {
  return evaluate(session, {
    ...params,
    expression: `(typeof ${params.expression})`,
    context: "repl",
  });
}

/**
 * $DD DD-1.5.4
 *
 * @brief Execute a statement in the current debug context.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function executeStatement(
  session: vscode.DebugSession,
  params: ExecuteStatementParams,
): Promise<EvaluateResult> {
  return evaluate(session, {
    expression: params.statement,
    context: "repl",
    frameId: params.frameId,
  });
}

/**
 * $DD DD-1.5.5
 *
 * @brief Get source file for an expression (Internal lookup).
 *
 * $ARCH ARCH-2
 */
export async function getSource(
  session: vscode.DebugSession,
  params: GetSourceParams,
): Promise<GetSourceResult> {
  try {
    const result = await evaluate(session, {
      expression: params.expression,
      context: "repl",
      frameId: params.frameId,
    });
    return {
      success: result.success,
      sourcePath: result.result,
      errorMessage: result.errorMessage,
    };
  } catch (e: any) {
    return { success: false, errorMessage: e.message };
  }
}

/******************************************************************************
 * End of File
 ******************************************************************************/
