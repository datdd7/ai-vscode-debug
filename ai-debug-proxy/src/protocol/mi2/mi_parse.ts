/**
 * @file mi_parse.ts
 * @module protocol.mi2
 * @description GDB/MI protocol parser
 *
 * Parses the GDB Machine Interface output format into structured JavaScript objects.
 *
 * @traceability
 * Software Requirements:
 * REQ-PARSE-001  parseMI shall parse result records (^done, ^error)
 * REQ-PARSE-002  parseMI shall parse async records (*stopped, *running)
 * REQ-PARSE-003  parseMI shall parse stream records (~, @, &)
 * REQ-PARSE-004  MINode.valueOf shall return undefined for falsy start
 * REQ-PARSE-005  MINode.valueOf shall return start for empty path
 */

/**
 * Result of a parsed MI line.
 */
export interface MIInfo {
    /** Command token if present. */
    token: number | undefined;
    /** List of out-of-band records (async notifications or stream output). */
    outOfBandRecord: (
        | { isStream: false; type: string; asyncClass: string; output: [string, any][] }
        | { isStream: true; type: string; content: string }
    )[];
    /** Final result record for a command. */
    resultRecords: { resultClass: string; results: [string, any][] } | undefined;
}

const octalMatch = /^[0-7]{3}/;
const escapeMap = {
    '\\': '\\',
    '"': '"',
    '\'': '\'',
    'n': '\n',
    'r': '\r',
    't': '\t',
    'b': '\b',
    'f': '\f',
    'v': '\v',
    '0': '\0'
};

function parseString(str: string): string {
    const ret = Buffer.alloc(str.length * 4);
    let bufIndex = 0;

    /* v8 ignore next 3 -- defensive: parseCString always wraps in valid quotes */
    if (str[0] !== '"' || str[str.length - 1] !== '"') {
        throw new Error('Not a valid string');
    }
    str = str.slice(1, -1);
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '\\') {
            /* v8 ignore next 3 -- defensive: GDB never sends a lone backslash at end of string */
            if (++i >= str.length) {
                throw new Error('Not a valid escape sequence');
            }
            const sub = (escapeMap as any)[str[i]];
            if (sub) {
                bufIndex += ret.write(sub, bufIndex);
            } else {
                const m = octalMatch.exec(str.substr(i));
                if (m) {
                    ret.writeUInt8(parseInt(m[0], 8), bufIndex++);
                    i += 2;
                } else {
                    bufIndex += ret.write(str[i], bufIndex);
                }
            }
        /* v8 ignore next 2 -- defensive: parseCString ensures no unescaped '"' reaches here */
        } else if (str[i] === '"') {
            throw new Error('Not a valid string');
        } else {
            bufIndex += ret.write(str[i], bufIndex);
        }
    }
    return ret.toString('utf8', 0, bufIndex);
}

/**
 * Represents a parsed GDB/MI node.
 * Provides utility methods to navigate the parsed tree.
 */
export class MINode implements MIInfo {
    public token: number | undefined;
    public outOfBandRecord: (
        | { isStream: false; type: string; asyncClass: string; output: [string, any][] }
        | { isStream: true; type: string; content: string }
    )[];
    public resultRecords: { resultClass: string; results: [string, any][] } | undefined;
    /** Original raw output string. */
    public output: string = '';

