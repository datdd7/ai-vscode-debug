/******************************************************************************
 * @file        VariableChangeTracker.ts
 *
 * @brief       Variable change tracking with LRU history cache.
 *
 * @details
 * This module tracks variable values across debug steps, detecting changes
 * and maintaining history for heuristic analysis. Uses LRU cache to limit
 * memory usage to last N steps.
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
 * DD-WATCH-1   Variable Change Tracking
 * DD-WATCH-2   LRU History Cache
 *
 * Architecture Requirements:
 * ARCH-WATCH-001  Variable History Tracking [Satisfies $AI AI-3]
 * ARCH-HEURISTIC-001 Change Detection [Satisfies $AI AI-4]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import { logger } from "../utils/logging";
import { VariableInfo } from "../types";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "VariableChangeTracker";
const DEFAULT_MAX_STEPS = 50;
const DEFAULT_CHANGE_WINDOW = 5;

/******************************************************************************
 * Type Definitions
 ******************************************************************************/

/**
 * @brief Snapshot of variables at a specific step.
 */
interface VariableSnapshot {
  timestamp: number;
  stepNumber: number;
  variables: Map<string, VariableState>;
}

/**
 * @brief State of a single variable.
 */
interface VariableState {
  name: string;
  value: string;
  type: string;
}

/**
 * @brief Detected change in variable.
 */
export interface VariableChange {
  name: string;
  oldValue: string;
  newValue: string;
  type: string;
  stepsAgo: number;
  changeCount: number;
  firstChangeStep: number;
}

/**
 * @brief Variable history entry.
 */
export interface VariableHistoryEntry {
  step: number;
  value: string;
  timestamp: number;
}

/******************************************************************************
 * Internal Classes - LRU Cache
 ******************************************************************************/

/**
 * @brief Simple LRU cache for variable snapshots.
 */
class LRUCache<K, V> {
  private max: number;
  private map: Map<K, V>;

