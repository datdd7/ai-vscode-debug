/******************************************************************************
 * @file        ContextAggregator.ts
 *
 * @brief       Context aggregation service for AI Debug Proxy.
 *
 * @details
 * This module provides a unified context snapshot API that aggregates
 * stack trace, variables, source code, and thread information into a
 * single response. Optimized for AI agent consumption with parallel
 * fetching and response compression.
 *
 * @project     AI Debug Proxy
 * @component   Debug Module
 *
 * @author      AI Agent
 * @date        2026-03-18
 *
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-CTX-1     Context Aggregation
 * DD-CTX-2     Response Compression
 *
 * Architecture Requirements:
 * ARCH-CTX-001  Single-Call Context API [Satisfies $AI AI-1]
 * ARCH-CACHE-001 Context Caching [Satisfies $AI AI-2]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import { logger } from "../utils/logging";
import {
  StackFrameInfo,
  VariableInfo,
} from "../types";
import { getStackTrace } from "./inspection";
import { 
  getCurrentFrameId, 
  getCurrentThreadId,
  getLastLocation,
  isStateValid 
} from "./events";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "ContextAggregator";
const DEFAULT_DEPTH = 10;
const DEFAULT_SOURCE_LINES = 10;
const MAX_VARIABLE_VALUE_LENGTH = 200;
const MAX_VARIABLES_PER_SCOPE = 50;

/******************************************************************************
 * Type Definitions
 ******************************************************************************/

/**
 * @brief Options for context aggregation.
 */
export interface ContextOptions {
  /** Maximum stack frames to return (default: 10) */
  depth?: number;
  /** Sections to include: ['stack', 'variables', 'source', 'threads'] */
  include?: string[];
  /** Sections to exclude */
  exclude?: string[];
  /** Maximum variables per scope (default: 50) */
  maxVariables?: number;
  /** Lines around current line for source (default: 10) */
  sourceLines?: number;
}

/**
 * @brief Location information.
 */
export interface LocationInfo {
  file: string;
  line: number;
  function?: string;
}

/**
 * @brief Source code window.
 */
export interface SourceInfo {
  window: string;
  code: string;
  highlights: Array<{ line: number; reason: string }>;
}

/**
 * @brief Variable scope with variables.
 */
export interface VariableScope {
  scopeName: string;
  locals: VariableInfo[];
  globals?: VariableInfo[];
}

/**
 * @brief Thread information.
 */
export interface ThreadContextInfo {
  id: number;
  name: string;
  state: string;
  current: boolean;
}

/**
 * @brief Complete context result.
 */
export interface ContextResult {
  location: LocationInfo;
  source: SourceInfo | null;
  stack: StackFrameInfo[];
  variables: VariableScope[];
  threads: ThreadContextInfo[];
  metadata: {
    cached: boolean;
    timestamp: string;
    latencyMs: number;
    compressionApplied: boolean;
  };
}

/******************************************************************************
 * Internal Helpers
 ******************************************************************************/

/**
 * @brief Check if section should be included.
 *
 * @param [in]  section   Section name.
 * @param [in]  options   Context options.
 *
 * @return True if section should be included.
 */
function shouldIncludeSection(section: string, options: ContextOptions): boolean {
  if (options.exclude?.includes(section)) {
    return false;
  }
  if (options.include?.length && !options.include.includes(section)) {
    return false;
  }
  return true;
}

/**
 * @brief Compress variable value for response.
 *
 * @param [in]  value   Variable value string.
 *
 * @return Compressed value (truncated if too long).
 */
function compressValue(value: string): string {
  if (!value || value.length <= MAX_VARIABLE_VALUE_LENGTH) {
    return value;
  }
  return value.substring(0, MAX_VARIABLE_VALUE_LENGTH - 3) + '...';
}

/**
 * @brief Compress variables in scope.
 *
 * @param [in]  variables   Array of variables.
 * @param [in]  maxVars     Maximum variables to return.
 *
 * @return Compressed variables array.
 */
function compressVariables(
  variables: VariableInfo[],
  maxVars: number = MAX_VARIABLES_PER_SCOPE
): VariableInfo[] {
  if (!variables) return [];
  
  const limited = variables.slice(0, maxVars);
  return limited.map(v => ({
    ...v,
    value: compressValue(v.value || ''),
    type: v.type?.substring(0, 50) || v.type,
  }));
}

/**
 * @brief Fetch source code around current location.
 *
 * @param [in]  session   VS Code debug session.
 * @param [in]  location  Current location.
 * @param [in]  lines     Lines around current line.
 *
 * @return Source info or null if fetch fails.
 */
