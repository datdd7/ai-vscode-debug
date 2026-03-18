/******************************************************************************
 * @file        events.ts
 *
 * @brief       DAP event tracking and state management.
 *
 * @details
 * This module implements state tracking for Debug Adapter Protocol (DAP)
 * events, such as process stops, exits, and termination. It provides
 * mechanisms for awaiting stop events and retrieving per-session debug state.
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
import { logger } from "../utils/logging";
import { clearLastSession } from "./session";
import { StopEventResult } from "../types";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "Events";

// --- Per-session state ---
interface SessionDebugState {
  topFrameId?: number;
  lastStopBody?: any;
  currentThreadId?: number;
  currentFrameId?: number;  // NEW: Auto-resolved frame ID
  lastLocation?: {          // NEW: Last known location
    file: string;
    line: number;
    function?: string;
  };
  stateValid?: boolean;     // NEW: Track if state is fresh
}
const _sessionState = new Map<string, SessionDebugState>();

// --- Stop event waiters (array to support concurrent callers) ---
type StopResolver = (result: StopEventResult) => void;
const _stopResolvers: StopResolver[] = [];

/******************************************************************************
 * Internal Helpers
 ******************************************************************************/

/**
 * @brief Resolve all pending stop event waiters.
 *
 * @param [in]  stopped     Whether the stop was successful.
 * @param [in]  reason      Optional reason for the stop or exit.
 */
export function resolveWaitPromise(stopped: boolean = true, reason?: string): void {
  const resolvers = _stopResolvers.splice(0);
  for (const resolve of resolvers) resolve({ stopped, reason });
}

/******************************************************************************
 * Public Interface - Accessors
 ******************************************************************************/