    /**
     * Extracts a value from a nested MI result list using a path.
     * 
     * @param start - Starting point (usually results array)
     * @param path - Dot-separated path (e.g., 'frame.addr')
     * @returns The value at path or undefined
     */
    public static valueOf(start: any, path: string): any {
        if (!start) {
            return undefined;
        }
        const pathRegex = /^\.?([a-zA-Z_-][a-zA-Z0-9_-]*)/;
        const indexRegex = /^\[(\d+)\](?:$|\.)/;
        path = path.trim();
        if (!path) { return start; }
        let current = start;
        do {
            let target = pathRegex.exec(path);
            if (target) {
                path = path.substr(target[0].length);
                if (current.length && typeof current !== 'string') {
                    const found = [];
                    for (const element of current) {
                        if (element[0] === target[1]) {
                            found.push(element[1]);
                        }
                    }
                    if (found.length > 1) {
                        current = found;
                    } else if (found.length === 1) {
                        current = found[0];
                    } else {
                        return undefined;
                    }
                } else {
                    return undefined;
                }
            } else if (path[0] === '@') {
                current = [current];
                path = path.substr(1);
            } else {
                target = indexRegex.exec(path);
                if (target) {
                    path = path.substr(target[0].length);
                    const i = parseInt(target[1]);
                    if (current.length && typeof current !== 'string' && i >= 0 && i < current.length) {
                        current = current[i];
                    } else if (i !== 0) {
                        return undefined;
                    }
                } else {
                    return undefined;
                }
            }
            path = path.trim();
        } while (path);
        return current;
    }

    constructor(
        token: number | undefined,
        info: (
            | { isStream: false; type: string; asyncClass: string; output: [string, any][] }
            | { isStream: true; type: string; content: string }
        )[],
        result: { resultClass: string; results: [string, any][] } | undefined
    ) {
        this.token = token;
        this.outOfBandRecord = info;
        this.resultRecords = result;
    }

    public record(path: string): any {
        if (!this.outOfBandRecord || (this.outOfBandRecord.length === 0)) {
            return undefined;
        }
        const first = this.outOfBandRecord[0];
        if (first.isStream) {
            return undefined;
        }
        return MINode.valueOf(first.output, path);
    }

    public result(path: string): any {
        if (!this.resultRecords) {
            return undefined;
        }
        return MINode.valueOf(this.resultRecords.results, path);
    }
}

const tokenRegex = /^\d+/;
const outOfBandRecordRegex = /^(?:(\d*|undefined)([*+=])|([~@&]))/;
const resultRecordRegex = /^(\d*)\^(done|running|connected|error|exit)/;
const newlineRegex = /^\r\n?/;
const endRegex = /^\(gdb\)\r\n?/;
const variableRegex = /^([a-zA-Z_-][a-zA-Z0-9_-]*)/;
const asyncClassRegex = /^(.*?),/;