async function fetchSource(
  session: vscode.DebugSession,
  location: LocationInfo,
  lines: number
): Promise<SourceInfo | null> {
  try {
    if (!location.file || !location.line) {
      return null;
    }

    // Use existing list_source operation from inspection
    const { listSource } = await import('./inspection');
    const result = await listSource(session, {
      linesAround: lines
    });

    if (!result.success || !result.sourceCode) {
      return null;
    }

    return {
      window: `lines ${Math.max(1, location.line - lines)}-${location.line + lines}`,
      code: result.sourceCode,
      highlights: [
        { line: location.line, reason: 'current' },
      ],
    };
  } catch (e: any) {
    logger.warn(LOG, `Failed to fetch source: ${e.message}`);
    return null;
  }
}

/**
 * @brief Fetch threads from debug session.
 *
 * @param [in]  session   VS Code debug session.
 *
 * @return Array of thread info.
 */
async function fetchThreads(
  session: vscode.DebugSession
): Promise<ThreadContextInfo[]> {
  try {
    const currentThreadId = getCurrentThreadId(session.id);
    const response = await session.customRequest('threads');
    const threads: any[] = response.threads || [];
    
    return threads.map((t: any) => ({
      id: t.id,
      name: t.name || `Thread ${t.id}`,
      state: 'stopped',
      current: t.id === currentThreadId,
    }));
  } catch (e: any) {
    logger.warn(LOG, `Failed to fetch threads: ${e.message}`);
    return [];
  }
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-CTX-1.1
 *
 * @brief Aggregate complete debug context for AI agent.
 *
 * Fetches stack, variables, source, and threads in parallel,
 * applies compression, and returns unified context object.
 *
 * @param [in]  session   VS Code debug session.
 * @param [in]  options   Context options (depth, filters, etc.).
 *
 * @return Promise resolving to context result.
 *
 * [Satisfies $ARCH ARCH-CTX-001]
 */
export async function aggregateContext(
  session: vscode.DebugSession,
  options: ContextOptions = {}
): Promise<ContextResult> {
  const startTime = Date.now();
  
  // Get location from PROXY-001 state
  let location = getLastLocation(session.id);
  
  // Fallback: fetch from stack trace if not in state
  if (!location) {
    logger.debug(LOG, 'Location not in state, fetching from stack trace');
    const threadId = getCurrentThreadId(session.id) || 1;
    try {
      const stackResponse = await session.customRequest('stackTrace', {
        threadId,
        startFrame: 0,
        levels: 1,
      });
      if (stackResponse.stackFrames?.length > 0) {
        const frame = stackResponse.stackFrames[0];
        location = {
          file: frame.source?.path || 'unknown',
          line: frame.line || 0,
          function: frame.name,
        };
      }
    } catch (e: any) {
      logger.warn(LOG, `Failed to fetch location: ${e.message}`);
      location = { file: 'unknown', line: 0 };
    }
  }

  const depth = options.depth ?? DEFAULT_DEPTH;
  const sourceLines = options.sourceLines ?? DEFAULT_SOURCE_LINES;
  const maxVariables = options.maxVariables ?? MAX_VARIABLES_PER_SCOPE;

  // Parallel fetch with section filtering
  const [stackResult, variablesResult, sourceResult, threadsResult] = await Promise.all([
    // Stack trace
    shouldIncludeSection('stack', options)
      ? (async () => {
          try {
            const stack = await getStackTrace(session);
            if (!stack.success) return [];
            
            const frames = stack.frames || [];
            const limited = frames.slice(0, depth);
            
            // Compress frame data
            return limited.map(f => ({
              id: f.id,
              name: f.name,
              sourcePath: f.sourcePath?.substring(0, 200) || f.sourcePath,
              line: f.line,
              column: f.column,
            }));
          } catch (e: any) {
            logger.warn(LOG, `Stack fetch failed: ${e.message}`);
            return [];
          }
        })()
      : Promise.resolve([]),

    // Variables
    shouldIncludeSection('variables', options)
      ? (async () => {
          try {
            const { getStackFrameVariables } = await import('./inspection');
            const frameId = getCurrentFrameId(session.id) ?? 0;
            const result = await getStackFrameVariables(session, { frameId });
            
            if (!result.success || !result.scopes) return [];
            
            // Compress variables in each scope
            return result.scopes.map((scope: any) => ({
              scopeName: scope.name || 'Unknown',
              locals: compressVariables(scope.variables || [], maxVariables),
            }));
          } catch (e: any) {
            logger.warn(LOG, `Variables fetch failed: ${e.message}`);
            return [];
          }
        })()
      : Promise.resolve([]),

    // Source code
    shouldIncludeSection('source', options)
      ? fetchSource(session, location!, sourceLines)
      : Promise.resolve(null),

    // Threads
    shouldIncludeSection('threads', options)
      ? fetchThreads(session)
      : Promise.resolve([]),
  ]);

  const latencyMs = Date.now() - startTime;
  const compressionApplied = true; // Always applied in current implementation

  return {
    location: location!,
    source: sourceResult,
    stack: stackResult,
    variables: variablesResult,
    threads: threadsResult,
    metadata: {
      cached: false,
      timestamp: new Date().toISOString(),
      latencyMs,
      compressionApplied,
    },
  };
}

/******************************************************************************
 * End of File
 ******************************************************************************/