  constructor(max: number = DEFAULT_MAX_STEPS) {
    this.max = max;
    this.map = new Map<K, V>();
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.max) {
      // Delete oldest (first) entry
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  get size(): number {
    return this.map.size;
  }

  get entries(): Array<[K, V]> {
    return Array.from(this.map.entries());
  }
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-WATCH-1.1
 *
 * @brief Track variable changes across debug steps.
 *
 * Maintains per-session LRU cache of variable snapshots,
 * detects changes, and provides history queries.
 *
 * [Satisfies $ARCH ARCH-WATCH-001]
 */
export class VariableChangeTracker {
  private history: LRUCache<string, VariableSnapshot[]>;  // sessionId -> snapshots
  private stepCounters: Map<string, number>;  // sessionId -> step counter
  private changeCounts: Map<string, Map<string, number>>;  // sessionId -> varName -> count

  constructor(private maxSteps: number = DEFAULT_MAX_STEPS) {
    this.history = new LRUCache(100);  // Cache for 100 sessions
    this.stepCounters = new Map();
    this.changeCounts = new Map();
  }

  /**
   * @brief Track variables at current step.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  variables   Current variables.
   *
   * @return Number of changes detected.
   */
  trackVariables(sessionId: string, variables: VariableInfo[]): number {
    const stepNumber = this.stepCounters.get(sessionId) ?? 0;
    const snapshot: VariableSnapshot = {
      timestamp: Date.now(),
      stepNumber,
      variables: new Map(variables.map(v => [v.name, { name: v.name, value: v.value || '', type: v.type || '' }])),
    };

    // Get or create session history
    let sessionHistory = this.history.get(sessionId);
    if (!sessionHistory) {
      sessionHistory = [];
      this.history.set(sessionId, sessionHistory);
    }

    // Detect changes from previous snapshot
    let changeCount = 0;
    if (sessionHistory.length > 0) {
      const prevSnapshot = sessionHistory[sessionHistory.length - 1];
      changeCount = this.detectChanges(sessionId, prevSnapshot, snapshot);
    }

    // Add to history
    sessionHistory.push(snapshot);
    
    // Limit history size
    if (sessionHistory.length > this.maxSteps) {
      sessionHistory.shift();
    }

    this.stepCounters.set(sessionId, stepNumber + 1);
    
    logger.debug(LOG, `Tracked ${variables.length} variables, ${changeCount} changes at step ${stepNumber}`);
    
    return changeCount;
  }

  /**
   * @brief Get variables that changed in last N steps.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  lastNSteps  Number of steps to look back (default: 5).
   *
   * @return Array of variable changes.
   */
  getChangedVariables(sessionId: string, lastNSteps: number = DEFAULT_CHANGE_WINDOW): VariableChange[] {
    const sessionHistory = this.history.get(sessionId);
    if (!sessionHistory || sessionHistory.length < 2) {
      return [];
    }

    const changes = new Map<string, VariableChange>();
    const currentStep = this.stepCounters.get(sessionId) ?? 0;
    const changeCounts = this.changeCounts.get(sessionId) || new Map();

    // Look back N steps
    const startIndex = Math.max(0, sessionHistory.length - lastNSteps - 1);
    
    for (let i = startIndex; i < sessionHistory.length - 1; i++) {
      const prev = sessionHistory[i];
      const curr = sessionHistory[i + 1];
      
      for (const [name, currState] of curr.variables) {
        const prevState = prev.variables.get(name);
        if (!prevState) continue;
        
        if (prevState.value !== currState.value) {
          const stepsAgo = currentStep - curr.stepNumber;
          
          if (!changes.has(name)) {
            changes.set(name, {
              name,
              oldValue: prevState.value,
              newValue: currState.value,
              type: currState.type,
              stepsAgo,
              changeCount: changeCounts.get(name) ?? 1,
              firstChangeStep: curr.stepNumber,
            });
          } else {
            // Update with most recent change
            const change = changes.get(name)!;
            change.newValue = currState.value;
            change.stepsAgo = stepsAgo;
          }
        }
      }
    }

    return Array.from(changes.values())
      .sort((a, b) => b.changeCount - a.changeCount);  // Most changed first
  }

  /**
   * @brief Get history of a specific variable.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  varName     Variable name.
   *
   * @return Array of history entries.
   */
  getVariableHistory(sessionId: string, varName: string): VariableHistoryEntry[] {
    const sessionHistory = this.history.get(sessionId);
    if (!sessionHistory) {
      return [];
    }

    const history: VariableHistoryEntry[] = [];
    
    for (const snapshot of sessionHistory) {
      const state = snapshot.variables.get(varName);
      if (state) {
        history.push({
          step: snapshot.stepNumber,
          value: state.value,
          timestamp: snapshot.timestamp,
        });
      }
    }

    return history;
  }

  /**
   * @brief Get most frequently changed variables.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  topN        Number of top variables to return.
   *
   * @return Array of variable changes sorted by change count.
   */
  getMostChangedVariables(sessionId: string, topN: number = 5): VariableChange[] {
    const changes = this.getChangedVariables(sessionId, this.maxSteps);
    return changes.slice(0, topN);
  }

  /**
   * @brief Clear tracking data for a session.
   *
   * @param [in]  sessionId   Debug session ID.
   */
  clear(sessionId: string): void {
    this.history.set(sessionId, []);
    this.stepCounters.delete(sessionId);
    this.changeCounts.delete(sessionId);
  }

  /**
   * @brief Get current step number for session.
   *
   * @param [in]  sessionId   Debug session ID.
   *
   * @return Current step number.
   */
  getCurrentStep(sessionId: string): number {
    return this.stepCounters.get(sessionId) ?? 0;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * @brief Detect changes between two snapshots.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  prev        Previous snapshot.
   * @param [in]  curr        Current snapshot.
   *
   * @return Number of changes detected.
   */
  private detectChanges(sessionId: string, prev: VariableSnapshot, curr: VariableSnapshot): number {
    let changeCount = 0;
    const sessionChangeCounts = this.changeCounts.get(sessionId) || new Map();

    for (const [name, currState] of curr.variables) {
      const prevState = prev.variables.get(name);
      if (!prevState) continue;

      if (prevState.value !== currState.value) {
        changeCount++;
        const count = sessionChangeCounts.get(name) ?? 0;
        sessionChangeCounts.set(name, count + 1);
      }
    }

    // Decay old change counts (reduce by 1 every 10 steps)
    if (curr.stepNumber % 10 === 0) {
      for (const [name, count] of sessionChangeCounts) {
        if (count > 0) {
          sessionChangeCounts.set(name, count - 1);
        }
      }
    }

    this.changeCounts.set(sessionId, sessionChangeCounts);
    
    return changeCount;
  }
}

/******************************************************************************
 * Singleton Instance
 ******************************************************************************/

/**
 * @brief Global change tracker instance.
 */
export const variableChangeTracker = new VariableChangeTracker();

/******************************************************************************
 * End of File
 ******************************************************************************/
