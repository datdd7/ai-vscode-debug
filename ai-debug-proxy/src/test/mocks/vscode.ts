/**
 * Mock for the 'vscode' module used in unit tests.
 * Replaces the real VS Code API with no-op stubs so tests can
 * import production code that imports 'vscode' without a VS Code runtime.
 */
import { vi } from 'vitest';

const outputChannelMock = {
    appendLine: vi.fn(),
    append: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    hide: vi.fn(),
    name: 'AI Debug Proxy',
    replace: vi.fn(),
    show: vi.fn(),
};

export const window = {
    createOutputChannel: vi.fn(() => outputChannelMock),
};

export const workspace = {
    getConfiguration: vi.fn(() => ({
        get: vi.fn(),
    })),
};

export const commands = {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
};

export const debug = {
    startDebugging: vi.fn(),
    onDidTerminateDebugSession: vi.fn(() => ({ dispose: vi.fn() })),
};

export default {
    window,
    workspace,
    commands,
    debug,
};
