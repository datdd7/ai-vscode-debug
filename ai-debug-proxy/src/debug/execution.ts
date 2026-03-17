/******************************************************************************
 * @file        execution.ts
 *
 * @brief       Execution control operations (stepping, continuation, jump).
 *
 * @details
 * This module implements core execution control logic using Debug Adapter
 * Protocol (DAP) custom requests. It provides reliable stepping and continuation
 * by explicitly awaiting stop events from the debug adapter.
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
 * DD-1.2       Execution Control
 *
 * Architecture Requirements:
 * ARCH-2       Debug Controller Pattern [Satisfies $SW SW-2]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import {
  NavigationResult,
  DebuggerResponse,
  StackFrameInfo,
  JumpParams,
} from "../types";
import { logger } from "../utils/logging";
import {
  waitForStopEvent,
  getCurrentTopFrameId,
  updateCurrentTopFrameId,
  getCurrentThreadId,
  setCurrentThreadId,
} from "./events";
import { getStackTrace } from "./inspection";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "Execution";
const STEP_TIMEOUT_MS = 30000;
const CONTINUE_TIMEOUT_MS = 300000;

/******************************************************************************
 * Internal Helpers
 ******************************************************************************/

/**
 * @brief Get the primary or selected thread ID from the debug session.
 *
 * @param [in]  session   VS Code debug session.
 *
 * @return Thread ID (defaults to 1).
 */
export async function getThreadId(session: vscode.DebugSession): Promise<number> {
  const currentId = getCurrentThreadId(session.id);
  if (currentId !== undefined) {
    return currentId;
  }
  try {
    const threadsRes = await session.customRequest("threads");
    if (threadsRes.threads && threadsRes.threads.length > 0) {
      const id = threadsRes.threads[0].id;
      setCurrentThreadId(id, session.id);
      return id;
    }
  } catch (e: any) {
    logger.warn(LOG, `Failed to get threads: ${e.message}`);
  }
  return 1;
}

/**
 * @brief Build NavigationResult from current state after a stop.
 *
 * @param [in]  session     VS Code debug session.
 * @param [in]  stopReason  Reason for the stop (e.g., "step").
 *
 * @return Navigation result containing frame info and stop reason.
 */
async function buildNavigationResult(
  session: vscode.DebugSession,
  stopReason?: string,
): Promise<NavigationResult> {
  try {
    const traceResult = await getStackTrace(session);
    const topFrame =
      traceResult.success && traceResult.frames.length > 0
        ? traceResult.frames[0]
        : undefined;

    if (topFrame) {
      updateCurrentTopFrameId(topFrame.id);
    }

    return {
      success: true,
      frame: topFrame,
      stopReason: stopReason || "step",
    };
  } catch (e: any) {
    return { success: true, stopReason: stopReason || "unknown" };
  }
}

/**
 * @brief Execute a DAP navigation command and wait for the debugger to stop.
 *
 * @param [in]  session         VS Code debug session.
 * @param [in]  dapCommand      DAP command to send.
 * @param [in]  operationName   Human-readable operation name for logging.
 * @param [in]  timeoutMs       Wait timeout.
 *
 * @return Navigation result.
 */
