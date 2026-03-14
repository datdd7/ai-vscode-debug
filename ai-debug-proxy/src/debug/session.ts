/******************************************************************************
 * @file        session.ts
 *
 * @brief       Debug session management operations.
 *
 * @details
 * This module implements logic for launching, restarting, and terminating
 * debug sessions in VS Code. It handles both named configurations from
 * launch.json and dynamically generated configurations.
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
 * DD-1.1       Session Mgmt Operations
 * DD-SW-1      Core Proxy & Session Management
 *
 * Architecture Requirements:
 * ARCH-2       Debug Controller Pattern [Satisfies $SW SW-2]
 * ARCH-4       Session State Management [Satisfies $SW SW-4]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { LaunchParams, LaunchResult, DebuggerResponse } from "../types";
import { logger } from "../utils/logging";
import { DebugError, DebugErrorCode } from "../utils/errors";
import { waitForStopEvent } from "./events";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "Session";

// Retain last launched session for persistent access [BUG-3 Fix]
let _lastSession: vscode.DebugSession | undefined;

/******************************************************************************
 * Internal Helpers
 ******************************************************************************/

/**
 * @brief Resolve VSCode variables in a string.
 *
 * Supports common VSCode variables for better multi-workspace portability:
 * - ${workspaceFolder} / ${workspaceRoot} - First workspace folder
 * - ${file} - Currently active file (if any)
 * - ${fileBasename} - Basename of active file
 * - ${fileDirname} - Directory of active file
 * - ${cwd} - Current working directory
 * - ${env:VAR} - Environment variable
 *
 * @param [in]  str             String containing variables.
 * @param [in]  workspaceFolder Optional workspace folder override.
 *
 * @return Resolved string with variables replaced.
 */
function resolveVSCodeVariables(
  str: string,
  workspaceFolder?: vscode.WorkspaceFolder,
): string {
  if (!str) return str;

  const wsFolder = workspaceFolder ?? vscode.workspace.workspaceFolders?.[0];
  const wsPath = wsFolder?.uri.fsPath ?? process.cwd();

  let resolved = str;

  // Workspace folder variables
  resolved = resolved.replace(/\$\{workspaceFolder\}/g, wsPath);
  resolved = resolved.replace(/\$\{workspaceRoot\}/g, wsPath); // Legacy alias

  // Active file variables
  const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
  if (activeFile) {
    resolved = resolved.replace(/\$\{file\}/g, activeFile);
    resolved = resolved.replace(/\$\{fileBasename\}/g, path.basename(activeFile));
    resolved = resolved.replace(/\$\{fileDirname\}/g, path.dirname(activeFile));
  }

  // CWD variable
  resolved = resolved.replace(/\$\{cwd\}/g, process.cwd());

  // Environment variables: ${env:VAR_NAME}
  resolved = resolved.replace(/\$\{env:([^}]+)\}/g, (_, varName) => {
    return process.env[varName] ?? "";
  });

  // Normalize path separators
  resolved = path.normalize(resolved);

  return resolved;
}

/******************************************************************************
 * Public Interface - Accessors
 ******************************************************************************/

/**
 * $DD DD-SW-1.15
 *
 * @brief Get the currently active debug session.
 *
 * Falls back to the last launched session if no session is currently focused.
 *
 * @return VS Code DebugSession or undefined.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function getActiveSession(): vscode.DebugSession | undefined {
  return vscode.debug.activeDebugSession ?? _lastSession;
}

/**
 * $DD DD-SW-1.16
 *
 * @brief Ensure there is an active debug session.
 *
 * @param [in]  operationName   Name of the operation requiring a session.
 *
 * @return VS Code DebugSession.
 * @throws Error if no session is active.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function ensureActiveSession(
  operationName: string,
): vscode.DebugSession {
  const session = vscode.debug.activeDebugSession ?? _lastSession;
  if (!session) {
    throw new Error(
      `No active debug session for '${operationName}'. Launch a session first.`,
    );
  }
  return session;
}

/**
 * $DD DD-SW-1.17
 *
 * @brief Clear the retained session reference.
 *
 * Called during session terminal events.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function clearLastSession(): void {
  _lastSession = undefined;
}

/******************************************************************************
 * Public Interface - Lifecycle
 ******************************************************************************/