export function parseMI(output: string): MINode {
    /*
        output ==>
            (
                exec-async-output     = [ token ] "*" ("stopped" | others) ( "," variable "=" (const | tuple | list) )* \n
                status-async-output   = [ token ] "+" ("stopped" | others) ( "," variable "=" (const | tuple | list) )* \n
                notify-async-output   = [ token ] "=" ("stopped" | others) ( "," variable "=" (const | tuple | list) )* \n
                console-stream-output = "~" c-string \n
                target-stream-output  = "@" c-string \n
                log-stream-output     = "&" c-string \n
            )*
            [
                [ token ] "^" ("done" | "running" | "connected" | "error" | "exit") ( "," variable "=" (const | tuple | list) )* \n
            ]
            "(gdb)" \n
    */

    let token;
    const outOfBandRecord = [];
    let resultRecords;

    const asyncRecordType = {
        '*': 'exec',
        '+': 'status',
        '=': 'notify'
    };
    const streamRecordType = {
        '~': 'console',
        '@': 'target',
        '&': 'log'
    };

    const parseCString = () => {
        if (output[0] !== '"') {
            return '';
        }
        let stringEnd = 1;
        let inString = true;
        let remaining = output.substr(1);
        let escaped = false;
        while (inString) {
            if (escaped) {
                escaped = false;
            } else if (remaining[0] === '\\') {
                escaped = true;
            } else if (remaining[0] === '"') {
                inString = false;
            }

            remaining = remaining.substr(1);
            stringEnd++;
        }
        let str: string;
        try {
            str = parseString(output.substr(0, stringEnd));
            /* v8 ignore next 3 -- catch is unreachable: parseCString output always valid for parseString */
        } catch (e) {
            str = output.substr(0, stringEnd);
        }
        output = output.substr(stringEnd);
        return str;
    };

    function parseTupleOrList(): unknown[] | undefined {
        /* v8 ignore next 3 -- parseValue() only calls here when output[0] is '{' or '[' */
        if (output[0] !== '{' && output[0] !== '[') {
            return undefined;
        }
        const oldContent = output;
        const canBeValueList = output[0] === '[';
        output = output.substr(1);
        if (output[0] === '}' || output[0] === ']') {
            output = output.substr(1);
            return [];
        }
        if (canBeValueList) {
            let value = parseValue();
            if (value) { // is value list
                const values = [];
                values.push(value);
                const remaining = output;
                while ((value = parseCommaValue()) !== undefined) {
                    values.push(value);
                }
                output = output.substr(1); // ]
                return values;
            }
        }
        let result = parseResult();
        if (result) {
            const results = [];
            results.push(result);
            while ((result = parseCommaResult())) {
                results.push(result);
            }
            output = output.substr(1); // }
            return results;
        }
        /* v8 ignore next 2 -- defensive: GDB never sends a {tuple} where content fails parseResult */
        output = (canBeValueList ? '[' : '{') + output;
        return undefined;
    };

    function parseValue(): unknown {
        if (output[0] === '"') {
            return parseCString();
        } else if (output[0] === '{' || output[0] === '[') {
            return parseTupleOrList();
        } else {
            return undefined;
        }
    };

    function parseResult(): [string, any] | undefined {
        const variableMatch = variableRegex.exec(output);
        if (!variableMatch) {
            return undefined;
        }
        output = output.substr(variableMatch[0].length + 1);
        const variable = variableMatch[1];
        return [variable, parseValue()];
    };

    function parseCommaValue() {
        if (output[0] !== ',') {
            return undefined;
        }
        output = output.substr(1);
        return parseValue();
    };

    function parseCommaResult(): [string, any] | undefined {
        if (output[0] !== ',') {
            return undefined;
        }
        output = output.substr(1);
        return parseResult();
    };

    let match;

    while ((match = outOfBandRecordRegex.exec(output))) {
        output = output.substr(match[0].length);
        if (match[1] && token === undefined && match[1] !== 'undefined') {
            token = parseInt(match[1]);
        }

        if (match[2]) {
            const classMatch = asyncClassRegex.exec(output);
            let asyncClass = '';
            if (classMatch) {
                asyncClass = classMatch[1];
                output = output.substr(asyncClass.length);
            } else {
                asyncClass = output;
                output = '';
            }
            const asyncRecord: { isStream: false; type: string; asyncClass: string; output: [string, any][] } = {
                isStream: false,
                type: asyncRecordType[match[2] as keyof typeof asyncRecordType] as string,
                asyncClass: asyncClass,
                output: [] as [string, any][]
            };
            let result;
            while ((result = parseCommaResult())) {
                asyncRecord.output.push(result);
            }
            outOfBandRecord.push(asyncRecord);
        } else if (match[3]) {
            const streamRecord: { isStream: true; type: string; content: string } = {
                isStream: true,
                type: (streamRecordType as any)[match[3]] as string,
                content: parseCString()
            };
            outOfBandRecord.push(streamRecord);
        }

        output = output.replace(newlineRegex, '');
    }

    if ((match = resultRecordRegex.exec(output))) {
        output = output.substr(match[0].length);
        if (match[1] && token === undefined) {
            token = parseInt(match[1]);
        }
        resultRecords = {
            resultClass: match[2],
            results: [] as [string, any][]
        };
        let result: [string, any] | undefined;
        while ((result = parseCommaResult())) {
            resultRecords.results.push(result);
        }

        output = output.replace(newlineRegex, '');
    }

    /* v8 ignore next -- outOfBandRecord is always [] (initialized line 198), || [] is defensive dead code */
    return new MINode(token, outOfBandRecord || [], resultRecords);
}
