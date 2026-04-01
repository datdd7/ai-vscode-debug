/**
 * Logging Utility Unit Tests
 * REQ-LOG-001..REQ-LOG-005
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('fs', () => ({ appendFileSync: vi.fn() }));
vi.mock('vscode', () => ({
    window: {
        createOutputChannel: vi.fn(() => ({
            appendLine: vi.fn(),
            append: vi.fn(),
            clear: vi.fn(),
            dispose: vi.fn(),
            hide: vi.fn(),
            name: 'AI Debug Proxy',
            replace: vi.fn(),
            show: vi.fn(),
        })),
    },
}));

import * as fs from 'fs';
import { setLogLevel, logger, stringifySafe, outputChannel } from '../../utils/logging';

describe('logging — setLogLevel + logger', () => {
    beforeEach(() => {
        vi.mocked(fs.appendFileSync).mockClear();
        (outputChannel.appendLine as ReturnType<typeof vi.fn>).mockClear();
        setLogLevel('info'); // reset to default
    });

    it('REQ-LOG-001: outputChannel is initialized on module load', () => {
        expect(outputChannel).toBeDefined();
        expect(typeof outputChannel.appendLine).toBe('function');
    });

    it('REQ-LOG-002: logger.info writes to outputChannel and file', () => {
        logger.info('TEST', 'hello world');
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('hello world')
        );
        expect(fs.appendFileSync).toHaveBeenCalled();
    });

    it('REQ-LOG-003: logger.debug is suppressed at info level', () => {
        setLogLevel('info');
        logger.debug('TEST', 'debug message');
        expect(outputChannel.appendLine).not.toHaveBeenCalled();
    });

    it('REQ-LOG-003: logger.debug appears at debug level', () => {
        setLogLevel('debug');
        logger.debug('TEST', 'debug message');
        expect(outputChannel.appendLine).toHaveBeenCalled();
    });

    it('REQ-LOG-004: logger.warn is logged at warn level', () => {
        setLogLevel('warn');
        logger.warn('TEST', 'warn msg');
        expect(outputChannel.appendLine).toHaveBeenCalled();
    });

    it('REQ-LOG-004: logger.info is suppressed at warn level', () => {
        setLogLevel('warn');
        logger.info('TEST', 'should not appear');
        expect(outputChannel.appendLine).not.toHaveBeenCalled();
    });

    it('REQ-LOG-004: logger.error always appears', () => {
        setLogLevel('error');
        logger.error('TEST', 'error msg');
        expect(outputChannel.appendLine).toHaveBeenCalled();
    });

    it('REQ-LOG-005: logger with data logs extra context line', () => {
        logger.info('TEST', 'msg with data', { key: 'value' });
        const calls = (outputChannel.appendLine as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls.length).toBeGreaterThanOrEqual(2);
        expect(calls[1][0]).toContain('key');
    });

    it('REQ-LOG-005: fs.appendFileSync error is silently swallowed', () => {
        vi.mocked(fs.appendFileSync).mockImplementationOnce(() => {
            throw new Error('disk full');
        });
        expect(() => logger.info('TEST', 'will not throw')).not.toThrow();
    });
});

describe('stringifySafe', () => {
    it('serializes plain object to JSON', () => {
        expect(stringifySafe({ a: 1 })).toBe('{\n  "a": 1\n}');
    });

    it('replaces circular reference with "[Circular]"', () => {
        const obj: any = { name: 'root' };
        obj.self = obj;
        const result = stringifySafe(obj);
        expect(result).toContain('[Circular]');
    });

    it('returns serialization error message when Error is thrown (branch line 198)', () => {
        const badObj = Object.create(null);
        Object.defineProperty(badObj, 'prop', {
            get() { throw new Error('cannot stringify'); },
            enumerable: true,
        });
        const result = stringifySafe(badObj);
        expect(result).toContain('[Serialization Error: cannot stringify]');
    });

    it('returns serialization error message when non-Error is thrown (branch line 198)', () => {
        const badObj = Object.create(null);
        Object.defineProperty(badObj, 'prop', {
            // Throw a non-Error value (string)
            get() { throw 'raw string error'; },
            enumerable: true,
        });
        const result = stringifySafe(badObj);
        expect(result).toContain('[Serialization Error: raw string error]');
    });

    it('respects custom indent parameter', () => {
        const result = stringifySafe({ x: 1 }, 4);
        expect(result).toContain('    "x"');
    });
});
