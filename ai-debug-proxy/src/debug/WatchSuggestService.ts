/******************************************************************************
 * @file        WatchSuggestService.ts
 *
 * @brief       Watch suggestion service aggregating all heuristics.
 *
 * @details
 * This module combines variable change tracking, boundary detection,
 * and FSM transition detection to provide ranked watch suggestions
 * for AI agents.
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
 * DD-WATCH-7   Heuristic Aggregation
 * DD-WATCH-8   Risk Scoring
 *
 * Architecture Requirements:
 * ARCH-WATCH-002 Watch Suggestions [Satisfies $AI AI-8]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import { logger } from "../utils/logging";
import { VariableInfo, GetStackFrameVariablesResult } from "../types";
import { getStackTrace, getStackFrameVariables } from "./inspection";
import { getLastLocation } from "./events";
import { VariableChangeTracker, VariableChange } from "./VariableChangeTracker";
import { BoundaryDetector, BoundaryRisk } from "./BoundaryDetector";
import { FSMDetector, FSMTransition, WatchSuggestion } from "./FSMDetector";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "WatchSuggestService";
const MAX_SUGGESTIONS = 10;
const CHANGE_WINDOW = 5;  // Look back 5 steps
const HIGH_RISK_THRESHOLD = 3;
const MEDIUM_RISK_THRESHOLD = 2;

/******************************************************************************
 * Type Definitions
 ******************************************************************************/

/**
 * @brief Watch suggestion result.
 */
export interface WatchSuggestResult {
  suggestions: WatchSuggestion[];
  autoWatch?: string[];  // Variables to auto-watch
  metadata: {
    timestamp: string;
    totalCandidates: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
  };
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-WATCH-7.1
 *
 * @brief Aggregate watch suggestions from all heuristics.
 *
 * Combines change-based, boundary-based, and FSM-based suggestions,
 * ranks them by risk score, and returns top suggestions for AI agents.
 *
 * [Satisfies $ARCH ARCH-WATCH-002]
 */
export class WatchSuggestService {
  private changeTracker: VariableChangeTracker;
  private boundaryDetector: BoundaryDetector;
  private fsmDetector: FSMDetector;

  constructor(
    changeTracker?: VariableChangeTracker,
    boundaryDetector?: BoundaryDetector,
    fsmDetector?: FSMDetector
  ) {
    this.changeTracker = changeTracker || new VariableChangeTracker();
    this.boundaryDetector = boundaryDetector || new BoundaryDetector();
    this.fsmDetector = fsmDetector || new FSMDetector(this.changeTracker);
  }

  /**
   * @brief Get ranked watch suggestions for current debug state.
   *
   * @param [in]  session   VS Code debug session.
   *
   * @return Watch suggestions ranked by risk.
   */
  async getSuggestions(session: vscode.DebugSession): Promise<WatchSuggestResult> {
    const sessionId = session.id;
    const allSuggestions: WatchSuggestion[] = [];

    try {
      // Gather current variables
      const variables = await this.gatherVariables(session);
      
      // Gather source code for context-aware detection
      const location = getLastLocation(sessionId);
      const sourceLine = await this.getCurrentSourceLine(session, location);

      // 1. Change-based suggestions
      const changeCount = this.changeTracker.trackVariables(sessionId, variables);
      logger.debug(LOG, `Tracked ${variables.length} variables, ${changeCount} changes`);

      const changeSuggestions = this.getChangeBasedSuggestions(sessionId);
      allSuggestions.push(...changeSuggestions);

      // 2. Boundary-based suggestions
      const boundarySuggestions = this.getBoundarySuggestions(variables, sourceLine);
      allSuggestions.push(...boundarySuggestions);

      // 3. FSM-based suggestions
      const fsmSuggestions = this.getFSMSuggestions(sessionId, variables);
      allSuggestions.push(...fsmSuggestions);

      // Rank and deduplicate
      const ranked = this.rankAndDeduplicate(allSuggestions);
      
      // Select auto-watch variables (top high-risk)
      const autoWatch = ranked
        .filter(s => s.riskLevel === 'high')
        .slice(0, 5)
        .map(s => s.variable);

      // Count by risk level
      const highRiskCount = ranked.filter(s => s.riskLevel === 'high').length;
      const mediumRiskCount = ranked.filter(s => s.riskLevel === 'medium').length;
      const lowRiskCount = ranked.filter(s => s.riskLevel === 'low').length;

      return {
        suggestions: ranked,
        autoWatch,
        metadata: {
          timestamp: new Date().toISOString(),
          totalCandidates: allSuggestions.length,
          highRiskCount,
          mediumRiskCount,
          lowRiskCount,
        },
      };
    } catch (e: any) {
      logger.error(LOG, `Failed to get suggestions: ${e.message}`);
      return {
        suggestions: [],
        autoWatch: [],
        metadata: {
          timestamp: new Date().toISOString(),
          totalCandidates: 0,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
        },
      };
    }
  }

  /**
   * @brief Get change tracker instance.
   */
  getChangeTracker(): VariableChangeTracker {
    return this.changeTracker;
  }

  // ==========================================================================
  // Private Helpers - Suggestion Generation
  // ==========================================================================

  /**
   * @brief Get suggestions based on variable changes.
   */
  private getChangeBasedSuggestions(sessionId: string): WatchSuggestion[] {
    const suggestions: WatchSuggestion[] = [];
    const changes = this.changeTracker.getChangedVariables(sessionId, CHANGE_WINDOW);

    for (const change of changes) {
      const riskScore = this.calculateChangeRiskScore(change);
      const riskLevel = this.scoreToRiskLevel(riskScore);

      suggestions.push({
        variable: change.name,
        reason: `Changed ${change.changeCount} time(s) in last ${CHANGE_WINDOW} steps: ${change.oldValue} → ${change.newValue}`,
        riskLevel,
        riskScore,
        expression: change.name,
        category: 'recent_change',
        metadata: {
          changeCount: change.changeCount,
          oldValue: change.oldValue,
          newValue: change.newValue,
        },
      });
    }

    return suggestions;
  }

