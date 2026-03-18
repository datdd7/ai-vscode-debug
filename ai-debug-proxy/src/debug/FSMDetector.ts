/******************************************************************************
 * @file        FSMDetector.ts
 *
 * @brief       Finite State Machine transition detection.
 *
 * @details
 * This module detects state machine variables and transitions by analyzing
 * variable names, types, and value changes across debug steps.
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
 * DD-WATCH-5   FSM Detection
 * DD-WATCH-6   State Transition Tracking
 *
 * Architecture Requirements:
 * ARCH-HEURISTIC-004 FSM Analysis [Satisfies $AI AI-7]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import { logger } from "../utils/logging";
import { VariableInfo } from "../types";
import { VariableChangeTracker } from "./VariableChangeTracker";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "FSMDetector";

// State variable name patterns
const STATE_PATTERNS = [
  /state/i,
  /status/i,
  /mode/i,
  /phase/i,
  /_st$/i,
  /_state$/i,
  /^m_/i,
  /fsm/i,
  /machine/i,
];

// Common state values for known FSMs
const KNOWN_STATES = new Map<string, string[]>([
  ['motor_state', ['MOTOR_STATE_STOPPED', 'MOTOR_STATE_RUNNING', 'MOTOR_STATE_ERROR', 'MOTOR_STATE_INIT']],
  ['system_state', ['SYSTEM_STATE_IDLE', 'SYSTEM_STATE_ACTIVE', 'SYSTEM_STATE_ERROR']],
  ['connection_state', ['CONNECTED', 'DISCONNECTED', 'CONNECTING', 'ERROR']],
]);

/******************************************************************************
 * Type Definitions
 ******************************************************************************/

/**
 * @brief FSM transition detection result.
 */
export interface FSMTransition {
  variable: string;
  oldState: string;
  newState: string;
  stepNumber: number;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
  confidence: number;
}

/**
 * @brief Watch suggestion.
 */
export interface WatchSuggestion {
  variable: string;
  reason: string;
  riskLevel: 'high' | 'medium' | 'low';
  riskScore: number;
  expression: string;
  category: 'recent_change' | 'boundary' | 'fsm' | 'null_pointer';
  metadata?: {
    changeCount?: number;
    oldValue?: string;
    newValue?: string;
    threshold?: string;
    oldState?: string;
    newState?: string;
  };
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-WATCH-5.1
 *
 * @brief Detect FSM variables and transitions.
 *
 * Analyzes variable names and values to identify state machine
 * variables and detect state transitions.
 *
 * [Satisfies $ARCH ARCH-HEURISTIC-004]
 */
export class FSMDetector {
  private previousStates: Map<string, Map<string, string>> = new Map();  // sessionId -> varName -> value

  constructor(private changeTracker?: VariableChangeTracker) {}

  /**
   * @brief Identify potential state variables.
   *
   * @param [in]  variables   Array of variables to analyze.
   *
   * @return Array of state variable names.
   */
  identifyStateVariables(variables: VariableInfo[]): string[] {
    const stateVars: string[] = [];

    for (const variable of variables) {
      // Check name patterns
      const isStateVar = STATE_PATTERNS.some(pattern => pattern.test(variable.name));
      
      // Check if value looks like an enum/state
      const isEnumLike = this.isEnumLike(variable.value);
      
      if (isStateVar || isEnumLike) {
        stateVars.push(variable.name);
      }
    }

    return stateVars;
  }

