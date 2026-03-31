/**
 * @file GDBBackend.ts
 * @module backend
 * @description GDB Debug Backend Implementation
 * 
 * This class implements the {@link IDebugBackend} interface using the GDB/MI protocol.
 * It manages a child GDB process via the {@link MI2} protocol handler and translates
 * MI events into generic backend events.
 * 
 * @architecture Layer 2 (Backend) — Depends on Protocol and Core layers.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import {
    IDebugBackend,
    BackendConfig,
    LaunchParams,
    AttachParams,
    StopEvent,
    SourceLocation,
    Breakpoint,
    StackFrame,
    Variable,
    DebuggerCapabilities,
    ThreadInfo
} from '../core/IDebugBackend';
import { MI2, MIStoppedEvent } from '../protocol/mi2/MI2';

// ADP-003: use portable path relative to the compiled output directory
const LOG_FILE = path.join(__dirname, '..', 'proxy.log');

/**
 * GDB Debug Backend.
 * 
 * Handles process lifecycle, execution control, and variable inspection
 * via GDB's Machine Interface (MI2).
 */
export class GDBBackend extends EventEmitter implements IDebugBackend {
    private mi2?: MI2;
    private config?: BackendConfig;
    private running: boolean = false;
    private breakpoints = new Map<string, Breakpoint>();
    private currentFrame?: StackFrame;
    private lastStopEvent?: StopEvent;
    // ADP-002: tracks selected frame index for frameUp/frameDown navigation
    private currentFrameId: number = 0;

