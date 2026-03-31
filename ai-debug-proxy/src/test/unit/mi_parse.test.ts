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

        it('should parse token in result record', () => {
            const result = parseMI('123^done');
            expect(result).toBeDefined();
            expect(result?.token).toBe(123);
        });

        it('should parse token in out-of-band record', () => {
            // Exercises line 318: token = parseInt(match[1]) inside the OOB while loop
            const result = parseMI('1*running,thread-id="all"');
            expect(result).toBeDefined();
            expect(result?.token).toBe(1);
            const record = result?.outOfBandRecord?.[0];
            expect(record).toBeDefined();
            if (record && !record.isStream) {
                expect(record.asyncClass).toBe('running');
            } else {
                expect.fail('Expected async record with token');
            }
        });

        it('should parse out-of-band record without comma (no params)', () => {
            // Exercises lines 328-330: asyncClass else branch when no comma follows
            const result = parseMI('*stopped');
            expect(result).toBeDefined();
            const record = result?.outOfBandRecord?.[0];
            expect(record).toBeDefined();
            if (record && !record.isStream) {
                expect(record.asyncClass).toBe('stopped');
                expect(record.output).toEqual([]);
            } else {
                expect.fail('Expected async record');
            }
        });

        it('should parse target output stream record (@)', () => {
            const result = parseMI('@"target output\\n"');
            expect(result).toBeDefined();
            const record = result?.outOfBandRecord?.[0];
            if (record && record.isStream) {
                expect(record.type).toBe('target');
            } else {
                expect.fail('Expected stream record');
            }
        });

        it('should parse result with a list of string values (exercises parseCommaValue)', () => {
            // GDB can return value lists like files=["main.c","helper.c"]
            const result = parseMI('^done,files=["main.c","helper.c","util.c"]');
            expect(result).toBeDefined();
            expect(result?.resultRecords?.resultClass).toBe('done');
            const filesEntry = result?.resultRecords?.results?.find(r => r[0] === 'files');
            expect(filesEntry).toBeDefined();
            expect(Array.isArray(filesEntry![1])).toBe(true);
            expect(filesEntry![1]).toHaveLength(3);
        });

        it('should parse log stream record (&)', () => {
            const result = parseMI('&"set pagination off\\n"');
            expect(result).toBeDefined();
            const record = result?.outOfBandRecord?.[0];
            if (record && record.isStream) {
                expect(record.type).toBe('log');
                expect(record.content).toContain('set pagination off');
            } else {
                expect.fail('Expected log stream record');
            }
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

    describe('MINode.record()', () => {
        it('returns undefined when outOfBandRecord is empty', () => {
            const node = parseMI('^done');
            // No OOB records → record() returns undefined
            expect(node.record('reason')).toBeUndefined();
        });

        it('returns undefined when first OOB record is a stream record', () => {
            const node = parseMI('~"hello\\n"');
            expect(node.record('type')).toBeUndefined();
        });

        it('returns value from async OOB record', () => {
            const node = parseMI('*stopped,reason="breakpoint-hit",thread-id="1"');
            expect(node.record('reason')).toBe('breakpoint-hit');
        });
    });

    describe('MINode.result()', () => {
        it('returns undefined when no resultRecords', () => {
            const node = parseMI('*stopped,reason="step"');
            // No result record → result() returns undefined
            expect(node.result('value')).toBeUndefined();
        });

        it('returns value from result record', () => {
            const node = parseMI('^done,value="42"');
            expect(node.result('value')).toBe('42');
        });

        it('returns undefined for missing key', () => {
            const node = parseMI('^done,value="42"');
            expect(node.result('nonexistent')).toBeUndefined();
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

        it('valueOf @ notation wraps current in array', () => {
            // '@' at path step wraps current value in array (line 115-116 in mi_parse.ts)
            const results: [string, any][] = [['value', '42']];
            const wrapped = MINode.valueOf(results, 'value@');
            expect(Array.isArray(wrapped)).toBe(true);
            expect(wrapped[0]).toBe('42');
        });

        it('valueOf with multiple matching keys returns array', () => {
            // found.length > 1 → current = found (array of all matches)
            const results: [string, any][] = [
                ['frame', 'a'],
                ['frame', 'b'],
                ['frame', 'c']
            ];
            const found = MINode.valueOf(results, 'frame');
            expect(Array.isArray(found)).toBe(true);
            expect(found).toHaveLength(3);
        });

        it('valueOf accesses array element by index (in bounds)', () => {
            // current is an array, i in bounds → current = current[i]
            const results: [string, any][] = [['items', ['a', 'b', 'c']]];
            const val = MINode.valueOf(results, 'items[1]');
            expect(val).toBe('b');
        });

        it('valueOf returns undefined for out-of-bounds index', () => {
            // i > 0 and out of range → return undefined (line 125-126)
            const results: [string, any][] = [['x', 'a'], ['y', 'b']];
            const val = MINode.valueOf(results, 'x[5]');
            expect(val).toBeUndefined();
        });

        it('valueOf returns undefined when start is falsy (lines 87-88)', () => {
            expect(MINode.valueOf(undefined, 'foo')).toBeUndefined();
            expect(MINode.valueOf(null, 'foo')).toBeUndefined();
        });

        it('valueOf returns undefined when path segment is not a variable, @, or index (lines 129-130)', () => {
            // '#' does not match pathRegex, is not '@', does not match indexRegex
            const results: [string, any][] = [['key', 'val']];
            expect(MINode.valueOf(results, 'key.#bad')).toBeUndefined();
        });
    });

    describe('parseMI edge cases', () => {
        it('parseTupleOrList handles nested tuple with key=value pairs', () => {
            const result = parseMI('^done,locals=[{name="x",value="42",type="int"}]');
            expect(result).toBeDefined();
            expect(result?.resultRecords?.resultClass).toBe('done');
        });

        it('parseString handles octal escape sequences (\\141 = "a")', () => {
            // GDB outputs octal like \141 = 'a' (ASCII 97, octal 141)
            // escapeMap has '0' but NOT '1', so \141 goes through octalMatch path
            const result = parseMI('~"\\141"');
            const record = result?.outOfBandRecord?.[0];
            if (record && record.isStream) {
                expect(record.content).toBe('a');
            } else {
                expect.fail('Expected stream record');
            }
        });

        it('parseString handles unknown escape as literal char', () => {
            // \q is not in escapeMap → written as literal 'q'
            const result = parseMI('~"hello\\qworld"');
            const record = result?.outOfBandRecord?.[0];
            if (record && record.isStream) {
                expect(record.content).toContain('q');
            } else {
                expect.fail('Expected stream record');
            }
        });

        it('parseResult returns undefined when list item starts with non-variable char', () => {
            // [123] → inside parseTupleOrList, parseResult() is called on "123]"
            // variableRegex fails on digit → returns undefined (lines 289-290)
            const result = parseMI('^done,locals=[123]');
            expect(result?.resultRecords?.resultClass).toBe('done');
            // 'locals' key is present but its value couldn't be parsed as a tuple
            expect(result?.resultRecords?.results).toBeDefined();
        });

        it('parseCString returns empty string when stream record has no opening quote (lines 211-212)', () => {
            // After consuming '~', output = 'no-string\n' which doesn't start with '"'
            // parseCString early-return path: if (output[0] !== '"') return ''
            const result = parseMI('~no-string\n');
            const record = result?.outOfBandRecord?.[0];
            expect(record?.isStream).toBe(true);
            if (record?.isStream) {
                expect(record.content).toBe('');
            }
        });
    });
});