/**
 * $DD DD-SW-1.8
 *
 * @brief Get the top-most frame ID for a session.
 *
 * @param [in]  sessionId   Optional session ID (defaults to active session).
 *
 * @return Frame ID or undefined.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function getCurrentTopFrameId(sessionId?: string): number | undefined {
  if (sessionId) return _sessionState.get(sessionId)?.topFrameId;
  const active = vscode.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.topFrameId : undefined;
}

/**
 * $DD DD-SW-1.9
 *
 * @brief Update the cached top-most frame ID for a session.
 *
 * @param [in]  frameId     New top frame ID.
 * @param [in]  sessionId   Optional session ID.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function updateCurrentTopFrameId(
  frameId: number,
  sessionId?: string,
): void {
  const id = sessionId ?? vscode.debug.activeDebugSession?.id;
  if (!id) return;
  const state = _sessionState.get(id) ?? {};
  state.topFrameId = frameId;
  state.currentFrameId = frameId;  // Also update current frame
  state.stateValid = true;
  _sessionState.set(id, state);
}

/**
 * $DD DD-SW-1.10
 *
 * @brief Clear the cached top-most frame ID.
 *
 * @param [in]  sessionId   Optional session ID.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function clearCurrentTopFrameId(sessionId?: string): void {
  const id = sessionId ?? vscode.debug.activeDebugSession?.id;
  if (id) {
    const state = _sessionState.get(id);
    if (state) state.topFrameId = undefined;
  }
}

/**
 * $DD DD-SW-1.9.1
 *
 * @brief Get the user-selected thread ID for a session.
 *
 * @param [in]  sessionId   Optional session ID.
 *
 * @return Thread ID or undefined.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function getCurrentThreadId(sessionId?: string): number | undefined {
  if (sessionId) return _sessionState.get(sessionId)?.currentThreadId;
  const active = vscode.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.currentThreadId : undefined;
}

/**
 * $DD DD-SW-1.9.2
 *
 * @brief Set the user-selected thread ID for a session.
 *
 * @param [in]  threadId    New thread ID.
 * @param [in]  sessionId   Optional session ID.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function setCurrentThreadId(
  threadId: number,
  sessionId?: string,
): void {
  const id = sessionId ?? vscode.debug.activeDebugSession?.id;
  if (!id) return;
  const state = _sessionState.get(id) ?? {};
  state.currentThreadId = threadId;
  state.stateValid = true;
  _sessionState.set(id, state);
}

/**
 * $DD DD-SW-1.9.3
 *
 * @brief Get the current frame ID for a session.
 *
 * @param [in]  sessionId   Optional session ID.
 *
 * @return Frame ID or undefined.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function getCurrentFrameId(sessionId?: string): number | undefined {
  if (sessionId) return _sessionState.get(sessionId)?.currentFrameId;
  const active = vscode.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.currentFrameId : undefined;
}

/**
 * $DD DD-SW-1.9.4
 *
 * @brief Set the current frame ID for a session.
 *
 * @param [in]  frameId     New frame ID.
 * @param [in]  sessionId   Optional session ID.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function setCurrentFrameId(
  frameId: number,
  sessionId?: string,
): void {
  const id = sessionId ?? vscode.debug.activeDebugSession?.id;
  if (!id) return;
  const state = _sessionState.get(id) ?? {};
  state.currentFrameId = frameId;
  state.stateValid = true;
  _sessionState.set(id, state);
}

/**
 * $DD DD-SW-1.9.5
 *
 * @brief Get the last known location for a session.
 *
 * @param [in]  sessionId   Optional session ID.
 *
 * @return Location or undefined.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function getLastLocation(sessionId?: string): {
  file: string;
  line: number;
  function?: string;
} | undefined {
  if (sessionId) return _sessionState.get(sessionId)?.lastLocation;
  const active = vscode.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.lastLocation : undefined;
}

/**
 * $DD DD-SW-1.9.6
 *
 * @brief Check if session state is valid.
 *
 * @param [in]  sessionId   Optional session ID.
 *
 * @return True if state is valid, false otherwise.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function isStateValid(sessionId?: string): boolean {
  if (sessionId) return _sessionState.get(sessionId)?.stateValid ?? false;
  const active = vscode.debug.activeDebugSession;
  return active ? (_sessionState.get(active.id)?.stateValid ?? false) : false;
}

/**
 * $DD DD-SW-1.9.7
 *
 * @brief Invalidate session state (called on continue/step operations).
 *
 * @param [in]  sessionId   Optional session ID.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function invalidateState(sessionId?: string): void {
  const id = sessionId ?? vscode.debug.activeDebugSession?.id;
  if (!id) return;
  const state = _sessionState.get(id) ?? {};
  state.stateValid = false;
  _sessionState.set(id, state);
}

/**
 * $DD DD-SW-1.11
 *
 * @brief Retrieve the body of the most recent DAP stop event.
 *
 * @param [in]  sessionId   Optional session ID.
 *
 * @return Stop event body or undefined.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function getLastStopEventBody(sessionId?: string): any {
  if (sessionId) return _sessionState.get(sessionId)?.lastStopBody;
  const active = vscode.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.lastStopBody : undefined;
}

/**
 * $DD DD-SW-1.12
 *
 * @brief Find the ID of the session that most recently emitted a stop event.
 *
 * @return Session ID or undefined.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function getLastStopSessionId(): string | undefined {
  let last: string | undefined;
  for (const [id, state] of _sessionState) {
    if (state.lastStopBody !== undefined) last = id;
  }
  return last;
}

/**
 * $DD DD-SW-1.13
 *
 * @brief Clear the stop event cache for one or all sessions.
 *
 * @param [in]  sessionId   Optional session ID to clear. If unspecified, clears all.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function clearLastStopEvent(sessionId?: string): void {
  if (sessionId) {
    const state = _sessionState.get(sessionId);
    if (state) state.lastStopBody = undefined;
  } else {
    for (const state of _sessionState.values()) {
      state.lastStopBody = undefined;
    }
  }
}

/******************************************************************************
 * Public Interface - Event Waiting
 ******************************************************************************/

/**
 * $DD DD-SW-1.6
 *
 * @brief Wait for the debugger to emit a stopped event.
 *
 * @param [in]  timeoutMs   Maximum time to wait.
 *
 * @return Promise resolving to true if stopped, false on timeout.
 *
 * [Satisfies $ARCH ARCH-4]
 */
