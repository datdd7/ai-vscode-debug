/**
 * @file helpers.ts
 * @brief Shared utilities for E2E test suites.
 *
 * All tests import from this module instead of duplicating boilerplate.
 * Pattern: launch via vscode.debug.startDebugging(), interact via HTTP API.
 */

import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import axios from 'axios';
import { TIMEOUTS } from './constants';
export { TIMEOUTS } from './constants';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const PORT = process.env.AI_DEBUG_PROXY_PORT || '9997';
export const PROXY_URL = `http://localhost:${PORT}/api/debug`;

// ---------------------------------------------------------------------------
// Delay
// ---------------------------------------------------------------------------

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// HTTP API wrappers
// ---------------------------------------------------------------------------

export async function proxyGet(endpoint: string): Promise<any> {
    const res = await axios.get(`${PROXY_URL}${endpoint}`, { timeout: 10000 });
    return res.data;
}

/**
 * POST to /api/debug/execute_operation.
 * Returns the parsed response body (success or error).
 * Throws on network errors; does NOT throw on API-level errors (success=false).
 */
export async function proxyPost(operation: string, params?: any): Promise<any> {
    const body: any = { operation };
    if (params !== undefined) {
        body.params = params;
    }
    try {
        const res = await axios.post(`${PROXY_URL}/execute_operation`, body, { timeout: 10000 });
        return res.data;
    } catch (err: any) {
        if (err.response) {
            // HTTP error (4xx/5xx) — return the response data so tests can inspect it
            return err.response.data;
        }
        throw err;
    }
}

/**
 * POST that is expected to fail with HTTP 4xx/5xx.
 * Returns { status, data } so tests can assert on both.
 */
export async function proxyPostExpectError(operation: string, params?: any): Promise<{ status: number; data: any }> {
    const body: any = { operation };
    if (params !== undefined) {
        body.params = params;
    }
    try {
        const res = await axios.post(`${PROXY_URL}/execute_operation`, body, { timeout: 10000 });
        return { status: res.status, data: res.data };
    } catch (err: any) {
        if (err.response) {
            return { status: err.response.status, data: err.response.data };
        }
        throw err;
    }
}

/**
 * Raw POST to execute_operation with arbitrary body (for missing-field tests).
 */
export async function proxyPostRaw(body: any): Promise<{ status: number; data: any }> {
    try {
        const res = await axios.post(`${PROXY_URL}/execute_operation`, body, { timeout: 10000 });
        return { status: res.status, data: res.data };
    } catch (err: any) {
        if (err.response) {
            return { status: err.response.status, data: err.response.data };
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

export async function getStatus(): Promise<any> {
    const body = await proxyGet('/status');
    return body.data || body;
}

export async function assertStopped(msg?: string): Promise<any> {
    const status = await getStatus();
    assert.strictEqual(status.isRunning, false, msg || 'Expected debugger to be STOPPED');
    return status;
}

export async function assertRunning(msg?: string): Promise<any> {
    const status = await getStatus();
    assert.strictEqual(status.isRunning, true, msg || 'Expected debugger to be RUNNING');
    return status;
}

/**
 * Wait for a step/continue command to complete (stops at next line).
 * Adds an initial delay to let GDB process the command and start running,
 * preventing the race condition where the pre-step stopped state is seen first.
 */
export async function waitForStepComplete(timeoutMs = TIMEOUTS.STOP_POLL_TIMEOUT): Promise<void> {
    await delay(400); // TODO: replace with event-driven *running detection once MI2 exposes it
    return waitForStop(timeoutMs);
}

/**
 * Poll /status until isRunning===false or timeout.
 * Ignores transient HTTP errors (e.g. 500 during GDB startup).
 */
export async function waitForStop(timeoutMs = TIMEOUTS.STOP_POLL_TIMEOUT): Promise<void> {
    const start = Date.now();
    let lastStatus: any = null;
    while (Date.now() - start < timeoutMs) {
        try {
            const status = await getStatus();
            lastStatus = status;
            if (status.hasActiveSession && !status.isRunning) {
                return;
            }
        } catch {
            // Transient error (e.g. 500 while backend initializing) — keep polling
        }
        await delay(TIMEOUTS.STOP_POLL_INTERVAL);
    }
    throw new Error(`waitForStop timed out after ${timeoutMs}ms. Last status: ${JSON.stringify(lastStatus)}`);
}

/**
 * Poll /status until hasActiveSession===false or timeout.
 * Use after stopDebugging() to confirm full backend cleanup.
 */
export async function waitForSessionEnd(timeoutMs = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const status = await getStatus();
            if (!status.hasActiveSession) {
                return;
            }
        } catch {
            // Transient error — keep polling
        }
        await delay(TIMEOUTS.STOP_POLL_INTERVAL);
    }
    throw new Error(`waitForSessionEnd timed out after ${timeoutMs}ms — session not released`);
}

/**
 * Poll /status until isRunning===true or timeout.
 * Ignores transient HTTP errors.
 */
export async function waitForRunning(timeoutMs = 5000): Promise<void> {
    await delay(300); // Let GDB process the continue command
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const status = await getStatus();
            if (status.isRunning) {
                return;
            }
        } catch {
            // Transient error — keep polling
        }
        await delay(TIMEOUTS.STOP_POLL_INTERVAL);
    }
    throw new Error(`waitForRunning timed out after ${timeoutMs}ms`);
}

