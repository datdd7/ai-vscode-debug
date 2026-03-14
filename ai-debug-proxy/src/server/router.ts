/******************************************************************************
 * @file        router.ts
 *
 * @brief       HTTP request router for the AI Debug Proxy.
 *
 * @details
 * This module provides the central routing logic for the HTTP API. It
 * dispatches incoming requests to the appropriate handlers based on the
 * method and URL path.
 *
 * @project     AI Debug Proxy
 * @component   HTTP Server Module
 *
 * @author      Antigravity
 * @date        2026-03-12
 *
 ******************************************************************************/

/******************************************************************************
 * Revision History
 *
 * Version    Date        Author      Description
 * ---------------------------------------------------------------------------
 * 1.0        2026-03-11  Antigravity Initial implementation
 * 1.1        2026-03-11  Antigravity Added LSP and subagent routes
 * 1.2        2026-03-12  Antigravity Refactored for guidelines compliance
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-SW-1      Core Proxy & Session Management
 * DD-SW-5      Subagent Orchestrator
 * DD-SW-7      LSP Code Intelligence
 *
 * Architecture Requirements:
 * ARCH-1       Embedded Node.js Server [Satisfies $SW SW-1]
 * ARCH-3       RESTful HTTP API [Satisfies $SW SW-3]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as http from "http";
import * as path from "path";
import * as fs from "fs";

const PKG_VERSION: string = (() => {
    try {
        const pkgPath = path.join(__dirname, "..", "package.json");
        return JSON.parse(fs.readFileSync(pkgPath, "utf8")).version as string;
    } catch {
        return "unknown";
    }
})();
import { debugController } from "../debug/DebugController";
import { getActiveSession } from "../debug/session";
import { handleSubagentsRequest } from "./routes/subagents.routes";
import { commandHandler } from "../commands/CommandHandler";
import { lspService } from "../lsp/LspService";
import { validateOperationArgs } from "../utils/validation";
import { logger } from "../utils/logging";
import { DebugError } from "../utils/errors";
import { ApiResponse, ErrorInfo } from "../types";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "Router";

interface RouteResult {
    statusCode: number;
    body: ApiResponse;
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-SW-3.1
 *
 * @brief Handle an incoming HTTP request and route to the appropriate handler.
 *
 * Parses the request URL and method to determine the correct sub-handler
 * for the request. Decomposed into sub-handlers to meet complexity rules.
 *
 * @param [in]  method      HTTP method (GET, POST, etc.)
 * @param [in]  url         Request URL path and query.
 * @param [in]  body        Request body object (if applicable).
 * @param [in]  _req        Original Node.js request object.
 *
 * @return Promise resolving to the route result (status and body).
 *
 * [Satisfies $ARCH ARCH-3]
 */
export async function handleRequest(
    method: string,
    url: string,
    body: any,
    _req: http.IncomingMessage,
): Promise<RouteResult> {
    const parsedUrl = new URL(url, "http://localhost");
    const pathname = parsedUrl.pathname;

    logger.debug(LOG, "Routing request", { method, pathname });

    // Routing table logic decomposed to maintain low cyclomatic complexity.
    const result =
        (await handleSystemRouting(method, pathname)) ??
        (await handleSubagentRouting(method, pathname, body)) ??
        (await handleCommandRouting(method, pathname, body)) ??
        (await handleLspRouting(method, pathname, parsedUrl)) ??
        (await handleDebugRouting(method, pathname, body));

    if (result) return result;

    return {
        statusCode: 404,
        body: {
            success: false,
            error: `Not found: ${method} ${pathname}`,
            timestamp: new Date().toISOString(),
        },
    };
}

/**************************************************************************
 * Route Handlers
 **************************************************************************/

/** @brief Handle core system routes (ping, status). */
async function handleSystemRouting(method: string, pathname: string): Promise<RouteResult | null> {
    if (method !== "GET") return null;

    if (pathname === "/api/ping") {
        return {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    message: "pong",
                    version: PKG_VERSION,
                    operations: debugController.getOperations(),
                },
                timestamp: new Date().toISOString(),
            },
        };
    }

    if (pathname === "/api/status") {
        const activeSession = getActiveSession();
        return {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    version: PKG_VERSION,
                    hasActiveSession: !!activeSession,
                    sessionId: activeSession?.id || null,
                    sessionName: activeSession?.name || null,
                },
                timestamp: new Date().toISOString(),
            },
        };
    }

    return null;
}

/** @brief Handle subagent orchestration routes. */
async function handleSubagentRouting(method: string, pathname: string, body: any): Promise<RouteResult | null> {
    if (pathname === "/api/subagents" && method === "POST") {
        return await handleSubagentsRequest(body);
    }
    return null;
}

/** @brief Handle macro command routes. */
async function handleCommandRouting(method: string, pathname: string, body: any): Promise<RouteResult | null> {
    if (pathname === "/api/commands" && method === "POST") {
        if (!body?.command) {
            return {
                statusCode: 400,
                body: { success: false, error: "Missing 'command' field" },
            };
        }
        try {
            const result = await commandHandler.handleCommand(body.command, body.args);
            return { statusCode: 200, body: { success: true, data: result } };
        } catch (e: any) {
            return { statusCode: 500, body: { success: false, error: e.message } };
        }
    }
    return null;
}

