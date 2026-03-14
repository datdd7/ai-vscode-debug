/******************************************************************************
 * @file        SubagentOrchestrator.ts
 *
 * @brief       Orchestrator for parallel subagent execution.
 *
 * @details
 * This module provides the core logic for managing multiple external agent
 * tasks. It handles process spawning, input/output management, concurrency
 * control, and timeout handling.
 *
 * @project     AI Debug Proxy
 * @component   Subagent Orchestrator Module
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
 * DD-SW-5      Subagent Orchestrator
 * DD-SW-6      Parallel Execution
 *
 * Architecture Requirements:
 * ARCH-5       Parallel Subagent Execution [Satisfies $SW SW-5, SW-6]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import { spawn } from "child_process";
import * as vscode from "vscode";
import { logger } from "../utils/logging";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "SubagentOrchestrator";
const MAX_TASKS = 50;
const MAX_CONCURRENCY = 5;
const MAX_OUTPUT_BYTES = 1024 * 1024; // 1MB per task

/******************************************************************************
 * Public Interface
 ******************************************************************************/

export interface SubagentTask {
    id: string;
    command: string; // e.g., "qwen" or "echo"
    args: string[]; // e.g., ["Please review this file..."]
    input?: string; // Optional input for stdin
}

export interface SubagentResult {
    id: string;
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

/**
 * $DD DD-SW-5
 *
 * @brief Subagent Orchestrator class.
 *
 * Manages the parallel execution of multiple subagent CLI tasks.
 *
 * * Error handling and timeout tracking
 *
 * [Satisfies $ARCH ARCH-5]
 */
export class SubagentOrchestrator {
    /**
     * $DD DD-SW-5.1
     *
     * @brief Executes multiple external agent tasks with a concurrency limit.
     *
     * @param [in]  tasks           The array of subagent CLI tasks to run.
     * @param [in]  timeoutMs       Maximum time to wait before killing a task.
     * @param [in]  maxConcurrency   Maximum number of tasks to run simultaneously.
     *
     * @return Promise resolving to an array of results.
     *
     * @throws Error if the task count exceeds MAX_TASKS.
     *
     * [Satisfies $ARCH ARCH-5]
     */
    public async runParallelSubagents(
        tasks: SubagentTask[],
        timeoutMs: number = 60000,
        maxConcurrency: number = MAX_CONCURRENCY,
    ): Promise<SubagentResult[]> {
        if (tasks.length > MAX_TASKS) {
            throw new Error(`Too many tasks: ${tasks.length} (max ${MAX_TASKS})`);
        }

        logger.info(
            LOG,
            `Starting ${tasks.length} subagent tasks (concurrency=${maxConcurrency})...`,
        );

        const results: SubagentResult[] = new Array(tasks.length);
        let nextIndex = 0;

        const runNext = async (): Promise<void> => {
            while (nextIndex < tasks.length) {
                const index = nextIndex++;
                results[index] = await this.runSingleSubagent(tasks[index], timeoutMs);
            }
        };

        const workers = Array.from(
            { length: Math.min(maxConcurrency, tasks.length) },
            () => runNext(),
        );
        await Promise.all(workers);

        logger.info(LOG, `All ${tasks.length} subagents completed.`);
        return results;
    }

    /**************************************************************************
     * Internal Helpers
     **************************************************************************/

    /**
     * @brief Run a single subagent task.
     *
     * @param [in]  task        Task configuration.
     * @param [in]  timeoutMs   Execution timeout.
     *
     * @return Promise resolving to the individual task result.
     */
    private runSingleSubagent(
        task: SubagentTask,
        timeoutMs: number,
    ): Promise<SubagentResult> {
        return new Promise((resolve) => {
            const config = vscode.workspace.getConfiguration("aiDebugProxy");
            const allowedCommands = config.get<string[]>("subagents.allowedCommands", []);

            if (allowedCommands.length === 0 || !allowedCommands.includes(task.command)) {
                logger.error(LOG, `[Subagent ${task.id}] Blocked by whitelist: ${task.command}`);
                resolve({
                    id: task.id,
                    success: false,
                    stdout: "",
                    stderr: `Command '${task.command}' is not whitelisted in aiDebugProxy.subagents.allowedCommands`,
                    exitCode: -3,
                });
                return;
            }

            logger.debug(
                LOG,
                `[Subagent ${task.id}] Spawning: ${task.command} ${task.args.join(" ")}`,
            );

            const child = spawn(task.command, task.args, {
                shell: false,
            });

            if (task.input) {
                child.stdin.write(task.input);
                child.stdin.end();
            }

            let stdoutStr = "";
            let stderrStr = "";

            child.stdout.on("data", (data) => {
                if (stdoutStr.length < MAX_OUTPUT_BYTES) {
                    stdoutStr += data.toString();
                    if (stdoutStr.length >= MAX_OUTPUT_BYTES) {
                        stdoutStr =
                            stdoutStr.slice(0, MAX_OUTPUT_BYTES) + "\n[Output truncated]";
                    }
                }
            });

            child.stderr.on("data", (data) => {
                if (stderrStr.length < MAX_OUTPUT_BYTES) {
                    stderrStr += data.toString();
                }
            });

            let timeout: NodeJS.Timeout | null = setTimeout(() => {
                logger.warn(
                    LOG,
                    `[Subagent ${task.id}] Timed out after ${timeoutMs}ms. Killing process...`,
                );
                child.kill();
                resolve({
                    id: task.id,
                    success: false,
                    stdout: stdoutStr,
                    stderr: stderrStr + `\n[Timeout after ${timeoutMs}ms]`,
                    exitCode: -1,
                });
                timeout = null;
            }, timeoutMs);

            child.on("close", (code) => {
                if (timeout) {
                    clearTimeout(timeout);
                }
                logger.debug(LOG, `[Subagent ${task.id}] Exited with code ${code}`);
                resolve({
                    id: task.id,
                    success: code === 0,
                    stdout: stdoutStr,
                    stderr: stderrStr,
                    exitCode: code,
                });
            });

            child.on("error", (err) => {
                if (timeout) {
                    clearTimeout(timeout);
                }
                logger.error(
                    LOG,
                    `[Subagent ${task.id}] Failed to spawn: ${err.message}`,
                );
                resolve({
                    id: task.id,
                    success: false,
                    stdout: stdoutStr,
                    stderr: err.message,
                    exitCode: -2,
                });
            });
        });
    }
}

/******************************************************************************
 * Module Exports
 ******************************************************************************/

export const subagentOrchestrator = new SubagentOrchestrator();

/******************************************************************************
 * End of File
 ******************************************************************************/