/**
 * $DD DD-SW-1.18
 *
 * @brief Launch a debug session.
 *
 * Supports launching via named configuration or dynamic parameters.
 * 
 * @param [in]  params  Launch configuration.
 *
 * @return Promise resolving to launch result.
 *
 * [Satisfies $ARCH ARCH-1, ARCH-4]
 */
export async function launchSession(
  params: LaunchParams,
): Promise<LaunchResult> {
  logger.info(LOG, "Launching debug session", params);

  // Validate required parameters
  if (!params.program && !params.configName) {
    throw DebugError.missingParameter("program or configName");
  }

  // Validate binary exists if program is provided
  if (params.program && !fs.existsSync(params.program)) {
    throw DebugError.binaryNotFound(params.program);
  }

  // Validate GDB exists if miDebuggerPath is provided
  if (params.miDebuggerPath && !fs.existsSync(params.miDebuggerPath)) {
    throw DebugError.gdbNotFound(params.miDebuggerPath);
  }

  // Validate workspace if provided
  if (params.workspacePath && !fs.existsSync(params.workspacePath)) {
    throw DebugError.workspaceNotFound(params.workspacePath);
  }

  // Determine workspace folder
  // AIVS-006 Fix: Find workspace by path to support multi-window scenarios
  let workspaceFolder: vscode.WorkspaceFolder | undefined;

  // If workspacePath is provided, find the matching workspace folder
  if (params.workspacePath) {
    const allFolders = vscode.workspace.workspaceFolders ?? [];
    workspaceFolder = allFolders.find(
      (f) => f.uri.fsPath === params.workspacePath
    );

    if (!workspaceFolder) {
      // Create a virtual workspace folder if not found
      workspaceFolder = {
        uri: vscode.Uri.file(params.workspacePath),
        name: path.basename(params.workspacePath),
        index: 0,
      };
      logger.warn(
        LOG,
        `Workspace path provided (${params.workspacePath}) but not found in open folders. Creating virtual workspace.`,
      );
    } else {
      logger.info(LOG, `Found matching workspace folder: ${workspaceFolder.name}`);
    }
  } else {
    // Fall back to first workspace
    workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  }

  if (params.configName) {
    logger.info(LOG, `Using launch.json config: ${params.configName}`);

    const allFolders = vscode.workspace.workspaceFolders ?? [];
    const searchFolders = allFolders.length > 0 ? allFolders : [undefined];
    let started = false;
    const stopPromise = waitForStopEvent(15000);

    for (const folder of searchFolders) {
      try {
        started = await vscode.debug.startDebugging(folder, params.configName);
        if (started) break;
      } catch {
        // Continue to next folder
      }
    }

    if (started) {
      const stopped = await stopPromise;
      const session = getActiveSession();
      if (session) _lastSession = session;
      return {
        success: true,
        sessionId: session?.id || "unknown",
        stopReason: stopped ? "entry" : "running",
      };
    }

    // Fallback: search for launch.json on filesystem [BUG-1 Fix]
    const fallbackDirs: string[] = [];
    if (params.workspacePath) {
      fallbackDirs.push(params.workspacePath);
    }
    if (params.program) {
      let dir = path.dirname(params.program);
      for (let i = 0; i < 6; i++) {
        fallbackDirs.push(dir);
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }

    for (const dir of fallbackDirs) {
      const launchJsonPath = path.join(dir, ".vscode", "launch.json");
      try {
        const raw = await fs.promises.readFile(launchJsonPath, "utf-8");
        const parsed = JSON.parse(raw);
        const configs: any[] = parsed.configurations ?? [];
        const found = configs.find((c: any) => c.name === params.configName);
        if (!found) continue;

        logger.info(
          LOG,
          `Found config '${params.configName}' in ${launchJsonPath}`,
        );
        const wsFolder: vscode.WorkspaceFolder = {
          uri: vscode.Uri.file(dir),
          name: path.basename(dir),
          index: 0,
        };
        // Resolve all VSCode variables in the configuration
        const resolvedConfig = JSON.parse(
          resolveVSCodeVariables(JSON.stringify(found), wsFolder),
        );
        const stopPromise2 = waitForStopEvent(15000);
        started = await vscode.debug.startDebugging(wsFolder, resolvedConfig);
        if (started) {
          const stopped = await stopPromise2;
          const session = getActiveSession();
          if (session) _lastSession = session;
          return {
            success: true,
            sessionId: session?.id || "unknown",
            stopReason: stopped ? "entry" : "running",
          };
        }
      } catch (e: any) {
        logger.warn(LOG, `Could not read ${launchJsonPath}: ${e.message}`);
      }
    }

    return {
      success: false,
      errorMessage: `Configuration '${params.configName}' not found. Searched workspace folders and fallback paths.`,
    };
  } else {
    // Dynamic configuration
    const debugType = params.type || "cppdbg";
    const isCppdbg = debugType === "cppdbg";

    // Resolve VSCode variables in program path and cwd
    const programPath = resolveVSCodeVariables(
      params.program || "${workspaceFolder}/a.out",
      workspaceFolder,
    );
    const cwdPath = resolveVSCodeVariables(
      params.cwd || workspaceFolder?.uri.fsPath || process.cwd(),
      workspaceFolder,
    );

    // Log resolution for debugging multi-workspace scenarios
    if (params.program && params.program !== programPath) {
      logger.info(LOG, `Resolved program path: ${params.program} -> ${programPath}`);
    }

    const debugConfig: vscode.DebugConfiguration = {
      name: "AI Debug Proxy",
      type: debugType,
      request: params.request || "launch",
      program: programPath,
      args: params.args || [],
      cwd: cwdPath,
      stopAtEntry: params.stopOnEntry ?? false,
      ...(isCppdbg
        ? {
          environment: params.env
            ? Object.entries(params.env).map(([k, v]) => ({
              name: k,
              value: v ?? "",
            }))
            : [],
          externalConsole: false,
          MIMode: "gdb",
        }
        : {
          env: params.env ?? {},
        }),
      ...params.extra,
    };

    const stopPromise = waitForStopEvent(15000);
    const started = await vscode.debug.startDebugging(
      workspaceFolder,
      debugConfig,
    );

    if (!started) {
      return { success: false, errorMessage: "Failed to start debug session" };
    }

    const stopped = await stopPromise;
    const session = getActiveSession();

    if (!session) {
      return {
        success: true,
        sessionId: "unknown",
        stopReason: stopped ? "entry" : "running",
      };
    }

    _lastSession = session;
    return {
      success: true,
      sessionId: session.id,
      stopReason: stopped ? "entry" : "running",
    };
  }
}

/**
 * $DD DD-SW-1.19
 *
 * @brief Restart the current debug session.
 *
 * $ARCH ARCH-4
 */
export async function restartSession(): Promise<DebuggerResponse> {
  const session = getActiveSession();
  if (!session) {
    return {
      success: false,
      errorMessage: "No active debug session to restart",
    };
  }

  try {
    await vscode.commands.executeCommand("workbench.action.debug.restart");
    return { success: true };
  } catch (e: any) {
    return { success: false, errorMessage: `Restart failed: ${e.message}` };
  }
}

/**
 * $DD DD-SW-1.20
 *
 * @brief Stop the current debug session.
 *
 * $ARCH ARCH-4
 */
export async function quitSession(): Promise<DebuggerResponse> {
  const session = getActiveSession();
  if (!session) {
    return { success: false, errorMessage: "No active debug session to quit" };
  }

  try {
    await vscode.commands.executeCommand("workbench.action.debug.stop");
    return { success: true };
  } catch (e: any) {
    return { success: false, errorMessage: `Quit failed: ${e.message}` };
  }
}

/******************************************************************************
 * End of File
 ******************************************************************************/