/** @brief Handle LSP code intelligence routes. */
async function handleLspRouting(method: string, pathname: string, parsedUrl: URL): Promise<RouteResult | null> {
    if (method !== "GET") return null;

    if (pathname === "/api/symbols") {
        const fsPath = parsedUrl.searchParams.get("fsPath");
        if (!fsPath) return { statusCode: 400, body: { success: false, error: "Missing fsPath" } };
        try {
            const symbols = await lspService.getDocumentSymbols(fsPath);
            return { statusCode: 200, body: { success: true, data: symbols } };
        } catch (e: any) {
            return { statusCode: 500, body: { success: false, error: e.message } };
        }
    }

    if (pathname === "/api/references") {
        const fsPath = parsedUrl.searchParams.get("fsPath");
        const line = parseInt(parsedUrl.searchParams.get("line") || "-1");
        const char = parseInt(parsedUrl.searchParams.get("character") || "-1");
        if (!fsPath || line < 0 || char < 0) return { statusCode: 400, body: { success: false, error: "Missing params" } };
        try {
            const refs = await lspService.getReferences(fsPath, line, char);
            return { statusCode: 200, body: { success: true, data: refs } };
        } catch (e: any) {
            return { statusCode: 500, body: { success: false, error: e.message } };
        }
    }

    if (pathname === "/api/call-hierarchy") {
        const fsPath = parsedUrl.searchParams.get("fsPath");
        const line = parseInt(parsedUrl.searchParams.get("line") || "-1");
        const char = parseInt(parsedUrl.searchParams.get("character") || "-1");
        const dir = parsedUrl.searchParams.get("direction") || "incoming";
        if (!fsPath || line < 0 || char < 0) return { statusCode: 400, body: { success: false, error: "Missing params" } };
        try {
            const calls = dir === "outgoing"
                ? await lspService.getCallHierarchyOutgoing(fsPath, line, char)
                : await lspService.getCallHierarchyIncoming(fsPath, line, char);
            return { statusCode: 200, body: { success: true, data: calls } };
        } catch (e: any) {
            return { statusCode: 500, body: { success: false, error: e.message } };
        }
    }

    return null;
}

/** @brief Handle unified debug operation routes. */
async function handleDebugRouting(method: string, pathname: string, body: any): Promise<RouteResult | null> {
    if (method !== "POST") return null;

    if (pathname === "/api/debug") {
        return handleDebugOperation(body);
    }

    if (pathname === "/api/debug/batch") {
        return handleBatchOperations(body);
    }

    return null;
}

/**************************************************************************
 * Internal Helpers
 **************************************************************************/

/**
 * @brief Handle a debug operation request.
 *
 * @param [in]  body    Request body: { operation: string, params?: object }
 *
 * @return Promise resolving to route result.
 */
async function handleDebugOperation(body: any): Promise<RouteResult> {
    if (!body || typeof body !== "object") {
        return {
            statusCode: 400,
            body: {
                success: false,
                error: "Request body must be a JSON object with 'operation' field",
                timestamp: new Date().toISOString(),
            },
        };
    }

    const { operation, params } = body;

    if (!operation || typeof operation !== "string") {
        return {
            statusCode: 400,
            body: {
                success: false,
                error: "Missing or invalid 'operation' field",
                timestamp: new Date().toISOString(),
            },
        };
    }

    // Validate params
    const validation = validateOperationArgs(operation, params);
    if (!validation.isValid) {
        logger.warn(LOG, "validation.failed", { operation, message: validation.message });
        return {
            statusCode: 400,
            body: {
                success: false,
                operation,
                error: validation.message,
                timestamp: new Date().toISOString(),
            },
        };
    }

    // Execute the operation
    try {
        const result = await debugController.executeOperation(
            operation,
            validation.params,
        );

        return {
            statusCode: 200,
            body: {
                success: true,
                operation,
                data: result,
                timestamp: new Date().toISOString(),
            },
        };
    } catch (error: any) {
        logger.error(LOG, "operation.failed", { operation, error: error.message });

        // AIVS-002: Return structured error response
        if (error instanceof DebugError) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    operation,
                    error: error.toJSON() as ErrorInfo,
                    timestamp: new Date().toISOString(),
                },
            };
        }

        return {
            statusCode: 500,
            body: {
                success: false,
                operation,
                error: error.message,
                timestamp: new Date().toISOString(),
            },
        };
    }
}

/**
 * @brief Handle a batch of debug operations.
 *
 * @param [in]  body    Request body: { operations: { ... }[], parallel?: boolean }
 *
 * @return Promise resolving to route result.
 */
async function handleBatchOperations(body: any): Promise<RouteResult> {
    if (!body || !Array.isArray(body.operations)) {
        return {
            statusCode: 400,
            body: {
                success: false,
                error: "Request body must contain an 'operations' array",
                timestamp: new Date().toISOString(),
            },
        };
    }

    try {
        const result = await debugController.executeBatchOperations(
            body.operations,
            body.parallel,
        );

        return {
            statusCode: 200,
            body: {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            },
        };
    } catch (error: any) {
        logger.error(LOG, "batch.failed", { error: error.message });
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

