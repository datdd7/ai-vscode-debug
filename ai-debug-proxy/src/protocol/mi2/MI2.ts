/**
 * @file MI2.ts
 * @module protocol.mi2
 * @description Simplified GDB/MI Protocol Implementation
 *
 * This module handles the low-level communication with the GDB process
 * via the Machine Interface (MI2). it manages the process lifecycle,
 * command queueing, and event emission.
 * 
 * @architecture Layer 1 (Protocol) — Depends on Core (for types) and utils.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { parseMI, MINode } from './mi_parse';

export interface MIResult {
    token?: number;
    resultClass: string;
    resultData?: any;
}

export interface MIStoppedEvent {
    reason: string;
    threadId?: number;
    frame?: {
        addr: string;
        func: string;
        file: string;
        fullname?: string;
        line: string;
    };
    signalName?: string;
}

/**
 * Normalize MI output recursively
 * Converts MI tuple arrays to objects
 * 
 * @param value - MI output to normalize
 * @returns Normalized object/array
 */
export function normalizeMI(value: any): any {
    if (value === null || value === undefined) {
        return value;
    }
    
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return {};
        }
        
        // Check if all elements are key-value pairs
        const allPairs = value.every(item => 
            Array.isArray(item) && item.length === 2 && typeof item[0] === 'string'
        );
        
        if (allPairs) {
            // Convert to object
            const obj: any = {};
            for (const [key, val] of value) {
                obj[key] = normalizeMI(val);
            }
            return obj;
        }
        
        // Array of values
        return value.map(normalizeMI);
    }
    
    if (typeof value === 'object') {
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
            result[key] = normalizeMI(val);
        }
        return result;
    }
    
    return value;
}

/**
 * Simplified MI2 GDB/MI Protocol Handler.
 * 
 * Handles spawning GDB, sending commands with tokens, and parsing
 * async out-of-band records.
 */
export class MI2 extends EventEmitter {
    private process?: ChildProcess;
    private buffer: string = '';
    private token: number = 1;
    private pendingCommands = new Map<number, {
        resolve: (result: MIResult) => void;
        reject: (error: Error) => void;
    }>();
    private running: boolean = false;
    // ADP-009: serialize commands — each call waits for the previous to settle
    private lastCommand: Promise<any> = Promise.resolve();

    constructor(private application: string, private args: string[]) {
        super();
    }

