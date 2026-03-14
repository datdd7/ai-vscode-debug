import type { ProviderStateInput } from './consumer-helpers';

export const debugSessionActive = (sessionId: string): ProviderStateInput => ({
    name: 'An active debug session exists',
    params: { sessionId },
});

export const noActiveSession = (): ProviderStateInput => ({
    name: 'No active debug session',
    params: {},
});

export const breakpointSet = (filePath: string, line: number): ProviderStateInput => ({
    name: 'A breakpoint is set at the given location',
    params: { filePath, line },
});