async function executeNavigationCommand(
  session: vscode.DebugSession,
  dapCommand: string,
  operationName: string,
  timeoutMs: number,
): Promise<NavigationResult> {
  logger.info(LOG, `Executing ${operationName} (session: ${session.id})`);

  try {
    const threadId = await getThreadId(session);

    const stopPromise = waitForStopEvent(timeoutMs);

    const dapArgs: any = { threadId };
    await session.customRequest(dapCommand, dapArgs);

    const { stopped, reason } = await stopPromise;

    if (!stopped) {
      if (reason === 'terminated' || reason === 'exited') {
        logger.info(LOG, `${operationName}: Program ${reason}`);
        return {
          success: true,
          stopReason: reason,
          errorMessage: `Program ${reason}.`,
        };
      }
      logger.warn(
        LOG,
        `${operationName} timeout: debugger may still be running or stalled`,
      );
      return {
        success: true,
        stopReason: "timeout",
        errorMessage: `${operationName} timeout (${timeoutMs}ms). Program may still be running.`,
      };
    }

    return await buildNavigationResult(session, reason || operationName);
  } catch (e: any) {
    logger.error(LOG, `${operationName} failed: ${e.message}`);
    return {
      success: false,
      errorMessage: `${operationName} failed: ${e.message}`,
    };
  }
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-1.2.6
 *
 * @brief Get the list of all active threads.
 *
 * @param [in]  session   VS Code debug session.
 *
 * @return List of threads.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function listThreads(session: vscode.DebugSession): Promise<any> {
  try {
    const threadsRes = await session.customRequest("threads");
    return { success: true, threads: threadsRes.threads || [] };
  } catch (e: any) {
    logger.error(LOG, `list_threads failed: ${e.message}`);
    return { success: false, errorMessage: `list_threads failed: ${e.message}` };
  }
}

/**
 * $DD DD-1.2.7
 *
 * @brief Switch the primary thread for context operations.
 *
 * @param [in]  session   VS Code debug session.
 * @param [in]  threadId  The ID of the thread to switch or focus on.
 *
 * @return Success or failure response.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function switchThread(
  session: vscode.DebugSession,
  threadId: number,
): Promise<any> {
  try {
    setCurrentThreadId(threadId, session.id);
    return { success: true, threadId };
  } catch (e: any) {
    logger.error(LOG, `switch_thread failed: ${e.message}`);
    return { success: false, errorMessage: `switch_thread failed: ${e.message}` };
  }
}

/**
 * $DD DD-1.2.1
 *
 * @brief Continue program execution.
 *
 * @param [in]  session   VS Code debug session.
 *
 * @return Navigation result with crash info if program crashed.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function continueExecution(
  session: vscode.DebugSession,
): Promise<NavigationResult> {
  const result = await executeNavigationCommand(
    session,
    "continue",
    "continue",
    CONTINUE_TIMEOUT_MS,
  );

  // Auto-detect crash and attach crash info
  if (result.success && result.stopReason) {
    const crashReasons = ["exception", "signal", "breakpoint"];
    if (crashReasons.includes(result.stopReason)) {
      logger.info(LOG, `Program stopped: ${result.stopReason}`);
      // Auto-attach stack trace for AI agents
      try {
        const stackTrace = await getStackTrace(session);
        (result as any).crashInfo = {
          reason: result.stopReason,
          description: (result as any).description || "Unknown error",
          stackTrace: stackTrace,
        };
      } catch (e: any) {
        logger.warn(LOG, `Failed to get crash info: ${e?.message || 'Unknown error'}`);
      }
    }
  }

  return result;
}

/**
 * $DD DD-1.2.2
 *
 * @brief Step to the next line of code.
 *
 * @param [in]  session   VS Code debug session.
 *
 * @return Navigation result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function nextStep(
  session: vscode.DebugSession,
): Promise<NavigationResult> {
  return executeNavigationCommand(session, "next", "next", STEP_TIMEOUT_MS);
}

/**
 * $DD DD-1.2.3
 *
 * @brief Step into the current function/method.
 *
 * @param [in]  session   VS Code debug session.
 *
 * @return Navigation result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function stepIn(
  session: vscode.DebugSession,
): Promise<NavigationResult> {
  return executeNavigationCommand(
    session,
    "stepIn",
    "step_in",
    STEP_TIMEOUT_MS,
  );
}

/**
 * $DD DD-1.2.4
 *
 * @brief Step out of the current function/method.
 *
 * @param [in]  session   VS Code debug session.
 *
 * @return Navigation result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function stepOut(
  session: vscode.DebugSession,
): Promise<NavigationResult> {
  return executeNavigationCommand(
    session,
    "stepOut",
    "step_out",
    STEP_TIMEOUT_MS,
  );
}

/**
 * $DD DD-1.2.5
 *
 * @brief Jump execution to a specific line.
 *
 * @param [in]  session   VS Code debug session.
 * @param [in]  params    Jump parameters (line number).
 *
 * @return Navigation result.
 *
 * $ARCH ARCH-2
 */
export async function jumpToLine(
  session: vscode.DebugSession,
  params: JumpParams,
): Promise<NavigationResult> {
  const operationName = "jump";
  logger.info(LOG, `Jump to line ${params.line}`);

  try {
    const frameId = params.frameId ?? getCurrentTopFrameId();
    if (frameId === undefined) {
      return { success: false, errorMessage: "No frame ID available for jump" };
    }

    const targets = await session.customRequest("gotoTargets", {
      source: { path: "" },
      line: params.line,
    });

    if (!targets.targets || targets.targets.length === 0) {
      return {
        success: false,
        errorMessage: `No goto target found for line ${params.line}`,
      };
    }

    const threadId = await getThreadId(session);

    const stopPromise = waitForStopEvent(STEP_TIMEOUT_MS);

    await session.customRequest("goto", {
      threadId,
      targetId: targets.targets[0].id,
    });

    const { stopped, reason } = await stopPromise;
    if (!stopped && (reason === 'terminated' || reason === 'exited')) {
      return { success: true, stopReason: reason, errorMessage: `Program ${reason}` };
    }
    return await buildNavigationResult(session, stopped ? "jump" : "running");
  } catch (e: any) {
    logger.error(LOG, `${operationName} failed: ${e.message}`);
    return { success: false, errorMessage: `${operationName}: ${e.message}` };
  }
}

/******************************************************************************
 * End of File
 ******************************************************************************/