// ---------------------------------------------------------------------------
// Stack helpers
// ---------------------------------------------------------------------------

export async function getTopFrame(): Promise<any> {
    const res = await proxyPost('stack_trace');
    const frames = res.data;
    assert.ok(Array.isArray(frames) && frames.length > 0, 'stack_trace returned no frames');
    return frames[0];
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

let _workspaceFolder: vscode.WorkspaceFolder | undefined;

export async function getWorkspaceFolder(): Promise<vscode.WorkspaceFolder> {
    if (_workspaceFolder) {
        return _workspaceFolder;
    }
    _workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(_workspaceFolder, 'No workspace folder open — E2E tests require a workspace');
    return _workspaceFolder;
}

export async function ensureExtensionActivated(): Promise<void> {
    const ext = vscode.extensions.getExtension('datdang.ai-debug-proxy');
    assert.ok(ext, 'Extension datdang.ai-debug-proxy not found');
    if (!ext.isActive) {
        await ext.activate();
    }
}

export function buildDebugConfig(name: string): object {
    // workspaceFolder.uri.fsPath is resolved at call time
    return {
        type: 'ai-debug',
        name,
        request: 'launch',
        // program is set in launchAndWaitForStop using the workspace path
        stopOnEntry: true,
        gdbPath: 'gdb',
        backendType: 'gdb',
    };
}

/**
 * Launch a debug session and wait until the debugger is stopped at entry.
 * Equivalent to the setup pattern in extension.test.ts UC7/UC8/UC9.
 */
export async function launchAndWaitForStop(testName: string, launchTimeoutMs = TIMEOUTS.LAUNCH_SETTLE): Promise<void> {
    await ensureExtensionActivated();
    const folder = await getWorkspaceFolder();

    const config = {
        type: 'ai-debug',
        name: `E2E ${testName}`,
        request: 'launch',
        program: path.join(folder.uri.fsPath, 'build/cooling_ecu'),
        cwd: folder.uri.fsPath,
        stopOnEntry: true,
        gdbPath: 'gdb',
        backendType: 'gdb',
    };

    const started = await vscode.debug.startDebugging(folder, config);
    assert.ok(started, `Failed to start debug session for ${testName}`);

    await waitForStop(launchTimeoutMs + 3000);
}

/**
 * Terminate the active debug session and wait for cleanup.
 * Safe to call even if no session is active.
 */
export async function terminateSession(): Promise<void> {
    try {
        await vscode.debug.stopDebugging();
        await waitForSessionEnd(4000);
    } catch {
        // Ignore — session may have already ended
    }
}