export function waitForStopEvent(timeoutMs: number): Promise<StopEventResult> {
  return new Promise<StopEventResult>((resolve) => {
    const timer = setTimeout(() => {
      const idx = _stopResolvers.indexOf(resolver);
      if (idx !== -1) _stopResolvers.splice(idx, 1);
      // Check if program already stopped (crash detection)
      const lastStop = getLastStopEventBody();
      if (lastStop) {
        logger.info(LOG, `Program already stopped: reason=${lastStop.reason}`);
        resolve({ stopped: true, reason: lastStop.reason }); // Already stopped, don't wait
      } else {
        logger.warn(LOG, `Stop event timeout after ${timeoutMs}ms`);
        resolve({ stopped: false, reason: 'timeout' });
      }
    }, timeoutMs);

    const resolver: StopResolver = (result) => {
      clearTimeout(timer);
      resolve(result);
    };
    _stopResolvers.push(resolver);
  });
}

/**
 * $DD DD-SW-1.14
 *
 * @brief Register a callback for DAP stop events.
 *
 * @param [in]  callback    Function to execute on stop.
 *
 * $ARCH ARCH-4
 */
export function onDapStopEvent(
  callback: (sessionId: string, body: any) => void,
): void {
  stopEventCallbacks.push(callback);
}

const stopEventCallbacks: ((sessionId: string, body: any) => void)[] = [];

/******************************************************************************
 * Internal Classes - Debug Adapter Tracker
 ******************************************************************************/

/**
 * @brief Tracker for intercepting DAP messages.
 */
class DapStopTracker implements vscode.DebugAdapterTracker {
  constructor(private session: vscode.DebugSession) { }

  onDidSendMessage(message: any): void {
    if (message.type === "event") {
      if (message.event === "stopped") {
        const body = message.body || {};
        logger.debug(
          LOG,
          `Stopped event (Tracker): reason=${body.reason}`,
          body,
        );

        const state = _sessionState.get(this.session.id) ?? {};
        state.lastStopBody = body;
        
        // NEW: Auto-update thread and frame from stop event
        if (body.threadId !== undefined) {
          state.currentThreadId = body.threadId;
        }
        state.currentFrameId = 0;  // Default to top frame on stop
        state.stateValid = true;
        
        _sessionState.set(this.session.id, state);

        resolveWaitPromise(true, body.reason);

        for (const cb of stopEventCallbacks) {
          try {
            cb(this.session.id, body);
          } catch (err) {
            logger.error(LOG, "Error in stop event callback", err);
          }
        }
      } else if (message.event === "terminated" || message.event === "exited") {
        logger.debug(LOG, `Program ${message.event} (Tracker)`);
        resolveWaitPromise(false, message.event);
      }
    }
  }
}

/**
 * @brief Factory for DAP trackers.
 */
class DapStopTrackerFactory implements vscode.DebugAdapterTrackerFactory {
  createDebugAdapterTracker(
    session: vscode.DebugSession,
  ): vscode.ProviderResult<vscode.DebugAdapterTracker> {
    return new DapStopTracker(session);
  }
}

/******************************************************************************
 * Public Interface - Registration
 ******************************************************************************/

/**
 * $DD DD-SW-1.7
 *
 * @brief Register VS Code debug event listeners.
 *
 * Hooks into session lifecycle and DAP communication.
 * Should be called once during extension activation.
 *
 * @param [in]  context   VS Code extension context.
 *
 * [Satisfies $ARCH ARCH-2, ARCH-4]
 */
export function registerDebugEventListeners(
  context: vscode.ExtensionContext,
): void {
  context.subscriptions.push(
    vscode.debug.onDidStartDebugSession((session) => {
      logger.info(LOG, `Session started: ${session.name} [${session.id}]`);
      _sessionState.set(session.id, {});
    }),
  );

  context.subscriptions.push(
    vscode.debug.onDidTerminateDebugSession((session) => {
      logger.info(LOG, `Session terminated: ${session.name} [${session.id}]`);
      resolveWaitPromise(false, "terminated");
      _sessionState.delete(session.id);
      clearLastSession();
    }),
  );

  context.subscriptions.push(
    vscode.debug.onDidReceiveDebugSessionCustomEvent((e) => {
      logger.debug(LOG, `Custom event: ${e.event}`);
    }),
  );

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterTrackerFactory(
      "*",
      new DapStopTrackerFactory(),
    ),
  );

  context.subscriptions.push(
    vscode.debug.onDidChangeBreakpoints((e) => {
      logger.debug(
        LOG,
        `Breakpoints changed: +${e.added.length} -${e.removed.length} ~${e.changed.length}`,
      );
    }),
  );
}

/******************************************************************************
 * End of File
 ******************************************************************************/
