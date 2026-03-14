/******************************************************************************
 * @file        subagents.routes.ts
 *
 * @brief       Subagent Orchestrator route handlers.
 *
 * @details
 * This module provides the endpoint handlers for triggering parallel
 * subagent tasks. It interacts with the SubagentOrchestrator to execute
 * complex, multi-step AI debugging workflows.
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
 * ARCH-3       RESTful HTTP API over localhost
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import {
    subagentOrchestrator,
    SubagentTask,
} from "../../agent/SubagentOrchestrator";
import { ApiResponse } from "../../types";

/******************************************************************************
 * Public Interface
 ******************************************************************************/

export interface RouteResult {
    statusCode: number;
    body: ApiResponse;
}

/**
 * $DD DD-SW-5.3
 *
 * @brief Handle subagent parallel execution request.
 *
 * Receives a list of tasks and executes them in parallel using the
 * orchestrator.
 *
 * @param [in]  tasks   Array of SubagentTask objects to execute.
 *
 * @return Promise resolving to route result (status and results).
 *
 * $ARCH ARCH-3, ARCH-5
 */
export async function handleSubagentsRequest(
    tasks: SubagentTask[],
): Promise<RouteResult> {
    if (!Array.isArray(tasks)) {
        return {
            statusCode: 400,
            body: {
                success: false,
                error: "Body must be an array of SubagentTask objects",
                timestamp: new Date().toISOString(),
            },
        };
    }

    try {
        const results = await subagentOrchestrator.runParallelSubagents(tasks);
        return {
            statusCode: 200,
            body: {
                success: true,
                data: results,
                timestamp: new Date().toISOString(),
            },
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
            },
        };
    }
}

/******************************************************************************
 * End of File
 ******************************************************************************/
