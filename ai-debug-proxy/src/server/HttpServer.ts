/******************************************************************************
 * @file        HttpServer.ts
 *
 * @brief       HTTP server for the AI Debug Proxy.
 *
 * @details
 * This module implements a lightweight HTTP server using the native Node.js
 * http module. It provides lifecycle management for the server and handles
 * request routing, body parsing, and CORS configuration.
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
 * 1.1        2026-03-11  Antigravity Added lifecycle management
 * 1.2        2026-03-12  Antigravity Applied structured logging
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-SW-1      Core Proxy & Session Management
 *
 * Architecture Requirements:
 * ARCH-1       Embedded Server [Satisfies $SW SW-1]
 * ARCH-3       RESTful HTTP API [Satisfies $SW SW-3]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as http from "http";
import { logger } from "../utils/logging";
import { handleRequest } from "./router";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "HttpServer";
const MAX_BODY_SIZE = 1024 * 1024; // 1MB

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-SW-1
 *
 * @brief HTTP server implementation.
 *
 * Manages the lifecycle and request handling for the AI Debug Proxy's
 * HTTP interface.
 *
 * Responsibilities:
 * * Server startup and shutdown
 * * Request-to-route dispatching
 * * Error trapping and reporting
 * * CORS management
 *
 * $ARCH ARCH-1, ARCH-3
 */
export class HttpServer {
    private server: http.Server | null = null;
    private port: number;

    /**
     * @brief Initialize the HTTP server.
     *
     * @param [in]  port    The TCP port to bind to (default: 9999).
     */
    constructor(port: number = 9999) {
        this.port = port;
    }

    /**
     * $DD DD-SW-1.1
     *
     * @brief Start the HTTP server.
     *
     * Binds the server to 127.0.0.1 on the configured port.
     *
     * @return Promise resolving when the server is listening.
     *
     * @throws Error if the port is in use or binding fails.
     *
     * [Satisfies $ARCH-1]
     */
    async start(): Promise<void> {
        if (this.server) {
            logger.warn(LOG, "server.already_running");
            return;
        }

        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.onRequest(req, res);
            });

            this.server.on("error", (err: any) => {
                if (err.code === "EADDRINUSE") {
                    logger.error(LOG, "port.in_use", { port: this.port });
                    reject(new Error(`Port ${this.port} in use`));
                } else {
                    logger.error(LOG, "server.error", { error: err.message });
                    reject(err);
                }
            });

            this.server.listen(this.port, "127.0.0.1", () => {
                logger.info(LOG, "server.listening", { url: `http://127.0.0.1:${this.port}` });
                resolve();
            });
        });
    }

    /**
     * $DD DD-SW-1.2
     *
     * @brief Stop the HTTP server.
     *
     * Gracefully shuts down the server, closing all active connections.
     *
     * @return Promise resolving when the server has stopped.
     */
    async stop(): Promise<void> {
        if (!this.server) return;

        return new Promise((resolve) => {
            this.server!.close(() => {
                this.server = null;
                logger.info(LOG, "server.stopped");
                resolve();
            });
        });
    }

    /**
     * $DD DD-SW-1.3
     *
     * @brief Check if the server is currently running.
     *
     * @return True if responding to requests.
     */
    isRunning(): boolean {
        return this.server !== null;
    }

    /**
     * $DD DD-SW-1.4
     *
     * @brief Get the configured server port.
     *
     * @return Port number.
     */
    getPort(): number {
        return this.port;
    }

    /**
     * $DD DD-SW-1.5
     *
     * @brief Update the server port.
     *
     * @param [in]  port    New port number.
     *
     * @note Requires restart if server is running.
     */
    setPort(port: number): void {
        this.port = port;
    }

    /**************************************************************************
     * Internal Helpers
     **************************************************************************/

    /**
     * @brief Handle incoming HTTP request.
     *
     * Manages request parsing, routing, and response generation.
     *
     * @param [in]  req     Node.js request object.
     * @param [in]  res     Node.js response object.
     */
    private async onRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse,
    ): Promise<void> {
        const startTime = Date.now();
        const method = req.method || "GET";
        const url = req.url || "/";

        console.log(`[${LOG}] Incoming request: ${method} ${url}`);

        // ADP-023: restrict CORS — allow only localhost/127.0.0.1 origins.
        // Non-matching origins get no CORS header, so browsers block the request.
        const origin = req.headers['origin'] || '';
        const isLocalOrigin = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        if (isLocalOrigin) {
            res.setHeader("Access-Control-Allow-Origin", origin || "http://localhost");
        }
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Content-Type", "application/json");

        // Handle CORS preflight
        if (method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        try {
            // Parse body for POST/PUT
            let body: any = undefined;
            if (method === "POST" || method === "PUT") {
                body = await this.readBody(req);
            }

            // Route the request
            const result = await handleRequest(method, url, body, req);

            const status = result.statusCode || 200;
            const responseBody = JSON.stringify(result.body);

            res.writeHead(status);
            res.end(responseBody);

            const elapsed = Date.now() - startTime;
            logger.info(LOG, "request.handled", { method, url, status, elapsed });
        } catch (error: any) {
            const elapsed = Date.now() - startTime;
            logger.error(LOG, "request.failed", { method, url, elapsed, error: error.message });

            if (!res.headersSent && !res.destroyed) {
                try {
                    res.writeHead(500);
                    res.end(
                        JSON.stringify({
                            success: false,
                            error: error.message,
                            timestamp: new Date().toISOString(),
                        }),
                    );
                } catch (writeErr: any) {
                    logger.warn(LOG, "error_response.failed", { error: writeErr.message });
                }
            }
        }
    }

    /**
     * @brief Parse JSON request body.
     *
     * @param [in]  req     Node.js request object.
     *
     * @return Promise resolving to parsed body object.
     */
    private readBody(req: http.IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            let size = 0;

            req.on("data", (chunk: Buffer) => {
                size += chunk.length;
                if (size > MAX_BODY_SIZE) {
                    reject(new Error("Request body too large"));
                    req.destroy();
                    return;
                }
                chunks.push(chunk);
            });

            req.on("end", () => {
                if (chunks.length === 0) {
                    resolve(undefined);
                    return;
                }
                try {
                    const raw = Buffer.concat(chunks).toString("utf-8");
                    resolve(JSON.parse(raw));
                } catch (e) {
                    reject(new Error("Invalid JSON body"));
                }
            });

            req.on("error", reject);
        });
    }
}


/******************************************************************************
 * End of File
 ******************************************************************************/
