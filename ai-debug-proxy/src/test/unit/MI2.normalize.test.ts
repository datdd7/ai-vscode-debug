/**
 * MI2 Normalize Function Unit Tests
 * Tests the recursive normalizer for MI output
 * 
 * CRITICAL FIX: Now imports and tests PRODUCTION code from MI2.ts
 */

import { describe, it, expect } from 'vitest';
import { normalizeMI } from '../../protocol/mi2/MI2';

describe('MI2 Normalize', () => {
    describe('normalizeMI()', () => {
        it('should handle single frame', () => {
            const input = [['frame', [['level', '0'], ['func', 'main']]]];
            const result = normalizeMI(input);
            expect(result).toEqual({
                frame: {
                    level: '0',
                    func: 'main'
                }
            });
        });

        it('should handle multiple frames', () => {
            const input = [
                ['frame', [['level', '0'], ['func', 'main']]],
                ['frame', [['level', '1'], ['func', 'caller']]]
            ];
            const result = normalizeMI(input);
            // When same key appears multiple times, last value wins in object conversion
            expect(result).toEqual({
                frame: {
                    level: '1',
                    func: 'caller'
                }
            });
        });

        it('should handle locals list', () => {
            const input = [['name', 'x'], ['value', '5']];
            const result = normalizeMI(input);
            expect(result).toEqual({
                name: 'x',
                value: '5'
            });
        });

        it('should handle nested args', () => {
            const input = [
                ['frame', [
                    ['args', [
                        ['name', 'arg1'],
                        ['value', 'val1']
                    ]]
                ]]
            ];
            const result = normalizeMI(input);
            expect(result).toEqual({
                frame: {
                    args: {
                        name: 'arg1',
                        value: 'val1'
                    }
                }
            });
        });

        it('should handle empty result', () => {
            const input: any[] = [];
            const result = normalizeMI(input);
            expect(result).toEqual({});
        });

        it('should handle single scalar', () => {
            const input = 'hello';
            const result = normalizeMI(input);
            expect(result).toBe('hello');
        });

        it('should handle deep nesting', () => {
            const input = [
                ['level1', [
                    ['level2', [
                        ['level3', 'value']
                    ]]
                ]]
            ];
            const result = normalizeMI(input);
            expect(result).toEqual({
                level1: {
                    level2: {
                        level3: 'value'
                    }
                }
            });
        });

        it('should preserve null/undefined', () => {
            expect(normalizeMI(null)).toBeNull();
            expect(normalizeMI(undefined)).toBeUndefined();
        });

        it('should handle mixed arrays and objects', () => {
            const input = [
                ['breakpoint', [
                    ['number', '1'],
                    ['type', 'breakpoint'],
                    ['locations', [
                        ['addr', '0x1234'],
                        ['file', 'main.c']
                    ]]
                ]]
            ];
            const result = normalizeMI(input);
            expect(result).toEqual({
                breakpoint: {
                    number: '1',
                    type: 'breakpoint',
                    locations: {
                        addr: '0x1234',
                        file: 'main.c'
                    }
                }
            });
        });
    });
});
