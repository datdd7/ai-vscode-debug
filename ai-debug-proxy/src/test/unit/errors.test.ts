/**
 * Unit tests for errors.ts — DebugError and OperationError classes.
 */

import { describe, it, expect } from 'vitest';
import { DebugError, DebugErrorCode, OperationError } from '../../utils/errors';

describe('DebugError', () => {
    it('is instance of Error', () => {
        const e = new DebugError(DebugErrorCode.INTERNAL_ERROR, 'test');
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(DebugError);
    });

    it('sets name to DebugError', () => {
        const e = new DebugError(DebugErrorCode.OPERATION_FAILED, 'msg');
        expect(e.name).toBe('DebugError');
    });

    it('stores code and message', () => {
        const e = new DebugError(DebugErrorCode.SESSION_NOT_FOUND, 'no session');
        expect(e.code).toBe(DebugErrorCode.SESSION_NOT_FOUND);
        expect(e.message).toBe('no session');
    });

    it('stores optional suggestion and details', () => {
        const e = new DebugError(DebugErrorCode.INVALID_CONFIG, 'bad cfg', 'fix it', { key: 'val' });
        expect(e.suggestion).toBe('fix it');
        expect(e.details).toEqual({ key: 'val' });
    });

    it('toJSON returns structured object', () => {
        const e = new DebugError(DebugErrorCode.FILE_NOT_FOUND, 'missing', 'check path', { path: '/x' });
        const json = e.toJSON();
        expect(json.code).toBe(DebugErrorCode.FILE_NOT_FOUND);
        expect(json.message).toBe('missing');
        expect(json.suggestion).toBe('check path');
        expect(json.details).toEqual({ path: '/x' });
    });

    it('toJSON with no suggestion or details', () => {
        const e = new DebugError(DebugErrorCode.UNKNOWN_ERROR, 'unknown');
        const json = e.toJSON();
        expect(json.suggestion).toBeUndefined();
        expect(json.details).toBeUndefined();
    });

    describe('static factories', () => {
        it('binaryNotFound creates correct error', () => {
            const e = DebugError.binaryNotFound('/a.out');
            expect(e.code).toBe(DebugErrorCode.BINARY_NOT_FOUND);
            expect(e.message).toContain('/a.out');
            expect(e.details?.path).toBe('/a.out');
        });

        it('gdbNotFound creates correct error', () => {
            const e = DebugError.gdbNotFound('/usr/bin/gdb');
            expect(e.code).toBe(DebugErrorCode.GDB_NOT_FOUND);
            expect(e.message).toContain('/usr/bin/gdb');
        });

        it('workspaceNotFound creates correct error', () => {
            const e = DebugError.workspaceNotFound('/workspace');
            expect(e.code).toBe(DebugErrorCode.WORKSPACE_NOT_FOUND);
            expect(e.message).toContain('/workspace');
        });

        it('missingParameter creates correct error', () => {
            const e = DebugError.missingParameter('filePath');
            expect(e.code).toBe(DebugErrorCode.MISSING_PARAMETER);
            expect(e.message).toContain('filePath');
            expect(e.details?.missingField).toBe('filePath');
        });

        it('invalidParameter creates correct error', () => {
            const e = DebugError.invalidParameter('line', 'must be a number');
            expect(e.code).toBe(DebugErrorCode.INVALID_PARAMETER);
            expect(e.message).toContain('line');
            expect(e.message).toContain('must be a number');
            expect(e.details?.paramName).toBe('line');
        });

        it('internal creates correct error', () => {
            const e = DebugError.internal('something broke', { context: 'test' });
            expect(e.code).toBe(DebugErrorCode.INTERNAL_ERROR);
            expect(e.message).toContain('something broke');
            expect(e.details?.context).toBe('test');
        });

        it('internal works without details', () => {
            const e = DebugError.internal('oops');
            expect(e.code).toBe(DebugErrorCode.INTERNAL_ERROR);
            expect(e.details).toBeUndefined();
        });
    });

    it('instanceof check works across prototype chain', () => {
        const e = DebugError.binaryNotFound('/missing');
        expect(e instanceof DebugError).toBe(true);
        expect(e instanceof Error).toBe(true);
    });
});

describe('OperationError', () => {
    it('is instance of Error', () => {
        const e = new OperationError('launch', 'failed');
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(OperationError);
    });

    it('sets name to OperationError', () => {
        const e = new OperationError('continue', 'msg');
        expect(e.name).toBe('OperationError');
    });

    it('stores operation and message', () => {
        const e = new OperationError('step_in', 'no session active');
        expect(e.operation).toBe('step_in');
        expect(e.message).toBe('no session active');
    });

    it('stores optional cause', () => {
        const cause = new Error('root cause');
        const e = new OperationError('next', 'wrapper', cause);
        expect(e.cause).toBe(cause);
    });

    it('works without cause', () => {
        const e = new OperationError('quit', 'done');
        expect(e.cause).toBeUndefined();
    });

    it('instanceof check works across prototype chain', () => {
        const e = new OperationError('launch', 'fail');
        expect(e instanceof OperationError).toBe(true);
        expect(e instanceof Error).toBe(true);
    });
});

describe('DebugErrorCode enum', () => {
    it('has expected values', () => {
        expect(DebugErrorCode.BINARY_NOT_FOUND).toBe('BINARY_NOT_FOUND');
        expect(DebugErrorCode.SESSION_NOT_FOUND).toBe('SESSION_NOT_FOUND');
        expect(DebugErrorCode.OPERATION_FAILED).toBe('OPERATION_FAILED');
        expect(DebugErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });
});