    /**
     * Start GDB process.
     * ADP-004: Resolves only after the first (gdb) prompt is received,
     * eliminating the 500ms race condition.
     */
    async start(cwd: string, initCommands: string[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('[MI2] Starting GDB:', this.application);

            this.process = spawn(this.application, this.args, {
                cwd,
                env: { PATH: process.env.PATH }
            });

            this.process.stdout?.on('data', (data: Buffer) => {
                this.handleOutput(data.toString());
            });

            this.process.stderr?.on('data', (data: Buffer) => {
                console.error('[MI2] GDB stderr:', data.toString());
            });

            // ADP-005: On exit, reject all pending commands immediately
            this.process.on('exit', (code) => {
                console.log('[MI2] GDB exited with code:', code);
                this.running = false;
                this.emit('exited', code);
                for (const [, cb] of this.pendingCommands) {
                    cb.reject(new Error(`GDB exited with code: ${code}`));
                }
                this.pendingCommands.clear();
            });

            this.process.on('error', (err) => {
                console.error('[MI2] GDB process error:', err);
                reject(err);
            });

            // ADP-004: Wait for the (gdb) prompt before sending init commands
            let readyHandled = false;
            const onReady = async () => {
                if (readyHandled) return;
                readyHandled = true;
                try {
                    for (const cmd of initCommands) {
                        await this.sendCommand(cmd);
                    }
                    this.running = true;
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            this.once('ready', onReady);

            // Safety fallback: if no (gdb) prompt within 5s, proceed anyway
            setTimeout(() => {
                if (!readyHandled) {
                    console.warn('[MI2] (gdb) prompt not seen after 5s, proceeding anyway');
                    onReady();
                }
            }, 5000);
        });
    }

    /**
     * Handle GDB output
     */
    private normalize(val: any, forceObject: boolean = false): any {
        if (!Array.isArray(val)) return val;
        if (val.length === 0) return [];

        // Check if it's a list of [string, any] pairs (an MI object or tagged list)
        const isTupleList = val.every(item => 
            Array.isArray(item) && 
            item.length === 2 && 
            typeof item[0] === 'string'
        );

        if (isTupleList) {
            const keys = val.map(v => v[0]);
            const allSame = keys.every(k => k === keys[0]);
            
            if (allSame && !forceObject) {
                // homogeneous tagged list (e.g. stack=[frame={...}, frame={...}])
                return val.map(v => this.normalize(v[1]));
            }

            // object (e.g. frame={level="0", addr="0x..."})
            return val.reduce((acc: any, [k, v]: [string, any]) => {
                const normalizedV = this.normalize(v);
                if (acc[k] !== undefined) {
                    if (Array.isArray(acc[k])) {
                        acc[k].push(normalizedV);
                    } else {
                        acc[k] = [acc[k], normalizedV];
                    }
                } else {
                    acc[k] = normalizedV;
                }
                return acc;
            }, {});
        }

        // Standard array, just normalize elements
        return val.map(v => this.normalize(v));
    }

    // Buffer to capture recent console stream output (~ commands)
    private pendingConsoleOutput: string = '';

    /**
     * Handle GDB output
     */
    private handleOutput(output: string): void {
        this.emit('msg', output);
        this.buffer += output;
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;

            // ADP-004: Detect (gdb) prompt to signal readiness
            if (/^\(gdb\)\s*$/.test(line.trim())) {
                this.emit('ready');
                continue;
            }

            const mi: MINode = parseMI(line);
            
            if (!mi) continue;
            
            // Capture console payload if it is a stream
            // Note: parseMI maps '~' → type='console' (see streamRecordType in mi_parse.ts)
            if (mi.outOfBandRecord) {
                for (const record of mi.outOfBandRecord) {
                    if (record.isStream && record.type === 'console') {
                        this.pendingConsoleOutput += record.content;
                    }
                }
            }
            
            // Handle command response
            if (mi.token !== undefined && this.pendingCommands.has(mi.token)) {
                const callback = this.pendingCommands.get(mi.token)!;
                this.pendingCommands.delete(mi.token);
                
                if (mi.resultRecords && (mi.resultRecords.resultClass === 'done' || mi.resultRecords.resultClass === 'running')) {
                    const resultData = this.normalize(mi.resultRecords.results || [], true) || {};
                    
                    // Attach accumulated console output for statements like -interpreter-exec
                    if (this.pendingConsoleOutput) {
                        resultData.consoleOutput = this.pendingConsoleOutput;
                        this.pendingConsoleOutput = ''; // reset after use
                    }

                    callback.resolve({
                        token: mi.token,
                        resultClass: mi.resultRecords.resultClass,
                        resultData: resultData
                    });
                } else if (mi.resultRecords && mi.resultRecords.resultClass === 'error') {
                    callback.reject(new Error(mi.resultRecords.results?.[0]?.[1] || 'GDB error'));
                    this.pendingConsoleOutput = ''; // empty on error
                }
            }

            // Handle async events (out-of-band records)
            if (mi.outOfBandRecord) {
                for (const record of mi.outOfBandRecord) {
                    if (!record.isStream) {
                        if (record.asyncClass === 'stopped') {
                            const event: MIStoppedEvent = {
                                reason: this.extractStringValue(record.output, 'reason') || 'unknown',
                                signalName: this.extractStringValue(record.output, 'signal-name'),
                                threadId: parseInt(this.extractStringValue(record.output, 'thread-id') || '1') || 1,
                                frame: this.normalize(record.output.find(o => o[0] === 'frame')?.[1])
                            };
                            this.emit('stopped', event);
                        } else if (record.asyncClass === 'running') {
                            this.emit('running');
                        }
                    }
                }
            }
        }
    }

    /**
     * Send command to GDB.
     * ADP-009: Serialized — each call waits for the previous to settle,
     * preventing token mismatches from concurrent callers.
     */
    async sendCommand(cmd: string): Promise<MIResult> {
        // Chain onto previous command; errors in previous don't block this one
        const current = this.lastCommand.then(() => this.sendCommandRaw(cmd));
        this.lastCommand = current.catch(() => {});
        return current;
    }

    /**
     * Internal: send a single command without queuing.
     */
    private sendCommandRaw(cmd: string): Promise<MIResult> {
        return new Promise((resolve, reject) => {
            if (!this.process) {
                reject(new Error('GDB not started'));
                return;
            }

            const token = this.token++;
            this.pendingCommands.set(token, { resolve, reject });

            const line = `${token}${cmd}\n`;
            console.log('[MI2] Sending:', line.trim());
            this.process.stdin?.write(line);

            // Timeout after 30 seconds for file operations, 10 seconds otherwise
            const timeoutMs = cmd.includes('-file-') ? 30000 : 10000;
            setTimeout(() => {
                if (this.pendingCommands.has(token)) {
                    this.pendingCommands.delete(token);
                    reject(new Error(`Command timeout after ${timeoutMs}ms: ${cmd}`));
                }
            }, timeoutMs);
        });
    }

    /**
     * Kill GDB process
     */
    kill(): void {
        if (this.process) {
            this.process.kill();
            this.process = undefined;
            this.running = false;
        }
    }

    /**
     * Check if GDB is running
     */
    isRunning(): boolean {
        return this.running;
    }

    /**
     * Helper to extract string value from MI output
     */
    private extractStringValue(output: [string, any][], key: string): string | undefined {
        const item = output ? output.find(o => o[0] === key) : undefined;
        return item ? String(item[1]) : undefined;
    }
}
