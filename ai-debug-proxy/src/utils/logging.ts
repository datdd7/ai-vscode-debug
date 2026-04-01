/******************************************************************************
 * @file        logging.ts
 *
 * @brief       Logging utilities for output channel and file tracing.
 *
 * @details
 * This module providing a synchronized logging system that writes to both
 * a VS Code output channel and a local log file. It supports multiple
 * log levels and safe object serialization.
 *
 * @project     AI Debug Proxy
 * @component   Utility Module
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
 * DD-SW-8       Internal Logging
 *
 * Architecture Requirements:
 * ARCH-8       Logging Architecture [Satisfies $SW SW-8]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/******************************************************************************
 * Constants & Types
 ******************************************************************************/

/** @brief Internal log level definitions. */
type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

const LOG_FILE = path.join(__dirname, "..", "proxy.log");

/******************************************************************************
 * Public Interface - Initialization
 ******************************************************************************/

/**
 * @brief VS Code Output Channel instance.
 *
 * Automatically initialized on load. Provides UI-visible log stream.
 */
export const outputChannel: vscode.OutputChannel =
  /* v8 ignore next 2 -- false branch only when vscode.window unavailable (non-extension context) */
  typeof vscode.window?.createOutputChannel === "function"
    ? vscode.window.createOutputChannel("AI Debug Proxy")
    /* v8 ignore next 10 -- fallback stub when vscode API unavailable (e.g. non-VS Code runtime) */
    : ({
      append: () => { },
      appendLine: () => { },
      clear: () => { },
      dispose: () => { },
      hide: () => { },
      name: "MockOutputChannel",
      replace: () => { },
      show: () => { },
    } as unknown as vscode.OutputChannel);

/**
 * $DD DD-SW-8.1
 *
 * @brief Set the system-wide log level.
 *
 * @param [in]  level   New log level.
 *
 * [Satisfies $ARCH ARCH-8]
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/******************************************************************************
 * Internal Helpers
 ******************************************************************************/

/**
 * @brief Determine if a message should be logged based on current level.
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * @brief Format a timestamp for log entries.
 *
 * @return HH:MM:SS.mmm formatted string.
 */
function formatTimestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

/**
 * @brief Core logging function. Prints to channel and appends to file.
 *
 * @param [in]  level       Severity level.
 * @param [in]  component   System component identifier.
 * @param [in]  message     Log message.
 * @param [in]  data        Optional context object.
 */
function log(
  level: LogLevel,
  component: string,
  message: string,
  data?: any,
): void {
  if (!shouldLog(level)) return;

  const tag = level.toUpperCase().padEnd(5);
  const line = `[${formatTimestamp()}] ${tag} [${component}] ${message}`;
  outputChannel.appendLine(line);
  console.log(line); // Mirror to console for E2E terminal visibility

  let extra = "";
  if (data !== undefined) {
    extra = `\n  └─ ${stringifySafe(data)}`;
    outputChannel.appendLine(`  └─ ${stringifySafe(data)}`);
    console.log(`  └─ ${stringifySafe(data)}`); // Mirror to console
  }

  try {
    fs.appendFileSync(LOG_FILE, line + extra + "\n");
  } catch (e) { }
}

/******************************************************************************
 * Public Interface - Logging Methods
 ******************************************************************************/

/**
 * @brief Facade for component-scoped logging.
 */
export const logger = {
  debug: (component: string, msg: string, data?: any) =>
    log("debug", component, msg, data),
  info: (component: string, msg: string, data?: any) =>
    log("info", component, msg, data),
  warn: (component: string, msg: string, data?: any) =>
    log("warn", component, msg, data),
  error: (component: string, msg: string, data?: any) =>
    log("error", component, msg, data),
};

/**
 * $DD DD-SW-8.2
 *
 * @brief Safely stringify objects to avoid circular reference errors.
 *
 * @param [in]  obj     The object to stringify.
 * @param [in]  indent  JSON indentation level (default 2).
 *
 * @return JSON string or error message.
 *
 * [Satisfies $ARCH ARCH-8]
 */
export function stringifySafe(obj: any, indent: number = 2): string {
  const cache = new Set();
  try {
    return JSON.stringify(
      obj,
      (_key, value) => {
        if (typeof value === "object" && value !== null) {
          if (cache.has(value)) return "[Circular]";
          cache.add(value);
        }
        return value;
      },
      indent,
    );
  } catch (e) {
    return `[Serialization Error: ${e instanceof Error ? e.message : String(e)}]`;
  /* v8 ignore next 3 -- finally always runs; branch instrumentation counts entry from try AND catch, but only one path executes */
  } finally {
    cache.clear();
  }
}

/******************************************************************************
 * End of File
 ******************************************************************************/
