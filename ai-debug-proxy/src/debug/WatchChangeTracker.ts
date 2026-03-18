/******************************************************************************
 * @file        WatchChangeTracker.ts
 *
 * @brief       Track variable value changes across debug steps.
 *
 * @details
 * This module tracks watched variable values and detects changes between
 * debug steps. It provides change history and alerts for AI agents.
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
 * DD-WATCH-9   Change Tracking
 * DD-WATCH-10  Change History
 *
 * Architecture Requirements:
 * ARCH-WATCH-002  Change Detection [Satisfies $AI AI-13]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from 'vscode';
import { logger } from '../utils/logging';
import { evaluate } from './inspection';
import { getCurrentFrameId, getCurrentThreadId } from './events';

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "WatchChangeTracker";
const MAX_HISTORY_SIZE = 100;

/******************************************************************************
 * Type Definitions
 ******************************************************************************/

/**
 * @brief Variable change information.
 */
export interface VariableChange {
    variable: string;
    oldValue: string;
    newValue: string;
    detectedAt: string;
    location?: {
        file: string;
        line: number;
        function?: string;
    };
}

/**
 * @brief Watched variable state.
 */
export interface WatchedVariable {
    name: string;
    value: string | null;
    lastUpdated: string;
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-WATCH-9.1
 *
 * @brief Track variable changes across debug steps.
 *
 * Monitors watched variables and detects value changes.
 *
 * [Satisfies $ARCH ARCH-WATCH-002]
 */
export class WatchChangeTracker {
    private watchedVariables: Map<string, WatchedVariable> = new Map();
    private changes: VariableChange[] = [];
    private enabled: boolean = false;

    /**
     * @brief Enable change tracking.
     */
    enable(): void {
        this.enabled = true;
        logger.info(LOG, 'Change tracking enabled');
    }

    /**
     * @brief Disable change tracking.
     */
    disable(): void {
        this.enabled = false;
        logger.info(LOG, 'Change tracking disabled');
    }

    /**
     * @brief Add variable to watch list.
     *
     * @param [in]  name  Variable name.
     */
    async watchVariable(session: vscode.DebugSession, name: string): Promise<void> {
        const value = await this.evaluateVariable(session, name);
        
        this.watchedVariables.set(name, {
            name,
            value,
            lastUpdated: new Date().toISOString()
        });

        logger.debug(LOG, `Added to watch: ${name} = ${value}`);
    }

    /**
     * @brief Remove variable from watch list.
     *
     * @param [in]  name  Variable name.
     */
    unwatchVariable(name: string): void {
        this.watchedVariables.delete(name);
        logger.debug(LOG, `Removed from watch: ${name}`);
    }

    /**
     * @brief Track and detect changes for all watched variables.
     *
     * @param [in]  session  VS Code debug session.
     *
     * @return Array of detected changes.
     */
    async trackAndDetect(session: vscode.DebugSession): Promise<VariableChange[]> {
        if (!this.enabled) {
            return [];
        }

        const newChanges: VariableChange[] = [];

        for (const [name, watched] of this.watchedVariables) {
            const newValue = await this.evaluateVariable(session, name);
            const oldValue = watched.value;

            // Detect change
            if (oldValue !== null && oldValue !== newValue) {
                const change: VariableChange = {
                    variable: name,
                    oldValue: oldValue || 'null',
                    newValue: newValue || 'null',
                    detectedAt: new Date().toISOString(),
                    location: await this.getCurrentLocation(session)
                };

                newChanges.push(change);
                logger.info(LOG, `Change detected: ${name} = ${oldValue} → ${newValue}`);
            }

            // Update watched value
            this.watchedVariables.set(name, {
                name,
                value: newValue,
                lastUpdated: new Date().toISOString()
            });
        }

        // Store changes
        this.changes.push(...newChanges);

        // Limit history size
        if (this.changes.length > MAX_HISTORY_SIZE) {
            this.changes = this.changes.slice(-MAX_HISTORY_SIZE);
        }

        return newChanges;
    }

    /**
     * @brief Get all detected changes.
     *
     * @return Array of changes.
     */
    getChanges(): VariableChange[] {
        return [...this.changes];
    }

    /**
     * @brief Get recent changes (last N).
     *
     * @param [in]  limit  Maximum number of changes to return.
     *
     * @return Array of recent changes.
     */
    getRecentChanges(limit: number = 10): VariableChange[] {
        return this.changes.slice(-limit);
    }

    /**
     * @brief Clear change history.
     */
    clearChanges(): void {
        this.changes = [];
        logger.debug(LOG, 'Change history cleared');
    }

    /**
     * @brief Get list of watched variables.
     *
     * @return Array of watched variable names.
     */
    getWatchedVariables(): string[] {
        return Array.from(this.watchedVariables.keys());
    }

    /**
     * @brief Get current value of watched variable.
     *
     * @param [in]  name  Variable name.
     *
     * @return Current value or null.
     */
    getVariableValue(name: string): string | null {
        return this.watchedVariables.get(name)?.value || null;
    }

    // ==========================================================================
    // Private Helpers
    // ==========================================================================

    /**
     * @brief Evaluate variable value.
     *
     * @param [in]  session  VS Code debug session.
     * @param [in]  name     Variable name.
     *
     * @return Variable value or null.
     */
    private async evaluateVariable(session: vscode.DebugSession, name: string): Promise<string | null> {
        try {
            const frameId = getCurrentFrameId(session.id) ?? 0;
            const result = await evaluate(session, {
                expression: name,
                frameId
            });

            if (result.success && result.result) {
                return result.result;
            }

            return null;

        } catch (e: any) {
            logger.debug(LOG, `Failed to evaluate ${name}: ${e.message}`);
            return null;
        }
    }

    /**
     * @brief Get current debug location.
     *
     * @param [in]  session  VS Code debug session.
     *
     * @return Location info or undefined.
     */
    private async getCurrentLocation(session: vscode.DebugSession): Promise<VariableChange['location']> {
        try {
            const frameId = getCurrentFrameId(session.id) ?? 0;
            const stackResponse = await session.customRequest('stackTrace', {
                threadId: getCurrentThreadId(session.id) ?? 1,
                startFrame: frameId,
                levels: 1
            });

            if (stackResponse.stackFrames && stackResponse.stackFrames.length > 0) {
                const frame = stackResponse.stackFrames[0];
                return {
                    file: frame.source?.path || 'unknown',
                    line: frame.line || 0,
                    function: frame.name
                };
            }

            return undefined;

        } catch (e: any) {
            logger.debug(LOG, `Failed to get location: ${e.message}`);
            return undefined;
        }
    }
}

/******************************************************************************
 * Singleton Instance
 ******************************************************************************/

/**
 * @brief Global watch change tracker instance.
 */
export const watchChangeTracker = new WatchChangeTracker();

/******************************************************************************
 * End of File
 ******************************************************************************/
