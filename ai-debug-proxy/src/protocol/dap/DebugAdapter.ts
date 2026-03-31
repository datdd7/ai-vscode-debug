/**
 * @file DebugAdapter.ts
 * @brief Debug Adapter Protocol (DAP) Server
 * 
 * Implements VS Code Debug Adapter Protocol.
 * Extends LoggingDebugSession from @vscode/debugadapter.
 * Routes DAP requests to IDebugBackend via BackendManager.
 */

import {
    Logger,
    LoggingDebugSession,
    InitializedEvent,
    TerminatedEvent,
    StoppedEvent,
    ContinuedEvent,
    OutputEvent,
    Thread,
    StackFrame,
    Scope,
    Source,
    Handles,
    Variable,
    Breakpoint
} from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import * as fs from 'fs';
import * as path from 'path';

import { backendManager } from '../../backend/BackendManager';
import { IDebugBackend, StopEvent, StackFrame as BackendStackFrame, ThreadInfo } from '../../core/IDebugBackend';

// ADP-003: portable path relative to compiled output directory
const LOG_FILE = path.join(__dirname, '..', 'proxy.log');

/**
 * Launch request arguments
 */
interface ILaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    program: string;
    cwd?: string;
    stopOnEntry?: boolean;
    gdbPath?: string;
    backendType?: 'gdb' | 'lauterbach';
}

/**
 * Attach request arguments
 */
interface IAttachRequestArguments extends DebugProtocol.AttachRequestArguments {
    processId: number;
    gdbPath?: string;
}

/**
 * AI Debug Session
 * 
 * Handles all VS Code DAP requests and routes them to the backend.
 */
export class AIDebugSession extends LoggingDebugSession {
    private static THREAD_ID = 1;
    private variableHandles = new Handles<string>();
    private breakpointIdMap = new Map<number, string>();
    private backend?: IDebugBackend;
    private isRunning = false;
    private stopRequested = false;

    constructor() {
        super('ai-debug.debug');
        this.setDebuggerLinesStartAt1(true);
        this.setDebuggerColumnsStartAt1(true);
    }

    /**
     * Initialize debug adapter
     */
    protected initializeRequest(
        response: DebugProtocol.InitializeResponse,
        args: DebugProtocol.InitializeRequestArguments
    ): void {
        this.log(`Initialize request: ${JSON.stringify(args, null, 2)}`);

        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsConditionalBreakpoints = true;
        response.body.supportsHitConditionalBreakpoints = true;
        response.body.supportsEvaluateForHovers = true;
        response.body.supportsGotoTargetsRequest = true;
        response.body.supportsRestartRequest = true;
        response.body.supportsDisassembleRequest = true;
        response.body.supportsReadMemoryRequest = true;
        response.body.supportsWriteMemoryRequest = true;
        response.body.supportsSetVariable = true;
        response.body.supportsTerminateRequest = true;
        response.body.supportsSteppingGranularity = false;
        response.body.supportsInstructionBreakpoints = false;

        this.sendResponse(response);
        this.log('Initialize response sent');
    }

