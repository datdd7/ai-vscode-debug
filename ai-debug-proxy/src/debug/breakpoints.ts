/******************************************************************************
 * @file        breakpoints.ts
 *
 * @brief       Breakpoint management operations.
 *
 * @details
 * This module provides functions for setting, removing, toggling, and
 * configuring breakpoints in the VS Code environment. It translates high-level
 * breakpoint requests into VS Code debug breakpoint commands.
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
 * DD-1.3       Breakpoint Management
 *
 * Architecture Requirements:
 * ARCH-2       Debug Controller Pattern [Satisfies $SW SW-2]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  SetBreakpointParams,
  SetBreakpointResult,
  RemoveBreakpointParams,
  ToggleBreakpointParams,
  IgnoreBreakpointParams,
  SetBreakpointConditionParams,
  GetActiveBreakpointsResult,
  DebuggerResponse,
  BreakpointInfo,
  GetDataBreakpointInfoParams,
  SetDataBreakpointParams,
  SetBreakpointsParams,
  SetBreakpointsResult,
  BreakpointResult,
} from "../types";
import { logger } from "../utils/logging";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "Breakpoints";

/******************************************************************************
 * Internal Helpers
 ******************************************************************************/

/**
 * @brief Find existing source breakpoint matching a location.
 *
 * @param [in]  path    Absolute source file path.
 * @param [in]  line    1-based line number.
 *
 * @return VS Code SourceBreakpoint or undefined if not found.
 */