    /**
     * ADP-021: Escape a file path for embedding in a GDB MI command string.
     * Prevents command injection via crafted path names.
     */
    private escapePath(p: string): string {
        return p.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '');
    }

    /**
     * Log helper
     */
    private log(message: string) {
        const logMsg = `[GDBBackend][${new Date().toISOString()}] ${message}\n`;
        console.log(logMsg.trim());
        try {
            fs.appendFileSync(LOG_FILE, logMsg);
        } catch (e) {
            // ignore
        }
    }

    /**
     * Initializes the GDB backend.
     * Starts the GDB process with MI2 interpreter and pretty-printing enabled.
     * 
     * @param config - Backend configuration (gdbPath, etc.)
     */
    async initialize(config: BackendConfig): Promise<void> {
        this.log(`Initializing GDBBackend: ${JSON.stringify(config, null, 2)}`);
        
        this.config = config;
        this.mi2 = new MI2(config.gdbPath || 'gdb', ['--interpreter=mi2']);
        
        // Forward MI2 raw output to our log
        this.mi2.on('msg', (msg: string) => {
            this.log(`[MI2 RAW] ${msg}`);
        });
        
        // Set up event listeners - map MI2 events to backend events
        this.mi2.on('stopped', (event: MIStoppedEvent) => {
            this.log(`[GDBBackend] Stopped event: ${event.reason}`);
            this.running = false;
            this.updateCurrentFrame(event);
            this.lastStopEvent = this.createStopEvent(event);
            // Emit stopped event to DebugAdapter
            this.emit('stopped', this.lastStopEvent);
        });

        this.mi2.on('running', () => {
            this.log('[GDBBackend] Running event');
            this.running = true;
            this.emit('running');
        });

        this.mi2.on('exited', (code: number) => {
            this.log(`[GDBBackend] Exited with code: ${code}`);
            this.running = false;
            this.emit('exited', code);
        });
        
        // Start GDB
        await this.mi2.start(process.cwd(), [
            '-enable-pretty-printing',
            '-gdb-set target-async on'
        ]);
        
        this.running = false;
        this.log('GDBBackend initialized successfully');
    }

    /**
     * Create StopEvent from MI2 event
     */
    private createStopEvent(event: MIStoppedEvent): StopEvent {
        const reason = event.reason === 'exited' ? 'exited' as const :
                      event.reason === 'breakpoint-hit' ? 'breakpoint' as const :
                      event.reason === 'end-stepping-range' || event.reason === 'function-finished' ? 'step' as const :
                      event.reason === 'signal-received' ? 
                        (event.signalName === 'SIGINT' ? 'pause' as const : 'exception' as const) :
                      'pause' as const;

        return {
            reason,
            threadId: event.threadId || 1,
            allThreadsStopped: true,
            frame: event.frame ? {
                id: 0,
                name: event.frame.func || '??',
                path: event.frame.fullname || event.frame.file || '',
                line: parseInt(event.frame.line) || 0,
                column: 0
            } : undefined
        };
    }

    /**
     * Update current frame from stop event.
     * ADP-002: resets currentFrameId to 0 (top frame) on every new stop.
     */
    private updateCurrentFrame(event: MIStoppedEvent): void {
        this.currentFrameId = 0;
        if (event.frame) {
            this.currentFrame = {
                id: 0,
                name: event.frame.func || '??',
                path: event.frame.fullname || event.frame.file || '',
                line: parseInt(event.frame.line) || 0,
                column: 0
            };
        }
    }

    /**
     * Launch debug session
     */
    async launch(params: LaunchParams): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');

        this.log(`Starting program: ${params.program}`);

        // Load executable — ADP-021: escape path to prevent MI2 command injection
        await this.mi2.sendCommand(`-file-exec-and-symbols "${this.escapePath(params.program)}"`);

        if (params.cwd) {
            await this.mi2.sendCommand(`-environment-cd "${this.escapePath(params.cwd)}"`);
        }

        if (params.env) {
            for (const [key, value] of Object.entries(params.env)) {
                if (value !== null) {
                    await this.mi2.sendCommand(`-interpreter-exec console "set environment ${key}=${value}"`);
                }
            }
        }

        // Set entry breakpoint if requested
        // Use -f (pending) so the breakpoint activates even when main is in a shared library
        if (params.stopOnEntry) {
            await this.mi2.sendCommand('-break-insert -f main');
            console.log('[GDBBackend] Breakpoint set at main (pending)');
        }
        
        this.log('Launch complete (deferred -exec-run)');
    }

    /**
     * Start execution
     */
    async start(): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');
        
        console.log('[GDBBackend] Starting program execution');
        await this.mi2.sendCommand('-exec-run');
        this.running = true;
    }

    /**
     * Attach to running process
     */
    async attach(params: AttachParams): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Attaching to PID:', params.processId);
        await this.mi2.sendCommand(`-target-attach ${params.processId}`);
    }

    /**
     * Terminate debug session
     */
    async terminate(): Promise<void> {
        console.log('[GDBBackend] Terminating session');

        if (this.mi2) {
            // Send exit command without awaiting to avoid hanging if GDB closes pipe
            this.mi2.sendCommand('-gdb-exit').catch(() => {});
            this.mi2.kill();
            this.mi2 = undefined;
        }

        this.running = false;
        this.breakpoints.clear();
        this.currentFrame = undefined;
    }

    /**
     * Check if debugger is running
     */
    isRunning(): boolean {
        this.log(`isRunning() check: ${this.running}`);
        return this.running;
    }

    /**
     * Continue execution
     * Returns immediately when GDB acknowledges (program is running)
     * Emits 'stopped' event when program actually stops
     */
    async continue(): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');

        this.log('[GDBBackend] Continuing execution - setting running=true');
        this.running = true; // Set immediately for responsiveness
        await this.mi2.sendCommand('-exec-continue');
    }

    /**
     * Step over (next line)
     * Returns immediately when GDB acknowledges
     * Emits 'stopped' event when step completes
     */
    async stepOver(): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Stepping over');
        this.running = true;
        await this.mi2.sendCommand('-exec-next');
    }

    /**
     * Step into function
     */
    async stepIn(): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Stepping into');
        this.running = true;
        await this.mi2.sendCommand('-exec-step');
    }

    /**
     * Step out of function
     */
    async stepOut(): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Stepping out');
        this.running = true;
        await this.mi2.sendCommand('-exec-finish');
    }

    /**
     * Pause execution
     */
    async pause(): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Pausing execution');
        await this.mi2.sendCommand('-exec-interrupt');
    }

    /**
     * Jump to line (Safely)
     */
    async jumpToLine(line: number, file?: string): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');
        this.log(`Attempting jump to line ${line}${file ? ` in ${file}` : ''}`);

        // 1. Get file path
        let targetFile = file;
        if (!targetFile) {
            const stack = await this.getStackTrace();
            if (stack.length === 0) {
                throw new Error('Cannot jump: No current file context and no file specified');
            }
            targetFile = stack[0].path;
        }

        if (!targetFile) {
            throw new Error('Cannot jump: No file path available');
        }

        // 2. Set temporary breakpoint at target to ensure we stop
        this.log(`Forcing temporary breakpoint at ${targetFile}:${line} for jump safety`);
        const ef = this.escapePath(targetFile);
        await this.mi2.sendCommand(`-break-insert -t ${ef}:${line}`);

        // 3. Jump
        await this.mi2.sendCommand(`-exec-jump ${ef}:${line}`);
    }

    /**
     * Run until line (safe)
     */
    async runUntilLine(line: number, file?: string): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');
        this.log(`Running until line ${line}${file ? ` in ${file}` : ''}`);

        // 1. Get file path
        let targetFile = file;
        if (!targetFile) {
            const stack = await this.getStackTrace();
            if (stack.length === 0) {
                throw new Error('Cannot run until line: No current file context and no file specified');
            }
            targetFile = stack[0].path;
        }

        if (!targetFile) {
            throw new Error('Cannot run until line: No file path available');
        }

        // 2. Set temporary breakpoint
        await this.mi2.sendCommand(`-break-insert -t ${this.escapePath(targetFile)}:${line}`);

        // 3. Continue
        await this.mi2.sendCommand('-exec-continue');
    }

    /**
     * Set breakpoint at location.
     * ADP-006: uses GDB-assigned number as the breakpoint ID (not Date.now()).
     * ADP-007: reads verified status from GDB response instead of hardcoding true.
     */
    async setBreakpoint(location: SourceLocation): Promise<Breakpoint> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Setting breakpoint at', location);

        const result = await this.mi2.sendCommand(
            `-break-insert ${this.escapePath(location.path)}:${location.line}`
        );

        // Parse GDB's bkpt record to get the real number and verified status
        const bkpt = result.resultData?.bkpt;
        const gdbNumber = bkpt?.number ? String(bkpt.number) : `tmp-${Date.now()}`;
        const verified = bkpt?.enabled === 'y';
        const actualLine = bkpt?.line ? parseInt(bkpt.line) : location.line;
        const actualFile = bkpt?.fullname || bkpt?.file || location.path;

        const bp: Breakpoint = {
            id: gdbNumber,  // ADP-006: real GDB number, eliminates collision risk
            verified,       // ADP-007: from GDB response
            line: actualLine,
            file: actualFile
        };

        this.breakpoints.set(bp.id, bp);
        return bp;
    }

    /**
     * Remove breakpoint.
     * ADP-001: sends -break-delete to GDB so the breakpoint is actually removed.
     */
    async removeBreakpoint(id: string): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] Removing breakpoint:', id);
        await this.mi2.sendCommand(`-break-delete ${id}`);
        this.breakpoints.delete(id);
    }

    /**
     * Get all breakpoints
     */
    async getBreakpoints(): Promise<Breakpoint[]> {
        return Array.from(this.breakpoints.values());
    }

    /**
     * Get stack trace
     */
    async getStackTrace(threadId?: number): Promise<StackFrame[]> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Getting stack trace');

        const cmd = threadId ? `-stack-list-frames --thread ${threadId}` : '-stack-list-frames';
        const result = await this.mi2.sendCommand(cmd);
        this.log(`stack-list-frames results: ${JSON.stringify(result.resultData, null, 2)}`);

        if (!result.resultData || !result.resultData.stack) {
            return [];
        }

        return result.resultData.stack.map((frame: any) => ({
            id: parseInt(frame.level) || 0,
            name: frame.func || '??',
            path: frame.fullname || frame.file || '',
            line: parseInt(frame.line) || 0,
            column: 0
        }));
    }

    /**
     * Get variables in current frame
     */
    async getVariables(frameId?: number): Promise<Variable[]> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Getting variables');

        if (frameId !== undefined) {
            await this.mi2.sendCommand(`-stack-select-frame ${frameId}`);
        }

        const result = await this.mi2.sendCommand('-stack-list-locals 1');
        this.log(`stack-list-locals results: ${JSON.stringify(result.resultData, null, 2)}`);

        if (!result.resultData || !result.resultData.locals) {
            return [];
        }

        return result.resultData.locals.map((local: any) => ({
            name: local.name || 'unknown',
            value: local.value || 'undefined',
            type: local.type || 'unknown',
            children: 0
        }));
    }

    /**
     * Get function arguments
     */
    async getArguments(frameId?: number): Promise<Variable[]> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Getting arguments');

        const targetFrame = frameId ?? this.currentFrameId ?? 0;
        await this.mi2.sendCommand(`-stack-select-frame ${targetFrame}`);

        // Query args for this specific frame only
        const result = await this.mi2.sendCommand(`-stack-list-arguments 1 ${targetFrame} ${targetFrame}`);

        if (!result.resultData || !result.resultData['stack-args']) {
            return [];
        }

        const frameArgs = result.resultData['stack-args'][0];
        if (!frameArgs || !frameArgs.args) return [];

        return frameArgs.args.map((arg: any) => ({
            name: arg.name || 'unknown',
            value: arg.value || 'undefined',
            type: arg.type || 'unknown',
            children: 0
        }));
    }

    /**
     * Get global variables
     */
    async getGlobals(): Promise<Variable[]> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] Getting globals');

        const consoleStr = await this.executeStatement('info variables');
        if (!consoleStr) return [];

        const vars: Variable[] = [];
        const lines = consoleStr.split('\n');
        for (const line of lines) {
            // Parses lines like "33: uint32 iteration;"
            const match = line.match(/^\d+:\s+(.*?)\s+([a-zA-Z0-9_]+)(\[.+\])?;/);
            if (match) {
                vars.push({
                    name: match[2].trim(),
                    value: '<use evaluate>',
                    type: match[1].trim(),
                    children: 0
                });
            }
        }
        return vars;
    }

    /**
     * Evaluate expression
     */
    async evaluate(expression: string, frameId?: number): Promise<Variable> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Evaluating:', expression);

        const targetFrame = frameId ?? this.currentFrameId;
        if (targetFrame !== undefined) {
            await this.mi2.sendCommand(`-stack-select-frame ${targetFrame}`);
        }

        const result = await this.mi2.sendCommand(`-data-evaluate-expression "${expression}"`);

        return {
            name: expression,
            value: result.resultData?.value || 'undefined',
            type: result.resultData?.type || 'unknown',
            variablesReference: 0,
            children: 0
        };
    }

    /**
     * Get CPU registers
     */
    async getRegisters(): Promise<Variable[]> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Getting registers');

        const result = await this.mi2.sendCommand('-data-list-register-values x');

        if (!result.resultData || !result.resultData['register-values']) {
            return [];
        }

        return result.resultData['register-values'].map((reg: any) => ({
            name: `r${reg.number}`,
            value: reg.value,
            type: 'hex',
            children: 0
        }));
    }

    /**
     * Read memory.
     * ADP-022: enforces a 64KB maximum to prevent OOM via large length values.
     */
    async readMemory(address: number, length: number): Promise<Buffer> {
        if (!this.mi2) throw new Error('GDB not initialized');
        if (length > 65536) {
            throw new Error('Memory read length exceeds maximum (64KB)');
        }

        console.log('[GDBBackend] Reading memory at 0x' + address.toString(16));

        const result = await this.mi2.sendCommand(
            `-data-read-memory-bytes "0x${address.toString(16)}" ${length}`
        );

        if (!result.resultData || !result.resultData.memory) {
            return Buffer.alloc(length);
        }

        const memory = result.resultData.memory[0];
        const contents = memory.contents || '';
        const hex = contents.replace(/ /g, '');
        return Buffer.from(hex, 'hex');
    }

    /**
     * Write memory
     */
    async writeMemory(address: number, data: Buffer): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');

        console.log('[GDBBackend] Writing memory at 0x' + address.toString(16));

        const hex = data.toString('hex');
        await this.mi2.sendCommand(
            `-interpreter-exec console "set {char[${data.length}]} 0x${address.toString(16)} = 0x${hex}"`
        );
    }

    /**
     * Get last stop information
     */
    async getLastStopInfo(): Promise<StopEvent> {
        console.log('[GDBBackend] Getting last stop info');

        if (this.lastStopEvent) {
            return this.lastStopEvent;
        }

        const frames = await this.getStackTrace();

        return {
            reason: 'pause',
            threadId: 1,
            allThreadsStopped: true,
            frame: frames[0]
        };
    }

    /**
     * List all threads in the debuggee.
     */
    async listThreads(): Promise<ThreadInfo[]> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] Listing threads');

        const result = await this.mi2.sendCommand('-thread-info');
        const threads = result.resultData?.threads || [];

        return threads.map((t: any) => {
            const parsed = parseInt(t.id, 10);
            return {
            id: isNaN(parsed) ? 1 : parsed,
            name: t['target-id'] || t.name || `Thread ${t.id}`,
            state: t.state || 'stopped',
            frame: t.frame ? {
                id: 0,
                name: t.frame.func || '??',
                path: t.frame.fullname || t.frame.file || '',
                line: parseInt(t.frame.line) || 0,
                column: 0
            } : undefined
            };
        });
    }

    /**
     * Switch debugger focus to a specific thread.
     */
    async switchThread(threadId: number): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log(`[GDBBackend] Switching to thread ${threadId}`);
        await this.mi2.sendCommand(`-thread-select ${threadId}`);
        // Reset frame context: new thread starts at its top frame (0)
        this.currentFrameId = 0;
    }

    /**
     * Get debugger capabilities
     */
    getCapabilities(): DebuggerCapabilities {
        return {
            supportsLaunch: true,
            supportsAttach: true,
            supportsHardwareBreakpoints: false,
            supportsWatchpoints: true,
            supportsTrace: false,
            supportsMultiCore: false,
            supportsThreads: true,
            supportedArchitectures: ['x86_64', 'i386', 'arm', 'arm64'],
            supportedTargets: ['linux', 'windows', 'qemu']
        };
    }

    /**
     * Restart debug session
     */
    async restart(): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] Restarting session');
        await this.mi2.sendCommand('-exec-run');
    }

    /**
     * Frame up (toward caller).
     * ADP-002: increments currentFrameId and sends absolute frame number.
     * GDB MI does not support +1/-1 relative syntax.
     */
    async frameUp(): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');
        this.currentFrameId++;
        console.log('[GDBBackend] Frame up →', this.currentFrameId);
        await this.mi2.sendCommand(`-stack-select-frame ${this.currentFrameId}`);
    }

    /**
     * Frame down (toward callee).
     * ADP-002: decrements currentFrameId (floor 0) and sends absolute frame number.
     */
    async frameDown(): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');
        if (this.currentFrameId > 0) this.currentFrameId--;
        console.log('[GDBBackend] Frame down →', this.currentFrameId);
        await this.mi2.sendCommand(`-stack-select-frame ${this.currentFrameId}`);
    }

    /**
     * Go to specific frame.
     * ADP-002: also updates currentFrameId so subsequent up/down are relative to this.
     */
    async gotoFrame(frameId: number): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');
        this.currentFrameId = frameId;
        console.log('[GDBBackend] Go to frame:', frameId);
        await this.mi2.sendCommand(`-stack-select-frame ${frameId}`);
    }

    /**
     * Set temporary breakpoint.
     * ADP-006: use GDB number as ID; ADP-007: parse verified from response.
     */
    async setTempBreakpoint(location: SourceLocation): Promise<Breakpoint> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] Set temp breakpoint at', location);
        const result = await this.mi2.sendCommand(
            `-break-insert -t ${this.escapePath(location.path)}:${location.line}`
        );
        const bkpt = result.resultData?.bkpt;
        const gdbNumber = bkpt?.number ? String(bkpt.number) : `tmp-${Date.now()}`;
        return {
            id: gdbNumber,
            verified: bkpt?.enabled === 'y',
            line: bkpt?.line ? parseInt(bkpt.line) : location.line,
            file: bkpt?.fullname || bkpt?.file || location.path
        };
    }

    /**
     * Remove all breakpoints in file
     */
    async removeAllBreakpointsInFile(filePath: string): Promise<void> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] Remove all breakpoints in', filePath);
        
        const result = await this.mi2.sendCommand('-break-list');
        if (!result.resultData?.BreakpointTable?.body) return;
        
        const bps = result.resultData.BreakpointTable.body;
        for (const bp of bps) {
            const bpFile = bp[4] || bp.file || '';
            if (bpFile.includes(filePath)) {
                const bpNumber = bp[0] || bp.number;
                await this.mi2.sendCommand(`-break-delete ${bpNumber}`);
            }
        }
    }

    /**
     * List source code
     */
    async listSource(params?: any): Promise<string> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] List source');

        const linesAround = params?.linesAround ?? 10;
        const frameId = params?.frameId ?? this.currentFrameId;

        if (frameId !== undefined) {
            await this.mi2.sendCommand(`-stack-select-frame ${frameId}`);
            // Get the actual file+line for this frame so list shows the right source
            const frameInfo = await this.mi2.sendCommand('-stack-info-frame');
            const file = frameInfo.resultData?.frame?.fullname || frameInfo.resultData?.frame?.file;
            const line = parseInt(frameInfo.resultData?.frame?.line ?? '0');
            if (file && line) {
                const start = Math.max(1, line - Math.floor(linesAround / 2));
                const end = line + Math.ceil(linesAround / 2);
                const result = await this.mi2.sendCommand(
                    `-interpreter-exec console "list ${file}:${start},${file}:${end}"`
                );
                return result.resultData?.consoleOutput || result.resultData?.value || '';
            }
        }

        // Fallback: list around current PC
        const result = await this.mi2.sendCommand('-interpreter-exec console "list"');
        return result.resultData?.consoleOutput || result.resultData?.value || '';
    }

    /**
     * Get source info
     */
    async getSource(expression: string): Promise<string> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] Get source:', expression);
        const result = await this.mi2.sendCommand('-interpreter-exec console "info source"');
        return result.resultData?.consoleOutput || result.resultData?.value || '';
    }

    /**
     * Pretty print expression
     */
    async prettyPrint(expression: string): Promise<Variable> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] Pretty print:', expression);
        const result = await this.mi2.sendCommand(`-data-evaluate-expression "${expression}"`);
        return {
            name: expression,
            value: result.resultData?.value || 'undefined',
            type: result.resultData?.type || 'unknown'
        };
    }

    /**
     * Whatis - get type of expression
     */
    async whatis(expression: string): Promise<string> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] Whatis:', expression);
        // Use -var-create to get structured type info (avoids interpreter-exec console timing issue)
        const varName = `wt${Date.now()}`; // GDB requires varobj name to start with a letter
        try {
            // Note: expression is NOT quoted — GDB reads to end of line
            const createResult = await this.mi2.sendCommand(`-var-create ${varName} * ${expression}`);
            const type = createResult.resultData?.type || '';
            await this.mi2.sendCommand(`-var-delete ${varName}`);
            return type ? `type = ${type}` : '';
        } catch {
            // Fallback: interpreter-exec (may return empty on some GDB versions)
            const result = await this.mi2.sendCommand(`-interpreter-exec console "whatis ${expression}"`);
            return result.resultData?.consoleOutput || result.resultData?.value || '';
        }
    }

    /**
     * Execute statement
     */
    async executeStatement(statement: string): Promise<string> {
        if (!this.mi2) throw new Error('GDB not initialized');
        console.log('[GDBBackend] Execute statement:', statement);
        const result = await this.mi2.sendCommand(`-interpreter-exec console "${statement}"`);
        return result.resultData?.consoleOutput || result.resultData?.value || '';
    }

    /**
     * List all locals (alias for getVariables)
     */
    async listAllLocals(): Promise<Variable[]> {
        return this.getVariables();
    }

    /**
     * Get scope preview (locals + args)
     */
    async getScopePreview(): Promise<any> {
        const locals = await this.getVariables();
        const args = await this.getArguments();
        return { locals, args };
    }
}