    /**
     * Launch debug session
     */
    protected async launchRequest(
        response: DebugProtocol.LaunchResponse,
        args: ILaunchRequestArguments
    ): Promise<void> {
        try {
            this.log(`Launch request: ${JSON.stringify(args, null, 2)}`);

            // Validate program exists
            if (!fs.existsSync(args.program)) {
                this.sendErrorResponse(response, { 
                    id: 1, 
                    format: `Program not found: ${args.program}` 
                });
                return;
            }

            // Create backend
            const config = {
                backendType: args.backendType || 'gdb',
                gdbPath: args.gdbPath || 'gdb'
            };

            this.backend = backendManager.createBackend(config.backendType, config);
            
            // Wire up backend events BEFORE initializing
            this.setupBackendEvents();
            
            await this.backend.initialize(config);

            // Launch program
            await this.backend.launch({
                program: args.program,
                cwd: args.cwd,
                stopOnEntry: args.stopOnEntry ?? true
            });

            // Send initialized event
            this.sendEvent(new InitializedEvent());
            this.sendResponse(response);
            this.log('Launch complete');
        } catch (error: any) {
            this.log(`Launch error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 2, 
                format: error.message 
            });
        }
    }

    /**
     * Setup backend event listeners
     */
    private setupBackendEvents(): void {
        if (!this.backend) return;

        // Listen for stopped events and forward to VS Code
        this.backend.on('stopped', (event: StopEvent) => {
            this.log(`Backend stopped event: ${event.reason}`);
            this.sendEvent(new StoppedEvent(event.reason, event.threadId));
        });

        // Listen for running events
        this.backend.on('running', () => {
            this.log('Backend running event');
            this.isRunning = true;
            this.sendEvent(new ContinuedEvent(AIDebugSession.THREAD_ID));
        });

        // Listen for exited events
        this.backend.on('exited', (code: number) => {
            this.log(`Backend exited with code: ${code}`);
            this.isRunning = false;
            this.sendEvent(new TerminatedEvent());
        });

        // Listen for output events
        this.backend.on('output', (output: string, category: 'console' | 'stdout' | 'stderr') => {
            this.sendEvent(new OutputEvent(output, category));
        });
    }

    /**
     * Attach to running process
     */
    protected async attachRequest(
        response: DebugProtocol.AttachResponse,
        args: IAttachRequestArguments
    ): Promise<void> {
        try {
            this.log(`Attach request: PID ${args.processId}`);

            const config = {
                backendType: 'gdb' as const,
                gdbPath: args.gdbPath || 'gdb'
            };

            this.backend = backendManager.createBackend(config.backendType, config);
            await this.backend.initialize(config);

            await this.backend.attach({
                processId: args.processId
            });

            this.sendEvent(new InitializedEvent());
            this.sendResponse(response);
            this.log('Attach complete');
        } catch (error: any) {
            this.log(`Attach error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 3, 
                format: error.message 
            });
        }
    }

    /**
     * Continue execution
     */
    protected async continueRequest(
        response: DebugProtocol.ContinueResponse,
        args: DebugProtocol.ContinueArguments
    ): Promise<void> {
        try {
            this.log('Continue request');

            if (!this.backend) {
                this.sendErrorResponse(response, { 
                    id: 4, 
                    format: 'Debugger not initialized' 
                });
                return;
            }

            // Start execution - returns immediately
            await this.backend.continue();
            this.isRunning = true;

            // Send response immediately (DAP spec requirement)
            this.sendResponse(response);
            this.log('Continue response sent - execution running');
        } catch (error: any) {
            this.log(`Continue error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 5, 
                format: error.message 
            });
        }
    }

    /**
     * Step over (next line)
     */
    protected async nextRequest(
        response: DebugProtocol.NextResponse,
        args: DebugProtocol.NextArguments
    ): Promise<void> {
        try {
            this.log('Next request');

            if (!this.backend) {
                this.sendErrorResponse(response, { 
                    id: 6, 
                    format: 'Debugger not initialized' 
                });
                return;
            }

            // Start stepping - returns immediately
            await this.backend.stepOver();

            // Send response immediately (DAP spec requirement)
            this.sendResponse(response);
            this.log('Next response sent - stepping running');
        } catch (error: any) {
            this.log(`Next error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 7, 
                format: error.message 
            });
        }
    }

    /**
     * Step into function
     */
    protected async stepInRequest(
        response: DebugProtocol.StepInResponse,
        args: DebugProtocol.StepInArguments
    ): Promise<void> {
        try {
            this.log('Step in request');

            if (!this.backend) {
                this.sendErrorResponse(response, { 
                    id: 8, 
                    format: 'Debugger not initialized' 
                });
                return;
            }

            // Start stepping - returns immediately
            await this.backend.stepIn();

            // Send response immediately
            this.sendResponse(response);
            this.log('Step in response sent');
        } catch (error: any) {
            this.log(`Step in error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 9, 
                format: error.message 
            });
        }
    }

    /**
     * Step out of function
     */
    protected async stepOutRequest(
        response: DebugProtocol.StepOutResponse,
        args: DebugProtocol.StepOutArguments
    ): Promise<void> {
        try {
            this.log('Step out request');

            if (!this.backend) {
                this.sendErrorResponse(response, { 
                    id: 10, 
                    format: 'Debugger not initialized' 
                });
                return;
            }

            // Start stepping - returns immediately
            await this.backend.stepOut();

            // Send response immediately
            this.sendResponse(response);
            this.log('Step out response sent');
        } catch (error: any) {
            this.log(`Step out error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 11, 
                format: error.message 
            });
        }
    }

    /**
     * Set breakpoints
     */
    protected async setBreakpointsRequest(
        response: DebugProtocol.SetBreakpointsResponse,
        args: DebugProtocol.SetBreakpointsArguments
    ): Promise<void> {
        try {
            this.log(`Set breakpoints: ${JSON.stringify(args, null, 2)}`);

            if (!this.backend) {
                this.sendErrorResponse(response, { 
                    id: 12, 
                    format: 'Debugger not initialized' 
                });
                return;
            }

            const actualBreakpoints: Breakpoint[] = [];
            const sourcePath = args.source.path || '';

            for (const sourceBp of (args.breakpoints || [])) {
                const result = await this.backend.setBreakpoint({
                    path: sourcePath,
                    line: sourceBp.line
                });

                const dapId = Date.now() + Math.random();
                this.breakpointIdMap.set(dapId, result.id);

                const bp = new Breakpoint(
                    result.verified,
                    sourceBp.line,
                    undefined,
                    args.source as Source
                );
                (bp as any).id = dapId;
                actualBreakpoints.push(bp);
            }

            response.body = { breakpoints: actualBreakpoints };
            this.sendResponse(response);
            this.log('Set breakpoints complete');
        } catch (error: any) {
            this.log(`Set breakpoints error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 13, 
                format: error.message 
            });
        }
    }

    /**
     * Get stack trace
     */
    protected async stackTraceRequest(
        response: DebugProtocol.StackTraceResponse,
        args: DebugProtocol.StackTraceArguments
    ): Promise<void> {
        try {
            this.log('Stack trace request');

            if (!this.backend) {
                this.sendErrorResponse(response, { 
                    id: 14, 
                    format: 'Debugger not initialized' 
                });
                return;
            }

            const frames = await this.backend.getStackTrace(args.threadId);

            const stackFrames: StackFrame[] = frames.map((frame: any) => ({
                id: frame.id,
                name: frame.name,
                source: {
                    name: frame.path?.split('/').pop(),
                    path: frame.path
                } as Source,
                line: frame.line,
                column: frame.column || 0
            } as StackFrame));

            response.body = {
                stackFrames: stackFrames,
                totalFrames: stackFrames.length
            };
            this.log(`Stack trace response: ${JSON.stringify(response.body, null, 2)}`);
            this.sendResponse(response);
            this.log('Stack trace complete');
        } catch (error: any) {
            this.log(`Stack trace error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 15, 
                format: error.message 
            });
        }
    }

    /**
     * Get scopes
     */
    protected async scopesRequest(
        response: DebugProtocol.ScopesResponse,
        args: DebugProtocol.ScopesArguments
    ): Promise<void> {
        try {
            this.log('Scopes request');

            const scopes: Scope[] = [
                new Scope('Locals', this.variableHandles.create('locals'), false),
                new Scope('Arguments', this.variableHandles.create('arguments'), false),
                new Scope('Globals', this.variableHandles.create('globals'), false)
            ];

            response.body = { scopes };
            this.log(`Scopes response: ${JSON.stringify(response.body, null, 2)}`);
            this.sendResponse(response);
            this.log('Scopes complete');
        } catch (error: any) {
            this.log(`Scopes error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 16, 
                format: error.message 
            });
        }
    }

    /**
     * Get variables
     */
    protected async variablesRequest(
        response: DebugProtocol.VariablesResponse,
        args: DebugProtocol.VariablesArguments
    ): Promise<void> {
        try {
            this.log('Variables request');

            if (!this.backend) {
                this.sendErrorResponse(response, { 
                    id: 17, 
                    format: 'Debugger not initialized' 
                });
                return;
            }

            const scopeType = this.variableHandles.get(args.variablesReference);
            let variables: Variable[] = [];

            if (scopeType === 'locals') {
                const vars = await this.backend.getVariables();
                variables = vars.map((v: any) => new Variable(v.name, v.value || 'undefined'));
            } else if (scopeType === 'arguments') {
                const vars = await this.backend.getArguments();
                variables = vars.map((v: any) => new Variable(v.name, v.value || 'undefined'));
            } else if (scopeType === 'globals') {
                const vars = await this.backend.getGlobals();
                variables = vars.map((v: any) => new Variable(v.name, v.value || 'undefined'));
            }

            response.body = { variables };
            this.log(`Variables response: ${JSON.stringify(response.body, null, 2)}`);
            this.sendResponse(response);
            this.log('Variables complete');
        } catch (error: any) {
            this.log(`Variables error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 18, 
                format: error.message 
            });
        }
    }

    /**
     * Evaluate expression
     */
    protected async evaluateRequest(
        response: DebugProtocol.EvaluateResponse,
        args: DebugProtocol.EvaluateArguments
    ): Promise<void> {
        try {
            this.log(`Evaluate request: ${args.expression}`);

            if (!this.backend) {
                this.sendErrorResponse(response, { 
                    id: 19, 
                    format: 'Debugger not initialized' 
                });
                return;
            }

            const result = await this.backend.evaluate(args.expression, args.frameId);

            response.body = {
                result: result.value,
                type: result.type,
                variablesReference: result.variablesReference || 0
            };
            this.sendResponse(response);
            this.log('Evaluate complete');
        } catch (error: any) {
            this.log(`Evaluate error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 20, 
                format: error.message 
            });
        }
    }

    /**
     * Restart session
     */
    protected async restartRequest(
        response: DebugProtocol.RestartResponse,
        args: DebugProtocol.RestartArguments
    ): Promise<void> {
        try {
            this.log('Restart request');

            if (this.backend) {
                await this.backend.terminate();
                this.backend = undefined;
            }

            this.sendResponse(response);
            this.log('Restart complete');
        } catch (error: any) {
            this.log(`Restart error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 21, 
                format: error.message 
            });
        }
    }

    /**
     * Terminate session
     */
    protected async terminateRequest(
        response: DebugProtocol.TerminateResponse,
        args: DebugProtocol.TerminateArguments
    ): Promise<void> {
        try {
            this.log('Terminate request');

            if (this.backend) {
                await backendManager.releaseBackend(); // terminate + clear currentBackend
                this.backend = undefined;
            }

            this.sendEvent(new TerminatedEvent());
            this.sendResponse(response);
            this.log('Terminate complete');
        } catch (error: any) {
            this.log(`Terminate error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 22, 
                format: error.message 
            });
        }
    }

    /**
     * Disconnect from debuggee
     */
    protected async disconnectRequest(
        response: DebugProtocol.DisconnectResponse,
        args: DebugProtocol.DisconnectArguments
    ): Promise<void> {
        try {
            this.log('Disconnect request');

            if (this.backend) {
                await backendManager.releaseBackend(); // terminate + clear currentBackend
                this.backend = undefined;
            }

            this.sendResponse(response);
            this.log('Disconnect complete');
        } catch (error: any) {
            this.log(`Disconnect error: ${error.message}`);
            this.sendErrorResponse(response, { 
                id: 23, 
                format: error.message 
            });
        }
    }

    /**
     * Get threads — queries backend for actual thread list.
     * Falls back to single hardcoded thread on error.
     */
    protected async threadsRequest(
        response: DebugProtocol.ThreadsResponse
    ): Promise<void> {
        this.log('Threads request');
        try {
            if (this.backend) {
                const threadInfos = await this.backend.listThreads();
                response.body = {
                    threads: threadInfos.map(t => new Thread(t.id, t.name))
                };
            } else {
                response.body = {
                    threads: [new Thread(AIDebugSession.THREAD_ID, 'Thread 1')]
                };
            }
        } catch {
            response.body = {
                threads: [new Thread(AIDebugSession.THREAD_ID, 'Thread 1')]
            };
        }
        this.sendResponse(response);
        this.log('Threads complete');
    }

    /**
     * Configuration done (all breakpoints set)
     */
    protected async configurationDoneRequest(
        response: DebugProtocol.ConfigurationDoneResponse,
        args: DebugProtocol.ConfigurationDoneArguments
    ): Promise<void> {
        this.log('Configuration done');
        this.sendResponse(response);
        
        // Start backend execution AFTER configuration is complete
        if (this.backend && !this.isRunning) {
            this.log('Starting backend execution');
            try {
                await this.backend.start();
                this.isRunning = true;
            } catch (error: any) {
                this.log(`Failed to start backend: ${error.message}`);
            }
        }
    }

    /**
     * Log helper
     */
    private log(message: string) {
        const logMsg = `[AIDebugSession][${new Date().toISOString()}] ${message}\n`;
        console.log(logMsg.trim());
        try {
            fs.appendFileSync(LOG_FILE, logMsg);
        } catch (e) {
            // ignore
        }
    }
}

// Register debug session type (removed standalone run() for inline implementation)
// AIDebugSession.run(AIDebugSession);