  /**
   * @brief Detect state transitions.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  variables   Current variables.
   *
   * @return Array of detected transitions.
   */
  detectTransitions(sessionId: string, variables: VariableInfo[]): FSMTransition[] {
    const transitions: FSMTransition[] = [];
    const sessionPrevStates = this.previousStates.get(sessionId) || new Map();
    const currentStep = this.changeTracker?.getCurrentStep(sessionId) ?? 0;

    for (const variable of variables) {
      // Check if this is a state variable
      if (!STATE_PATTERNS.some(p => p.test(variable.name))) {
        continue;
      }

      const prevState = sessionPrevStates.get(variable.name);
      const currentState = variable.value || 'unknown';

      if (prevState && prevState !== currentState) {
        // State transition detected!
        const riskLevel = this.assessTransitionRisk(variable.name, prevState, currentState);
        
        transitions.push({
          variable: variable.name,
          oldState: prevState,
          newState: currentState,
          stepNumber: currentStep,
          riskLevel,
          reason: `State transition: ${prevState} → ${currentState}`,
          confidence: riskLevel === 'high' ? 0.9 : 0.7,
        });
      }
    }

    // Update previous states
    const newPrevStates = new Map<string, string>();
    for (const variable of variables) {
      if (STATE_PATTERNS.some(p => p.test(variable.name))) {
        newPrevStates.set(variable.name, variable.value || 'unknown');
      }
    }
    this.previousStates.set(sessionId, newPrevStates);

    return transitions;
  }

  /**
   * @brief Generate watch suggestions from transitions.
   *
   * @param [in]  transitions   Array of transitions.
   *
   * @return Array of watch suggestions.
   */
  generateSuggestions(transitions: FSMTransition[]): WatchSuggestion[] {
    return transitions.map(t => ({
      variable: t.variable,
      reason: t.reason,
      riskLevel: t.riskLevel,
      riskScore: t.riskLevel === 'high' ? 3 : t.riskLevel === 'medium' ? 2 : 1,
      expression: t.variable,
      category: 'fsm',
      metadata: {
        oldState: t.oldState,
        newState: t.newState,
      },
    }));
  }

  /**
   * @brief Clear state tracking for session.
   *
   * @param [in]  sessionId   Debug session ID.
   */
  clear(sessionId: string): void {
    this.previousStates.delete(sessionId);
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * @brief Check if value looks like an enum/state.
   *
   * @param [in]  value   Variable value.
   *
   * @return True if enum-like.
   */
  private isEnumLike(value: string): boolean {
    if (!value) return false;
    
    // Check for uppercase enum patterns
    if (/^[A-Z][A-Z0-9_]+$/.test(value)) {
      return true;
    }
    
    // Check for known state patterns
    for (const states of KNOWN_STATES.values()) {
      if (states.some(s => value.includes(s))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * @brief Assess risk level of state transition.
   *
   * @param [in]  varName     Variable name.
   * @param [in]  oldState    Previous state.
   * @param [in]  newState    New state.
   *
   * @return Risk level.
   */
  private assessTransitionRisk(varName: string, oldState: string, newState: string): 'high' | 'medium' | 'low' {
    const newStateLower = newState.toLowerCase();
    const oldStateLower = oldState.toLowerCase();
    
    // High risk: transitioning to error/invalid state
    if (newStateLower.includes('error') || 
        newStateLower.includes('invalid') ||
        newStateLower.includes('fault')) {
      return 'high';
    }
    
    // High risk: unexpected state changes
    if (KNOWN_STATES.has(varName)) {
      const knownStates = KNOWN_STATES.get(varName)!;
      if (!knownStates.some(s => s.toLowerCase() === newStateLower)) {
        return 'high';  // Unknown state
      }
    }
    
    // Medium risk: transitioning from running/active to stopped
    if ((oldStateLower.includes('run') || oldStateLower.includes('active')) &&
        (newStateLower.includes('stop') || newStateLower.includes('idle'))) {
      return 'medium';
    }
    
    // Medium risk: initialization states
    if (newStateLower.includes('init') || newStateLower.includes('reset')) {
      return 'medium';
    }
    
    return 'low';
  }
}

/******************************************************************************
 * Singleton Instance
 ******************************************************************************/

/**
 * @brief Global FSM detector instance.
 */
export const fsmDetector = new FSMDetector();

/******************************************************************************
 * End of File
 ******************************************************************************/
