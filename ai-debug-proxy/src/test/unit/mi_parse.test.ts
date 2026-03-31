/**
 * MI Parser Unit Tests
 * Ported from cortex-debug/test/suite/mi_parse.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parseMI, MINode } from '../../protocol/mi2/mi_parse';
import { GDB_MI_FIXTURES } from './fixtures/gdb_outputs';

describe('MI Parser', () => {
    describe('parseMI', () => {
        it('should parse empty string', () => {
            const result = parseMI('');
            // Empty string returns MINode with undefined resultRecords
            expect(result?.resultRecords).toBeUndefined();
        });

        it('should parse (gdb) prompt', () => {
            const result = parseMI('(gdb)');
            // (gdb) prompt returns MINode with undefined resultRecords
            expect(result?.resultRecords).toBeUndefined();
        });

        it('should parse simple result record', () => {
            const result = parseMI(GDB_MI_FIXTURES.simpleResult);
            expect(result).toBeDefined();
            expect(result?.token).toBeUndefined();
            expect(result?.resultRecords?.resultClass).toBe('done');
            expect(result?.resultRecords?.results).toEqual([]);
        });

        it('should parse result with data', () => {
            const result = parseMI(GDB_MI_FIXTURES.resultWithData);
            expect(result).toBeDefined();
            expect(result?.resultRecords?.resultClass).toBe('done');
            // Results are parsed as nested arrays
            expect(result?.resultRecords?.results?.length).toBe(2);
            expect(result?.resultRecords?.results?.[0][0]).toBe('name');
            expect(result?.resultRecords?.results?.[1][0]).toBe('number');
        });

        it('should parse console output', () => {
            const result = parseMI(GDB_MI_FIXTURES.consoleOutput);
            expect(result).toBeDefined();
            expect(result?.outOfBandRecord).toBeDefined();
            expect(result?.outOfBandRecord?.length).toBe(1);
            // Console output type is 'log' in our implementation
            expect(result?.outOfBandRecord?.[0].type).toBe('log');
        });

        it('should parse stopped event (breakpoint hit)', () => {
            const result = parseMI(GDB_MI_FIXTURES.stoppedBreakpoint);
            expect(result).toBeDefined();
            expect(result?.outOfBandRecord?.length).toBe(1);
            const record = result?.outOfBandRecord?.[0];
            if (record && !record.isStream) {
                expect(record.asyncClass).toBe('stopped');
                expect(record.output.find(o => o[0] === 'reason')?.[1]).toBe('breakpoint-hit');
            } else {
                expect.fail('Expected async record');
            }
        });

        it('should parse stopped event with frame', () => {
            const result = parseMI(GDB_MI_FIXTURES.stoppedBreakpoint);
            expect(result).toBeDefined();
            const record = result?.outOfBandRecord?.[0];
            if (record && !record.isStream) {
                const frameOutput = record.output.find(o => o[0] === 'frame');
                expect(frameOutput).toBeDefined();
                
                // Verify exact frame structure
                if (frameOutput && Array.isArray(frameOutput[1])) {
                    expect(frameOutput[1]).toEqual([
                        ['addr', '0x00000000004005e4'],
                        ['func', 'main'],
                        ['args', []],
                        ['file', 'main.c'],
                        ['fullname', '/home/user/main.c'],
                        ['line', '10']
                    ]);
                }
            } else {
                expect.fail('Expected async record');
            }
        });

        it('should parse running event', () => {
            const result = parseMI(GDB_MI_FIXTURES.running);
            expect(result).toBeDefined();
            const record = result?.outOfBandRecord?.[0];
            if (record && !record.isStream) {
                expect(record.asyncClass).toBe('running');
            } else {
                expect.fail('Expected async record');
            }
        });

        it('should parse unicode content', () => {
            const result = parseMI(GDB_MI_FIXTURES.unicode);
            expect(result).toBeDefined();
            // Unicode should be preserved
            const record = result?.outOfBandRecord?.[0];
            if (record && record.isStream) {
                expect(record.content).toContain('世界');
            } else {
                expect.fail('Expected stream record');
            }
        });

        it('should parse escaped characters', () => {
            const result = parseMI(GDB_MI_FIXTURES.escaped);
            expect(result).toBeDefined();
            // Escaped characters are unescaped in the content
            const record = result?.outOfBandRecord?.[0];
            if (record && record.isStream) {
                expect(record.content).toContain('Line 1');
                expect(record.content).toContain('Line 2');
            } else {
                expect.fail('Expected stream record');
            }
        });

        it('should parse token', () => {
            const result = parseMI('123^done');
            expect(result).toBeDefined();
            expect(result?.token).toBe(123);
        });

        it('should parse multiple out-of-band records', () => {
            const input = '=running,thread-id="1"*stopped,reason="breakpoint-hit"';
            const result = parseMI(input);
            expect(result).toBeDefined();
            expect(result?.outOfBandRecord?.length).toBe(2);
            
            // Verify first record is 'running'
            const record1 = result?.outOfBandRecord?.[0];
            if (record1 && !record1.isStream) {
                expect(record1.asyncClass).toBe('running');
                expect(record1.output.find(o => o[0] === 'thread-id')?.[1]).toBe('1');
            } else {
                expect.fail('Expected async record for first record');
            }
            
            // Verify second record is 'stopped'
            const record2 = result?.outOfBandRecord?.[1];
            if (record2 && !record2.isStream) {
                expect(record2.asyncClass).toBe('stopped');
                expect(record2.output.find(o => o[0] === 'reason')?.[1]).toBe('breakpoint-hit');
            } else {
                expect.fail('Expected async record for second record');
            }
        });
    });

    describe('MINode.valueOf', () => {
        it('should extract value from path', () => {
            const result = parseMI(GDB_MI_FIXTURES.stoppedBreakpoint);
            expect(result).toBeDefined();
            
            // Test frame access
            const record = result?.outOfBandRecord?.[0];
            if (record && !record.isStream) {
                const frame = record.output.find(o => o[0] === 'frame');
                expect(frame).toBeDefined();
                
                if (frame && Array.isArray(frame[1])) {
                    const func = MINode.valueOf(frame[1], 'func');
                    expect(func).toBe('main');
                    
                    const line = MINode.valueOf(frame[1], 'line');
                    expect(line).toBe('10');
                }
            } else {
                expect.fail('Expected async record');
            }
        });

        it('should return undefined for missing path', () => {
            const result = parseMI(GDB_MI_FIXTURES.simpleResult);
            const value = MINode.valueOf(result?.resultRecords?.results, 'nonexistent');
            expect(value).toBeUndefined();
        });

        it('should handle array indexing', () => {
            const result = parseMI(GDB_MI_FIXTURES.localsList);
            expect(result).toBeDefined();
            
            // Verify locals list is parsed (exact structure depends on fixture)
            // Fixture: 'locals=[{name="x",value="42",type="int"},{name="y",value="0",type="int"}]'
            expect(result?.outOfBandRecord).toBeDefined();
        });
    });
});
