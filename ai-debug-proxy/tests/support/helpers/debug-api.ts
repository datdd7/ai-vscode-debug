/**
 * Typed API helper for the AI Debug Proxy HTTP server.
 * Wraps the REST API endpoints with TypeScript types.
 */

export const PROXY_BASE = process.env.BASE_URL ?? 'http://localhost:9999';

export interface DebugOperationRequest {
    operation: string;
    params?: Record<string, unknown>;
}

export interface DebugOperationResponse {
    success: boolean;
    operation?: string;
    data?: unknown;
    error?: string;
    timestamp?: string;
}

export interface PingResponse {
    success: boolean;
    data: {
        message: string;
        version: string;
        operations: string[];
    };
    timestamp: string;
}

export interface StatusResponse {
    success: boolean;
    data: {
        hasActiveSession: boolean;
        sessionId: string | null;
        sessionName: string | null;
    };
    timestamp: string;
}

/**
 * Build a debug operation request body.
 */
export function debugOp(operation: string, params?: Record<string, unknown>): DebugOperationRequest {
    return params ? { operation, params } : { operation };
}
