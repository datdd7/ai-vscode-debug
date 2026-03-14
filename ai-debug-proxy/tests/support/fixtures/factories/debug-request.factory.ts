/**
 * Factory for building debug operation request bodies.
 * Provides type-safe builders with sensible defaults.
 */
import type { DebugOperationRequest } from '../helpers/debug-api';

type Override<T> = Partial<T>;

export function launchRequestFactory(
    overrides: Override<{ program: string; type: string; stopOnEntry: boolean }> = {},
) {
    return {
        operation: 'launch',
        params: {
            program: overrides.program ?? '/path/to/program',
            type: overrides.type ?? 'cppdbg',
            stopOnEntry: overrides.stopOnEntry ?? true,
        },
    } satisfies DebugOperationRequest;
}

export function setBreakpointFactory(
    overrides: Override<{ path: string; line: number; condition?: string }> = {},
) {
    return {
        operation: 'set_breakpoint',
        params: {
            location: {
                path: overrides.path ?? '/path/to/file.c',
                line: overrides.line ?? 1,
            },
            ...(overrides.condition ? { condition: overrides.condition } : {}),
        },
    } satisfies DebugOperationRequest;
}

export function evaluateFactory(
    overrides: Override<{ expression: string; context?: string }> = {},
) {
    return {
        operation: 'evaluate',
        params: {
            expression: overrides.expression ?? 'variable_name',
            context: overrides.context ?? 'watch',
        },
    } satisfies DebugOperationRequest;
}