  /**
   * @brief Get suggestions based on boundary risks.
   */
  private getBoundarySuggestions(variables: VariableInfo[], sourceLine: string): WatchSuggestion[] {
    const suggestions: WatchSuggestion[] = [];

    // Overflow detection
    const overflowRisks = this.boundaryDetector.detectOverflow(variables);
    for (const risk of overflowRisks) {
      suggestions.push(this.boundaryRiskToSuggestion(risk));
    }

    // Null pointer detection
    const pointerVars = variables.filter(v => v.type?.includes('*') || v.type?.toLowerCase().includes('ptr'));
    const nullRisks = this.boundaryDetector.detectNullPointerRisk(sourceLine, pointerVars);
    for (const risk of nullRisks) {
      suggestions.push(this.boundaryRiskToSuggestion(risk));
    }

    // Capacity detection
    const capacityRisks = this.boundaryDetector.detectCapacityRisk(variables);
    for (const risk of capacityRisks) {
      suggestions.push(this.boundaryRiskToSuggestion(risk));
    }

    return suggestions;
  }

  /**
   * @brief Get suggestions based on FSM transitions.
   */
  private getFSMSuggestions(sessionId: string, variables: VariableInfo[]): WatchSuggestion[] {
    const transitions = this.fsmDetector.detectTransitions(sessionId, variables);
    return this.fsmDetector.generateSuggestions(transitions);
  }

  // ==========================================================================
  // Private Helpers - Ranking & Scoring
  // ==========================================================================

  /**
   * @brief Rank and deduplicate suggestions.
   */
  private rankAndDeduplicate(suggestions: WatchSuggestion[]): WatchSuggestion[] {
    // Group by variable name
    const byVariable = new Map<string, WatchSuggestion[]>();
    
    for (const suggestion of suggestions) {
      const existing = byVariable.get(suggestion.variable) || [];
      existing.push(suggestion);
      byVariable.set(suggestion.variable, existing);
    }

    // Merge suggestions for same variable (keep highest risk)
    const merged: WatchSuggestion[] = [];
    for (const [variable, varSuggestions] of byVariable) {
      const best = varSuggestions.reduce((a, b) => 
        a.riskScore > b.riskScore ? a : b
      );
      
      // Merge reasons if multiple categories
      if (varSuggestions.length > 1) {
        const categories = [...new Set(varSuggestions.map(s => s.category))];
        best.reason = `${best.reason} [${categories.join(', ')}]`;
      }
      
      merged.push(best);
    }

    // Sort by risk score (descending) and limit
    return merged
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, MAX_SUGGESTIONS);
  }

  /**
   * @brief Calculate risk score from change pattern.
   */
  private calculateChangeRiskScore(change: VariableChange): number {
    let score = 0;

    // More changes = higher risk
    if (change.changeCount >= 3) {
      score = 3;  // High
    } else if (change.changeCount >= 2) {
      score = 2;  // Medium
    } else {
      score = 1;  // Low
    }

    // Recent changes are more important
    if (change.stepsAgo === 0) {
      score += 0.5;
    }

    return Math.min(score, 3);  // Cap at 3
  }

  /**
   * @brief Convert numeric score to risk level.
   */
  private scoreToRiskLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= HIGH_RISK_THRESHOLD) return 'high';
    if (score >= MEDIUM_RISK_THRESHOLD) return 'medium';
    return 'low';
  }

  /**
   * @brief Convert BoundaryRisk to WatchSuggestion.
   */
  private boundaryRiskToSuggestion(risk: BoundaryRisk): WatchSuggestion {
    return {
      variable: risk.variable,
      reason: risk.reason,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskLevel === 'high' ? 3 : risk.riskLevel === 'medium' ? 2 : 1,
      expression: risk.expression,
      category: 'boundary',
      metadata: {
        threshold: risk.threshold,
      },
    };
  }

  // ==========================================================================
  // Private Helpers - Data Gathering
  // ==========================================================================

  /**
   * @brief Gather all variables from current stack frame.
   */
  private async gatherVariables(session: vscode.DebugSession): Promise<VariableInfo[]> {
    const variables: VariableInfo[] = [];

    try {
      const result = await getStackFrameVariables(session, { frameId: 0 });
      
      if (result.success && result.scopes) {
        for (const scope of result.scopes) {
          if (scope.variables) {
            variables.push(...scope.variables);
          }
        }
      }
    } catch (e: any) {
      logger.warn(LOG, `Failed to gather variables: ${e.message}`);
    }

    return variables;
  }

  /**
   * @brief Get current source line for context analysis.
   */
  private async getCurrentSourceLine(
    session: vscode.DebugSession,
    location?: { file: string; line: number }
  ): Promise<string> {
    if (!location || !location.file) {
      return '';
    }

    try {
      const uri = vscode.Uri.file(location.file);
      const document = await vscode.workspace.openTextDocument(uri);
      const line = document.lineAt(location.line - 1);  // VS Code uses 0-based indexing
      return line.text;
    } catch (e: any) {
      logger.warn(LOG, `Failed to get source line: ${e.message}`);
      return '';
    }
  }
}

/******************************************************************************
 * Singleton Instance
 ******************************************************************************/

/**
 * @brief Global watch suggest service instance.
 */
export const watchSuggestService = new WatchSuggestService();

/******************************************************************************
 * End of File
 ******************************************************************************/