function findBreakpointAtLocation(
  path: string,
  line: number,
): vscode.SourceBreakpoint | undefined {
  const uri = vscode.Uri.file(path);
  return vscode.debug.breakpoints.find((bp) => {
    if (bp instanceof vscode.SourceBreakpoint) {
      return (
        bp.location.uri.fsPath === uri.fsPath &&
        bp.location.range.start.line === line - 1 // VS Code is 0-based
      );
    }
    return false;
  }) as vscode.SourceBreakpoint | undefined;
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-1.3.1
 *
 * @brief Set a breakpoint at a source location.
 *
 * @param [in]  params  Configuration for the breakpoint.
 *
 * @return Promise resolving to set result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function setBreakpoint(
  params: SetBreakpointParams,
): Promise<SetBreakpointResult> {
  const { location, condition, hitCondition, logMessage } = params;
  logger.info(LOG, `Setting breakpoint at ${location.path}:${location.line}`);

  // Input validation
  const normalizedPath = path.normalize(location.path);
  if (!path.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Breakpoint path must be absolute" };
  }
  if (!fs.existsSync(normalizedPath)) {
    return { success: false, errorMessage: "File not found for breakpoint" };
  }

  try {
    const uri = vscode.Uri.file(normalizedPath);
    const pos = new vscode.Position(
      location.line - 1,
      (location.column ?? 1) - 1,
    );
    const loc = new vscode.Location(uri, pos);

    const bp = new vscode.SourceBreakpoint(
      loc,
      true,
      condition,
      hitCondition,
      logMessage,
    );
    vscode.debug.addBreakpoints([bp]);

    logger.info(LOG, `Breakpoint set at ${location.path}:${location.line}`);
    return { success: true };
  } catch (e: any) {
    logger.error(LOG, `Failed to set breakpoint: ${e.message}`);
    return { success: false, errorMessage: e.message };
  }
}

/**
 * $DD DD-1.3.2
 *
 * @brief Set a temporary breakpoint.
 *
 * Wraps setBreakpoint. These are typically managed by the controller
 * for "Run to Cursor" or step-until operations.
 *
 * @param [in]  params  Configuration for the breakpoint.
 *
 * @return Promise resolving to set result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function setTempBreakpoint(
  params: SetBreakpointParams,
): Promise<SetBreakpointResult> {
  return setBreakpoint(params);
}

/**
 * $DD DD-1.3.3
 *
 * @brief Remove a breakpoint at a specific location.
 *
 * @param [in]  params  Location of the breakpoint to remove.
 *
 * @return Promise resolving to response result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function removeBreakpointByLocation(
  params: RemoveBreakpointParams,
): Promise<DebuggerResponse> {
  const { location } = params;
  logger.info(LOG, `Removing breakpoint at ${location.path}:${location.line}`);

  // Input validation
  const normalizedPath = path.normalize(location.path);
  if (!path.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Path must be absolute" };
  }

  const existing = findBreakpointAtLocation(normalizedPath, location.line);
  if (!existing) {
    return {
      success: false,
      errorMessage: `No breakpoint found at ${location.path}:${location.line}`,
    };
  }

  vscode.debug.removeBreakpoints([existing]);
  logger.info(LOG, `Breakpoint removed at ${location.path}:${location.line}`);
  return { success: true };
}

/**
 * $DD DD-1.3.4
 *
 * @brief Remove all breakpoints in a file.
 *
 * @param [in]  filePath    Absolute path to the file.
 *
 * @return Promise resolving to response result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function removeAllBreakpointsInFile(
  filePath: string,
): Promise<DebuggerResponse> {
  logger.info(LOG, `Removing all breakpoints in ${filePath}`);

  // Input validation
  const normalizedPath = path.normalize(filePath);
  if (!path.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Path must be absolute" };
  }

  const uri = vscode.Uri.file(normalizedPath);

  const toRemove = vscode.debug.breakpoints.filter((bp) => {
    if (bp instanceof vscode.SourceBreakpoint) {
      return bp.location.uri.fsPath === uri.fsPath;
    }
    return false;
  });

  if (toRemove.length === 0) {
    return { success: true, errorMessage: "No breakpoints found in file" };
  }

  vscode.debug.removeBreakpoints(toRemove);
  logger.info(LOG, `Removed ${toRemove.length} breakpoints from ${filePath}`);
  return { success: true };
}

/**
 * $DD DD-1.3.5
 *
 * @brief Enable or disable a breakpoint.
 *
 * Re-creates the breakpoint with the desired enabled state.
 *
 * @param [in]  params  Toggle parameters.
 *
 * @return Promise resolving to response result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function toggleBreakpoint(
  params: ToggleBreakpointParams,
): Promise<DebuggerResponse> {
  const { location, enable } = params;
  logger.info(
    LOG,
    `${enable ? "Enabling" : "Disabling"} breakpoint at ${location.path}:${location.line}`,
  );

  // Input validation
  const normalizedPath = path.normalize(location.path);
  if (!path.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Path must be absolute" };
  }

  const existing = findBreakpointAtLocation(normalizedPath, location.line);
  if (!existing) {
    return {
      success: false,
      errorMessage: `No breakpoint found at ${location.path}:${location.line}`,
    };
  }

  vscode.debug.removeBreakpoints([existing]);

  const uri = vscode.Uri.file(location.path);
  const pos = new vscode.Position(location.line - 1, 0);
  const loc = new vscode.Location(uri, pos);
  const newBp = new vscode.SourceBreakpoint(
    loc,
    enable,
    existing.condition,
    existing.hitCondition,
    existing.logMessage,
  );
  vscode.debug.addBreakpoints([newBp]);

  return { success: true };
}

/**
 * $DD DD-1.3.6
 *
 * @brief Set ignore count on a breakpoint.
 *
 * @param [in]  params  Ignore parameters.
 *
 * @return Promise resolving to response result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function ignoreBreakpoint(
  params: IgnoreBreakpointParams,
): Promise<DebuggerResponse> {
  const { location, ignoreCount } = params;

  // Input validation
  const normalizedPath = path.normalize(location.path);
  if (!path.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Path must be absolute" };
  }

  const existing = findBreakpointAtLocation(normalizedPath, location.line);
  if (!existing) {
    return {
      success: false,
      errorMessage: `No breakpoint at ${location.path}:${location.line}`,
    };
  }

  vscode.debug.removeBreakpoints([existing]);

  const uri = vscode.Uri.file(location.path);
  const pos = new vscode.Position(location.line - 1, 0);
  const loc = new vscode.Location(uri, pos);
  const hitCond = ignoreCount !== null ? String(ignoreCount) : undefined;
  const newBp = new vscode.SourceBreakpoint(
    loc,
    true,
    existing.condition,
    hitCond,
    existing.logMessage,
  );
  vscode.debug.addBreakpoints([newBp]);

  return { success: true };
}

/**
 * $DD DD-1.3.7
 *
 * @brief Set condition on a breakpoint.
 *
 * @param [in]  params  Condition parameters.
 *
 * @return Promise resolving to response result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function setBreakpointCondition(
  params: SetBreakpointConditionParams,
): Promise<DebuggerResponse> {
  const { location, condition } = params;

  // Input validation
  const normalizedPath = path.normalize(location.path);
  if (!path.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Path must be absolute" };
  }

  const existing = findBreakpointAtLocation(normalizedPath, location.line);
  if (!existing) {
    return {
      success: false,
      errorMessage: `No breakpoint at ${location.path}:${location.line}`,
    };
  }

  vscode.debug.removeBreakpoints([existing]);

  const uri = vscode.Uri.file(location.path);
  const pos = new vscode.Position(location.line - 1, 0);
  const loc = new vscode.Location(uri, pos);
  const cond = condition ?? undefined;
  const newBp = new vscode.SourceBreakpoint(
    loc,
    true,
    cond,
    existing.hitCondition,
    existing.logMessage,
  );
  vscode.debug.addBreakpoints([newBp]);

  return { success: true };
}

/**
 * $DD DD-1.3.8
 *
 * @brief Get all active source breakpoints.
 *
 * @return Promise resolving to list of breakpoint information.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function getActiveBreakpoints(): Promise<GetActiveBreakpointsResult> {
  const breakpoints: BreakpointInfo[] = vscode.debug.breakpoints
    .filter(
      (bp): bp is vscode.SourceBreakpoint =>
        bp instanceof vscode.SourceBreakpoint,
    )
    .map((bp) => ({
      verified: true,
      location: {
        path: bp.location.uri.fsPath,
        line: bp.location.range.start.line + 1,
        column: bp.location.range.start.character + 1,
      },
      condition: bp.condition,
      hitCondition: bp.hitCondition,
      logMessage: bp.logMessage,
      enabled: bp.enabled,
    }));

  return { success: true, breakpoints };
}

/**
 * $DD DD-1.3.9
 *
 * @brief Getting data breakpoint information for a variable.
 *
 * @param [in]  session VS Code debug session.
 * @param [in]  params  Request parameters.
 *
 * @return Info from the debugger.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function getDataBreakpointInfo(
  session: vscode.DebugSession,
  params: GetDataBreakpointInfoParams,
): Promise<any> {
  try {
    const res = await session.customRequest("dataBreakpointInfo", {
      name: params.name,
      variablesReference: params.variablesReference,
      frameId: params.frameId,
    });
    return { success: true, ...res };
  } catch (e: any) {
    logger.error(LOG, `getDataBreakpointInfo failed: ${e.message}`);
    return { success: false, errorMessage: `getDataBreakpointInfo failed: ${e.message}` };
  }
}

/**
 * $DD DD-1.3.10
 *
 * @brief Set a data breakpoint (watchpoint).
 *
 * @param [in]  params  Configuration for the data breakpoint.
 *
 * @return Promise resolving to set result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function setDataBreakpoint(
  params: SetDataBreakpointParams,
): Promise<SetBreakpointResult> {
  const { dataId, accessType, condition, hitCondition } = params;
  logger.info(LOG, `Setting data breakpoint for dataId ${dataId}`);

  try {
    const bp = new (vscode as any).DataBreakpoint(
      `Watch ${dataId}`,
      dataId,
      false, // canPersist
      hitCondition,
      condition,
    );
    vscode.debug.addBreakpoints([bp]);
    return { success: true };
  } catch (e: any) {
    logger.error(LOG, `Failed to set data breakpoint: ${e.message}`);
    return { success: false, errorMessage: e.message };
  }
}

/**
 * $DD DD-1.3.11
 *
 * @brief Set multiple breakpoints in a single operation (AIVS-005).
 *
 * @param [in]  params  Batch breakpoint configuration.
 *
 * @return Promise resolving to batch set result.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function setBreakpoints(
  params: SetBreakpointsParams,
): Promise<SetBreakpointsResult> {
  const { file, breakpoints } = params;
  logger.info(LOG, `Setting ${breakpoints.length} breakpoints in ${file}`);

  try {
    const results: BreakpointResult[] = [];
    const bps: vscode.SourceBreakpoint[] = [];

    // Create all breakpoints
    for (const bp of breakpoints) {
      const uri = vscode.Uri.file(file);
      const range = new vscode.Range(
        bp.line - 1,
        bp.column ? bp.column - 1 : 0,
        bp.line - 1,
        bp.column ? bp.column - 1 : 0,
      );
      const location = new vscode.Location(uri, range);
      const sourceBp = new vscode.SourceBreakpoint(
        location,
        bp.condition ? true : false,
        bp.condition,
        bp.hitCondition,
        bp.logMessage,
      );
      bps.push(sourceBp);
    }

    // Add all breakpoints at once
    vscode.debug.addBreakpoints(bps);

    // Build results
    for (let i = 0; i < breakpoints.length; i++) {
      const bp = breakpoints[i];
      results.push({
        id: i + 1,
        line: bp.line,
        verified: true,
        condition: bp.condition,
        source: file,
      });
    }

    return {
      success: true,
      breakpoints: results,
    };
  } catch (e: any) {
    logger.error(LOG, `Failed to set batch breakpoints: ${e.message}`);
    return {
      success: false,
      error: {
        code: "OPERATION_FAILED",
        message: `Failed to set breakpoints: ${e.message}`,
      },
      breakpoints: [],
    };
  }
}

/******************************************************************************
 * End of File
 ******************************************************************************/
