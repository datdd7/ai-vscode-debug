"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@vscode/debugadapter/lib/messages.js
var require_messages = __commonJS({
  "node_modules/@vscode/debugadapter/lib/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Event = exports2.Response = exports2.Message = void 0;
    var Message = class {
      constructor(type) {
        this.seq = 0;
        this.type = type;
      }
    };
    exports2.Message = Message;
    var Response = class extends Message {
      constructor(request, message) {
        super("response");
        this.request_seq = request.seq;
        this.command = request.command;
        if (message) {
          this.success = false;
          this.message = message;
        } else {
          this.success = true;
        }
      }
    };
    exports2.Response = Response;
    var Event = class extends Message {
      constructor(event, body) {
        super("event");
        this.event = event;
        if (body) {
          this.body = body;
        }
      }
    };
    exports2.Event = Event;
  }
});

// node_modules/@vscode/debugadapter/lib/protocol.js
var require_protocol = __commonJS({
  "node_modules/@vscode/debugadapter/lib/protocol.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProtocolServer = void 0;
    var ee = require("events");
    var messages_1 = require_messages();
    var Emitter = class {
      get event() {
        if (!this._event) {
          this._event = (listener, thisArg) => {
            this._listener = listener;
            this._this = thisArg;
            let result;
            result = {
              dispose: () => {
                this._listener = void 0;
                this._this = void 0;
              }
            };
            return result;
          };
        }
        return this._event;
      }
      fire(event) {
        if (this._listener) {
          try {
            this._listener.call(this._this, event);
          } catch (e) {
          }
        }
      }
      hasListener() {
        return !!this._listener;
      }
      dispose() {
        this._listener = void 0;
        this._this = void 0;
      }
    };
    var ProtocolServer = class _ProtocolServer extends ee.EventEmitter {
      constructor() {
        super();
        this._sendMessage = new Emitter();
        this._sequence = 1;
        this._pendingRequests = /* @__PURE__ */ new Map();
        this.onDidSendMessage = this._sendMessage.event;
      }
      // ---- implements vscode.Debugadapter interface ---------------------------
      dispose() {
      }
      handleMessage(msg) {
        if (msg.type === "request") {
          this.dispatchRequest(msg);
        } else if (msg.type === "response") {
          const response = msg;
          const clb = this._pendingRequests.get(response.request_seq);
          if (clb) {
            this._pendingRequests.delete(response.request_seq);
            clb(response);
          }
        }
      }
      _isRunningInline() {
        return this._sendMessage && this._sendMessage.hasListener();
      }
      //--------------------------------------------------------------------------
      start(inStream, outStream) {
        this._writableStream = outStream;
        this._rawData = Buffer.alloc(0);
        inStream.on("data", (data) => this._handleData(data));
        inStream.on("close", () => {
          this._emitEvent(new messages_1.Event("close"));
        });
        inStream.on("error", (error) => {
          this._emitEvent(new messages_1.Event("error", "inStream error: " + (error && error.message)));
        });
        outStream.on("error", (error) => {
          this._emitEvent(new messages_1.Event("error", "outStream error: " + (error && error.message)));
        });
        inStream.resume();
      }
      stop() {
        if (this._writableStream) {
          this._writableStream.end();
        }
      }
      sendEvent(event) {
        this._send("event", event);
      }
      sendResponse(response) {
        if (response.seq > 0) {
          console.error(`attempt to send more than one response for command ${response.command}`);
        } else {
          this._send("response", response);
        }
      }
      sendRequest(command, args, timeout, cb) {
        const request = {
          command
        };
        if (args && Object.keys(args).length > 0) {
          request.arguments = args;
        }
        this._send("request", request);
        if (cb) {
          this._pendingRequests.set(request.seq, cb);
          const timer = setTimeout(() => {
            clearTimeout(timer);
            const clb = this._pendingRequests.get(request.seq);
            if (clb) {
              this._pendingRequests.delete(request.seq);
              clb(new messages_1.Response(request, "timeout"));
            }
          }, timeout);
        }
      }
      // ---- protected ----------------------------------------------------------
      dispatchRequest(request) {
      }
      // ---- private ------------------------------------------------------------
      _emitEvent(event) {
        this.emit(event.event, event);
      }
      _send(typ, message) {
        message.type = typ;
        message.seq = this._sequence++;
        if (this._writableStream) {
          const json = JSON.stringify(message);
          this._writableStream.write(`Content-Length: ${Buffer.byteLength(json, "utf8")}\r
\r
${json}`, "utf8");
        }
        this._sendMessage.fire(message);
      }
      _handleData(data) {
        this._rawData = Buffer.concat([this._rawData, data]);
        while (true) {
          if (this._contentLength >= 0) {
            if (this._rawData.length >= this._contentLength) {
              const message = this._rawData.toString("utf8", 0, this._contentLength);
              this._rawData = this._rawData.slice(this._contentLength);
              this._contentLength = -1;
              if (message.length > 0) {
                try {
                  let msg = JSON.parse(message);
                  this.handleMessage(msg);
                } catch (e) {
                  this._emitEvent(new messages_1.Event("error", "Error handling data: " + (e && e.message)));
                }
              }
              continue;
            }
          } else {
            const idx = this._rawData.indexOf(_ProtocolServer.TWO_CRLF);
            if (idx !== -1) {
              const header = this._rawData.toString("utf8", 0, idx);
              const lines = header.split("\r\n");
              for (let i = 0; i < lines.length; i++) {
                const pair = lines[i].split(/: +/);
                if (pair[0] == "Content-Length") {
                  this._contentLength = +pair[1];
                }
              }
              this._rawData = this._rawData.slice(idx + _ProtocolServer.TWO_CRLF.length);
              continue;
            }
          }
          break;
        }
      }
    };
    exports2.ProtocolServer = ProtocolServer;
    ProtocolServer.TWO_CRLF = "\r\n\r\n";
  }
});

// node_modules/@vscode/debugadapter/lib/runDebugAdapter.js
var require_runDebugAdapter = __commonJS({
  "node_modules/@vscode/debugadapter/lib/runDebugAdapter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.runDebugAdapter = void 0;
    var Net = require("net");
    function runDebugAdapter(debugSession) {
      let port = 0;
      const args = process.argv.slice(2);
      args.forEach(function(val, index, array) {
        const portMatch = /^--server=(\d{4,5})$/.exec(val);
        if (portMatch) {
          port = parseInt(portMatch[1], 10);
        }
      });
      if (port > 0) {
        console.error(`waiting for debug protocol on port ${port}`);
        Net.createServer((socket) => {
          console.error(">> accepted connection from client");
          socket.on("end", () => {
            console.error(">> client connection closed\n");
          });
          const session = new debugSession(false, true);
          session.setRunAsServer(true);
          session.start(socket, socket);
        }).listen(port);
      } else {
        const session = new debugSession(false);
        process.on("SIGTERM", () => {
          session.shutdown();
        });
        session.start(process.stdin, process.stdout);
      }
    }
    exports2.runDebugAdapter = runDebugAdapter;
  }
});

// node_modules/@vscode/debugadapter/lib/debugSession.js
var require_debugSession = __commonJS({
  "node_modules/@vscode/debugadapter/lib/debugSession.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DebugSession = exports2.ErrorDestination = exports2.MemoryEvent = exports2.InvalidatedEvent = exports2.ProgressEndEvent = exports2.ProgressUpdateEvent = exports2.ProgressStartEvent = exports2.CapabilitiesEvent = exports2.LoadedSourceEvent = exports2.ModuleEvent = exports2.BreakpointEvent = exports2.ThreadEvent = exports2.OutputEvent = exports2.ExitedEvent = exports2.TerminatedEvent = exports2.InitializedEvent = exports2.ContinuedEvent = exports2.StoppedEvent = exports2.CompletionItem = exports2.Module = exports2.Breakpoint = exports2.Variable = exports2.Thread = exports2.StackFrame = exports2.Scope = exports2.Source = void 0;
    var protocol_1 = require_protocol();
    var messages_1 = require_messages();
    var runDebugAdapter_1 = require_runDebugAdapter();
    var url_1 = require("url");
    var Source2 = class {
      constructor(name, path3, id = 0, origin, data) {
        this.name = name;
        this.path = path3;
        this.sourceReference = id;
        if (origin) {
          this.origin = origin;
        }
        if (data) {
          this.adapterData = data;
        }
      }
    };
    exports2.Source = Source2;
    var Scope2 = class {
      constructor(name, reference, expensive = false) {
        this.name = name;
        this.variablesReference = reference;
        this.expensive = expensive;
      }
    };
    exports2.Scope = Scope2;
    var StackFrame2 = class {
      constructor(i, nm, src, ln = 0, col = 0) {
        this.id = i;
        this.source = src;
        this.line = ln;
        this.column = col;
        this.name = nm;
      }
    };
    exports2.StackFrame = StackFrame2;
    var Thread2 = class {
      constructor(id, name) {
        this.id = id;
        if (name) {
          this.name = name;
        } else {
          this.name = "Thread #" + id;
        }
      }
    };
    exports2.Thread = Thread2;
    var Variable2 = class {
      constructor(name, value, ref = 0, indexedVariables, namedVariables) {
        this.name = name;
        this.value = value;
        this.variablesReference = ref;
        if (typeof namedVariables === "number") {
          this.namedVariables = namedVariables;
        }
        if (typeof indexedVariables === "number") {
          this.indexedVariables = indexedVariables;
        }
      }
    };
    exports2.Variable = Variable2;
    var Breakpoint2 = class {
      constructor(verified, line, column, source) {
        this.verified = verified;
        const e = this;
        if (typeof line === "number") {
          e.line = line;
        }
        if (typeof column === "number") {
          e.column = column;
        }
        if (source) {
          e.source = source;
        }
      }
      setId(id) {
        this.id = id;
      }
    };
    exports2.Breakpoint = Breakpoint2;
    var Module = class {
      constructor(id, name) {
        this.id = id;
        this.name = name;
      }
    };
    exports2.Module = Module;
    var CompletionItem = class {
      constructor(label, start, length = 0) {
        this.label = label;
        this.start = start;
        this.length = length;
      }
    };
    exports2.CompletionItem = CompletionItem;
    var StoppedEvent2 = class extends messages_1.Event {
      constructor(reason, threadId, exceptionText) {
        super("stopped");
        this.body = {
          reason
        };
        if (typeof threadId === "number") {
          this.body.threadId = threadId;
        }
        if (typeof exceptionText === "string") {
          this.body.text = exceptionText;
        }
      }
    };
    exports2.StoppedEvent = StoppedEvent2;
    var ContinuedEvent2 = class extends messages_1.Event {
      constructor(threadId, allThreadsContinued) {
        super("continued");
        this.body = {
          threadId
        };
        if (typeof allThreadsContinued === "boolean") {
          this.body.allThreadsContinued = allThreadsContinued;
        }
      }
    };
    exports2.ContinuedEvent = ContinuedEvent2;
    var InitializedEvent2 = class extends messages_1.Event {
      constructor() {
        super("initialized");
      }
    };
    exports2.InitializedEvent = InitializedEvent2;
    var TerminatedEvent2 = class extends messages_1.Event {
      constructor(restart) {
        super("terminated");
        if (typeof restart === "boolean" || restart) {
          const e = this;
          e.body = {
            restart
          };
        }
      }
    };
    exports2.TerminatedEvent = TerminatedEvent2;
    var ExitedEvent = class extends messages_1.Event {
      constructor(exitCode) {
        super("exited");
        this.body = {
          exitCode
        };
      }
    };
    exports2.ExitedEvent = ExitedEvent;
    var OutputEvent2 = class extends messages_1.Event {
      constructor(output, category = "console", data) {
        super("output");
        this.body = {
          category,
          output
        };
        if (data !== void 0) {
          this.body.data = data;
        }
      }
    };
    exports2.OutputEvent = OutputEvent2;
    var ThreadEvent = class extends messages_1.Event {
      constructor(reason, threadId) {
        super("thread");
        this.body = {
          reason,
          threadId
        };
      }
    };
    exports2.ThreadEvent = ThreadEvent;
    var BreakpointEvent = class extends messages_1.Event {
      constructor(reason, breakpoint) {
        super("breakpoint");
        this.body = {
          reason,
          breakpoint
        };
      }
    };
    exports2.BreakpointEvent = BreakpointEvent;
    var ModuleEvent = class extends messages_1.Event {
      constructor(reason, module3) {
        super("module");
        this.body = {
          reason,
          module: module3
        };
      }
    };
    exports2.ModuleEvent = ModuleEvent;
    var LoadedSourceEvent = class extends messages_1.Event {
      constructor(reason, source) {
        super("loadedSource");
        this.body = {
          reason,
          source
        };
      }
    };
    exports2.LoadedSourceEvent = LoadedSourceEvent;
    var CapabilitiesEvent = class extends messages_1.Event {
      constructor(capabilities) {
        super("capabilities");
        this.body = {
          capabilities
        };
      }
    };
    exports2.CapabilitiesEvent = CapabilitiesEvent;
    var ProgressStartEvent = class extends messages_1.Event {
      constructor(progressId, title, message) {
        super("progressStart");
        this.body = {
          progressId,
          title
        };
        if (typeof message === "string") {
          this.body.message = message;
        }
      }
    };
    exports2.ProgressStartEvent = ProgressStartEvent;
    var ProgressUpdateEvent = class extends messages_1.Event {
      constructor(progressId, message) {
        super("progressUpdate");
        this.body = {
          progressId
        };
        if (typeof message === "string") {
          this.body.message = message;
        }
      }
    };
    exports2.ProgressUpdateEvent = ProgressUpdateEvent;
    var ProgressEndEvent = class extends messages_1.Event {
      constructor(progressId, message) {
        super("progressEnd");
        this.body = {
          progressId
        };
        if (typeof message === "string") {
          this.body.message = message;
        }
      }
    };
    exports2.ProgressEndEvent = ProgressEndEvent;
    var InvalidatedEvent = class extends messages_1.Event {
      constructor(areas, threadId, stackFrameId) {
        super("invalidated");
        this.body = {};
        if (areas) {
          this.body.areas = areas;
        }
        if (threadId) {
          this.body.threadId = threadId;
        }
        if (stackFrameId) {
          this.body.stackFrameId = stackFrameId;
        }
      }
    };
    exports2.InvalidatedEvent = InvalidatedEvent;
    var MemoryEvent = class extends messages_1.Event {
      constructor(memoryReference, offset, count) {
        super("memory");
        this.body = { memoryReference, offset, count };
      }
    };
    exports2.MemoryEvent = MemoryEvent;
    var ErrorDestination;
    (function(ErrorDestination2) {
      ErrorDestination2[ErrorDestination2["User"] = 1] = "User";
      ErrorDestination2[ErrorDestination2["Telemetry"] = 2] = "Telemetry";
    })(ErrorDestination = exports2.ErrorDestination || (exports2.ErrorDestination = {}));
    var DebugSession = class _DebugSession extends protocol_1.ProtocolServer {
      constructor(obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer) {
        super();
        const linesAndColumnsStartAt1 = typeof obsolete_debuggerLinesAndColumnsStartAt1 === "boolean" ? obsolete_debuggerLinesAndColumnsStartAt1 : false;
        this._debuggerLinesStartAt1 = linesAndColumnsStartAt1;
        this._debuggerColumnsStartAt1 = linesAndColumnsStartAt1;
        this._debuggerPathsAreURIs = false;
        this._clientLinesStartAt1 = true;
        this._clientColumnsStartAt1 = true;
        this._clientPathsAreURIs = false;
        this._isServer = typeof obsolete_isServer === "boolean" ? obsolete_isServer : false;
        this.on("close", () => {
          this.shutdown();
        });
        this.on("error", (error) => {
          this.shutdown();
        });
      }
      setDebuggerPathFormat(format) {
        this._debuggerPathsAreURIs = format !== "path";
      }
      setDebuggerLinesStartAt1(enable) {
        this._debuggerLinesStartAt1 = enable;
      }
      setDebuggerColumnsStartAt1(enable) {
        this._debuggerColumnsStartAt1 = enable;
      }
      setRunAsServer(enable) {
        this._isServer = enable;
      }
      /**
       * A virtual constructor...
       */
      static run(debugSession) {
        (0, runDebugAdapter_1.runDebugAdapter)(debugSession);
      }
      shutdown() {
        if (this._isServer || this._isRunningInline()) {
        } else {
          setTimeout(() => {
            process.exit(0);
          }, 100);
        }
      }
      sendErrorResponse(response, codeOrMessage, format, variables, dest = ErrorDestination.User) {
        let msg;
        if (typeof codeOrMessage === "number") {
          msg = {
            id: codeOrMessage,
            format
          };
          if (variables) {
            msg.variables = variables;
          }
          if (dest & ErrorDestination.User) {
            msg.showUser = true;
          }
          if (dest & ErrorDestination.Telemetry) {
            msg.sendTelemetry = true;
          }
        } else {
          msg = codeOrMessage;
        }
        response.success = false;
        response.message = _DebugSession.formatPII(msg.format, true, msg.variables);
        if (!response.body) {
          response.body = {};
        }
        response.body.error = msg;
        this.sendResponse(response);
      }
      runInTerminalRequest(args, timeout, cb) {
        this.sendRequest("runInTerminal", args, timeout, cb);
      }
      dispatchRequest(request) {
        const response = new messages_1.Response(request);
        try {
          if (request.command === "initialize") {
            var args = request.arguments;
            if (typeof args.linesStartAt1 === "boolean") {
              this._clientLinesStartAt1 = args.linesStartAt1;
            }
            if (typeof args.columnsStartAt1 === "boolean") {
              this._clientColumnsStartAt1 = args.columnsStartAt1;
            }
            if (args.pathFormat !== "path") {
              this.sendErrorResponse(response, 2018, "debug adapter only supports native paths", null, ErrorDestination.Telemetry);
            } else {
              const initializeResponse = response;
              initializeResponse.body = {};
              this.initializeRequest(initializeResponse, args);
            }
          } else if (request.command === "launch") {
            this.launchRequest(response, request.arguments, request);
          } else if (request.command === "attach") {
            this.attachRequest(response, request.arguments, request);
          } else if (request.command === "disconnect") {
            this.disconnectRequest(response, request.arguments, request);
          } else if (request.command === "terminate") {
            this.terminateRequest(response, request.arguments, request);
          } else if (request.command === "restart") {
            this.restartRequest(response, request.arguments, request);
          } else if (request.command === "setBreakpoints") {
            this.setBreakPointsRequest(response, request.arguments, request);
          } else if (request.command === "setFunctionBreakpoints") {
            this.setFunctionBreakPointsRequest(response, request.arguments, request);
          } else if (request.command === "setExceptionBreakpoints") {
            this.setExceptionBreakPointsRequest(response, request.arguments, request);
          } else if (request.command === "configurationDone") {
            this.configurationDoneRequest(response, request.arguments, request);
          } else if (request.command === "continue") {
            this.continueRequest(response, request.arguments, request);
          } else if (request.command === "next") {
            this.nextRequest(response, request.arguments, request);
          } else if (request.command === "stepIn") {
            this.stepInRequest(response, request.arguments, request);
          } else if (request.command === "stepOut") {
            this.stepOutRequest(response, request.arguments, request);
          } else if (request.command === "stepBack") {
            this.stepBackRequest(response, request.arguments, request);
          } else if (request.command === "reverseContinue") {
            this.reverseContinueRequest(response, request.arguments, request);
          } else if (request.command === "restartFrame") {
            this.restartFrameRequest(response, request.arguments, request);
          } else if (request.command === "goto") {
            this.gotoRequest(response, request.arguments, request);
          } else if (request.command === "pause") {
            this.pauseRequest(response, request.arguments, request);
          } else if (request.command === "stackTrace") {
            this.stackTraceRequest(response, request.arguments, request);
          } else if (request.command === "scopes") {
            this.scopesRequest(response, request.arguments, request);
          } else if (request.command === "variables") {
            this.variablesRequest(response, request.arguments, request);
          } else if (request.command === "setVariable") {
            this.setVariableRequest(response, request.arguments, request);
          } else if (request.command === "setExpression") {
            this.setExpressionRequest(response, request.arguments, request);
          } else if (request.command === "source") {
            this.sourceRequest(response, request.arguments, request);
          } else if (request.command === "threads") {
            this.threadsRequest(response, request);
          } else if (request.command === "terminateThreads") {
            this.terminateThreadsRequest(response, request.arguments, request);
          } else if (request.command === "evaluate") {
            this.evaluateRequest(response, request.arguments, request);
          } else if (request.command === "stepInTargets") {
            this.stepInTargetsRequest(response, request.arguments, request);
          } else if (request.command === "gotoTargets") {
            this.gotoTargetsRequest(response, request.arguments, request);
          } else if (request.command === "completions") {
            this.completionsRequest(response, request.arguments, request);
          } else if (request.command === "exceptionInfo") {
            this.exceptionInfoRequest(response, request.arguments, request);
          } else if (request.command === "loadedSources") {
            this.loadedSourcesRequest(response, request.arguments, request);
          } else if (request.command === "dataBreakpointInfo") {
            this.dataBreakpointInfoRequest(response, request.arguments, request);
          } else if (request.command === "setDataBreakpoints") {
            this.setDataBreakpointsRequest(response, request.arguments, request);
          } else if (request.command === "readMemory") {
            this.readMemoryRequest(response, request.arguments, request);
          } else if (request.command === "writeMemory") {
            this.writeMemoryRequest(response, request.arguments, request);
          } else if (request.command === "disassemble") {
            this.disassembleRequest(response, request.arguments, request);
          } else if (request.command === "cancel") {
            this.cancelRequest(response, request.arguments, request);
          } else if (request.command === "breakpointLocations") {
            this.breakpointLocationsRequest(response, request.arguments, request);
          } else if (request.command === "setInstructionBreakpoints") {
            this.setInstructionBreakpointsRequest(response, request.arguments, request);
          } else {
            this.customRequest(request.command, response, request.arguments, request);
          }
        } catch (e) {
          this.sendErrorResponse(response, 1104, "{_stack}", { _exception: e.message, _stack: e.stack }, ErrorDestination.Telemetry);
        }
      }
      initializeRequest(response, args) {
        response.body.supportsConditionalBreakpoints = false;
        response.body.supportsHitConditionalBreakpoints = false;
        response.body.supportsFunctionBreakpoints = false;
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsEvaluateForHovers = false;
        response.body.supportsStepBack = false;
        response.body.supportsSetVariable = false;
        response.body.supportsRestartFrame = false;
        response.body.supportsStepInTargetsRequest = false;
        response.body.supportsGotoTargetsRequest = false;
        response.body.supportsCompletionsRequest = false;
        response.body.supportsRestartRequest = false;
        response.body.supportsExceptionOptions = false;
        response.body.supportsValueFormattingOptions = false;
        response.body.supportsExceptionInfoRequest = false;
        response.body.supportTerminateDebuggee = false;
        response.body.supportsDelayedStackTraceLoading = false;
        response.body.supportsLoadedSourcesRequest = false;
        response.body.supportsLogPoints = false;
        response.body.supportsTerminateThreadsRequest = false;
        response.body.supportsSetExpression = false;
        response.body.supportsTerminateRequest = false;
        response.body.supportsDataBreakpoints = false;
        response.body.supportsReadMemoryRequest = false;
        response.body.supportsDisassembleRequest = false;
        response.body.supportsCancelRequest = false;
        response.body.supportsBreakpointLocationsRequest = false;
        response.body.supportsClipboardContext = false;
        response.body.supportsSteppingGranularity = false;
        response.body.supportsInstructionBreakpoints = false;
        response.body.supportsExceptionFilterOptions = false;
        this.sendResponse(response);
      }
      disconnectRequest(response, args, request) {
        this.sendResponse(response);
        this.shutdown();
      }
      launchRequest(response, args, request) {
        this.sendResponse(response);
      }
      attachRequest(response, args, request) {
        this.sendResponse(response);
      }
      terminateRequest(response, args, request) {
        this.sendResponse(response);
      }
      restartRequest(response, args, request) {
        this.sendResponse(response);
      }
      setBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      setFunctionBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      setExceptionBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      configurationDoneRequest(response, args, request) {
        this.sendResponse(response);
      }
      continueRequest(response, args, request) {
        this.sendResponse(response);
      }
      nextRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepInRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepOutRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepBackRequest(response, args, request) {
        this.sendResponse(response);
      }
      reverseContinueRequest(response, args, request) {
        this.sendResponse(response);
      }
      restartFrameRequest(response, args, request) {
        this.sendResponse(response);
      }
      gotoRequest(response, args, request) {
        this.sendResponse(response);
      }
      pauseRequest(response, args, request) {
        this.sendResponse(response);
      }
      sourceRequest(response, args, request) {
        this.sendResponse(response);
      }
      threadsRequest(response, request) {
        this.sendResponse(response);
      }
      terminateThreadsRequest(response, args, request) {
        this.sendResponse(response);
      }
      stackTraceRequest(response, args, request) {
        this.sendResponse(response);
      }
      scopesRequest(response, args, request) {
        this.sendResponse(response);
      }
      variablesRequest(response, args, request) {
        this.sendResponse(response);
      }
      setVariableRequest(response, args, request) {
        this.sendResponse(response);
      }
      setExpressionRequest(response, args, request) {
        this.sendResponse(response);
      }
      evaluateRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepInTargetsRequest(response, args, request) {
        this.sendResponse(response);
      }
      gotoTargetsRequest(response, args, request) {
        this.sendResponse(response);
      }
      completionsRequest(response, args, request) {
        this.sendResponse(response);
      }
      exceptionInfoRequest(response, args, request) {
        this.sendResponse(response);
      }
      loadedSourcesRequest(response, args, request) {
        this.sendResponse(response);
      }
      dataBreakpointInfoRequest(response, args, request) {
        this.sendResponse(response);
      }
      setDataBreakpointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      readMemoryRequest(response, args, request) {
        this.sendResponse(response);
      }
      writeMemoryRequest(response, args, request) {
        this.sendResponse(response);
      }
      disassembleRequest(response, args, request) {
        this.sendResponse(response);
      }
      cancelRequest(response, args, request) {
        this.sendResponse(response);
      }
      breakpointLocationsRequest(response, args, request) {
        this.sendResponse(response);
      }
      setInstructionBreakpointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      /**
       * Override this hook to implement custom requests.
       */
      customRequest(command, response, args, request) {
        this.sendErrorResponse(response, 1014, "unrecognized request", null, ErrorDestination.Telemetry);
      }
      //---- protected -------------------------------------------------------------------------------------------------
      convertClientLineToDebugger(line) {
        if (this._debuggerLinesStartAt1) {
          return this._clientLinesStartAt1 ? line : line + 1;
        }
        return this._clientLinesStartAt1 ? line - 1 : line;
      }
      convertDebuggerLineToClient(line) {
        if (this._debuggerLinesStartAt1) {
          return this._clientLinesStartAt1 ? line : line - 1;
        }
        return this._clientLinesStartAt1 ? line + 1 : line;
      }
      convertClientColumnToDebugger(column) {
        if (this._debuggerColumnsStartAt1) {
          return this._clientColumnsStartAt1 ? column : column + 1;
        }
        return this._clientColumnsStartAt1 ? column - 1 : column;
      }
      convertDebuggerColumnToClient(column) {
        if (this._debuggerColumnsStartAt1) {
          return this._clientColumnsStartAt1 ? column : column - 1;
        }
        return this._clientColumnsStartAt1 ? column + 1 : column;
      }
      convertClientPathToDebugger(clientPath) {
        if (this._clientPathsAreURIs !== this._debuggerPathsAreURIs) {
          if (this._clientPathsAreURIs) {
            return _DebugSession.uri2path(clientPath);
          } else {
            return _DebugSession.path2uri(clientPath);
          }
        }
        return clientPath;
      }
      convertDebuggerPathToClient(debuggerPath) {
        if (this._debuggerPathsAreURIs !== this._clientPathsAreURIs) {
          if (this._debuggerPathsAreURIs) {
            return _DebugSession.uri2path(debuggerPath);
          } else {
            return _DebugSession.path2uri(debuggerPath);
          }
        }
        return debuggerPath;
      }
      //---- private -------------------------------------------------------------------------------
      static path2uri(path3) {
        if (process.platform === "win32") {
          if (/^[A-Z]:/.test(path3)) {
            path3 = path3[0].toLowerCase() + path3.substr(1);
          }
          path3 = path3.replace(/\\/g, "/");
        }
        path3 = encodeURI(path3);
        let uri = new url_1.URL(`file:`);
        uri.pathname = path3;
        return uri.toString();
      }
      static uri2path(sourceUri) {
        let uri = new url_1.URL(sourceUri);
        let s = decodeURIComponent(uri.pathname);
        if (process.platform === "win32") {
          if (/^\/[a-zA-Z]:/.test(s)) {
            s = s[1].toLowerCase() + s.substr(2);
          }
          s = s.replace(/\//g, "\\");
        }
        return s;
      }
      /*
      * If argument starts with '_' it is OK to send its value to telemetry.
      */
      static formatPII(format, excludePII, args) {
        return format.replace(_DebugSession._formatPIIRegexp, function(match, paramName) {
          if (excludePII && paramName.length > 0 && paramName[0] !== "_") {
            return match;
          }
          return args[paramName] && args.hasOwnProperty(paramName) ? args[paramName] : match;
        });
      }
    };
    exports2.DebugSession = DebugSession;
    DebugSession._formatPIIRegexp = /{([^}]+)}/g;
  }
});

// node_modules/@vscode/debugadapter/lib/internalLogger.js
var require_internalLogger = __commonJS({
  "node_modules/@vscode/debugadapter/lib/internalLogger.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InternalLogger = void 0;
    var fs5 = require("fs");
    var path3 = require("path");
    var logger_1 = require_logger();
    var InternalLogger = class {
      constructor(logCallback, isServer) {
        this.beforeExitCallback = () => this.dispose();
        this._logCallback = logCallback;
        this._logToConsole = isServer;
        this._minLogLevel = logger_1.LogLevel.Warn;
        this.disposeCallback = (signal, code) => {
          this.dispose();
          code = code || 2;
          code += 128;
          process.exit(code);
        };
      }
      async setup(options) {
        this._minLogLevel = options.consoleMinLogLevel;
        this._prependTimestamp = options.prependTimestamp;
        if (options.logFilePath) {
          if (!path3.isAbsolute(options.logFilePath)) {
            this.log(`logFilePath must be an absolute path: ${options.logFilePath}`, logger_1.LogLevel.Error);
          } else {
            const handleError = (err) => this.sendLog(`Error creating log file at path: ${options.logFilePath}. Error: ${err.toString()}
`, logger_1.LogLevel.Error);
            try {
              await fs5.promises.mkdir(path3.dirname(options.logFilePath), { recursive: true });
              this.log(`Verbose logs are written to:
`, logger_1.LogLevel.Warn);
              this.log(options.logFilePath + "\n", logger_1.LogLevel.Warn);
              this._logFileStream = fs5.createWriteStream(options.logFilePath);
              this.logDateTime();
              this.setupShutdownListeners();
              this._logFileStream.on("error", (err) => {
                handleError(err);
              });
            } catch (err) {
              handleError(err);
            }
          }
        }
      }
      logDateTime() {
        let d = /* @__PURE__ */ new Date();
        let dateString = d.getUTCFullYear() + `-${d.getUTCMonth() + 1}-` + d.getUTCDate();
        const timeAndDateStamp = dateString + ", " + getFormattedTimeString();
        this.log(timeAndDateStamp + "\n", logger_1.LogLevel.Verbose, false);
      }
      setupShutdownListeners() {
        process.on("beforeExit", this.beforeExitCallback);
        process.on("SIGTERM", this.disposeCallback);
        process.on("SIGINT", this.disposeCallback);
      }
      removeShutdownListeners() {
        process.removeListener("beforeExit", this.beforeExitCallback);
        process.removeListener("SIGTERM", this.disposeCallback);
        process.removeListener("SIGINT", this.disposeCallback);
      }
      dispose() {
        return new Promise((resolve) => {
          this.removeShutdownListeners();
          if (this._logFileStream) {
            this._logFileStream.end(resolve);
            this._logFileStream = null;
          } else {
            resolve();
          }
        });
      }
      log(msg, level, prependTimestamp = true) {
        if (this._minLogLevel === logger_1.LogLevel.Stop) {
          return;
        }
        if (level >= this._minLogLevel) {
          this.sendLog(msg, level);
        }
        if (this._logToConsole) {
          const logFn = level === logger_1.LogLevel.Error ? console.error : level === logger_1.LogLevel.Warn ? console.warn : null;
          if (logFn) {
            logFn((0, logger_1.trimLastNewline)(msg));
          }
        }
        if (level === logger_1.LogLevel.Error) {
          msg = `[${logger_1.LogLevel[level]}] ${msg}`;
        }
        if (this._prependTimestamp && prependTimestamp) {
          msg = "[" + getFormattedTimeString() + "] " + msg;
        }
        if (this._logFileStream) {
          this._logFileStream.write(msg);
        }
      }
      sendLog(msg, level) {
        if (msg.length > 1500) {
          const endsInNewline = !!msg.match(/(\n|\r\n)$/);
          msg = msg.substr(0, 1500) + "[...]";
          if (endsInNewline) {
            msg = msg + "\n";
          }
        }
        if (this._logCallback) {
          const event = new logger_1.LogOutputEvent(msg, level);
          this._logCallback(event);
        }
      }
    };
    exports2.InternalLogger = InternalLogger;
    function getFormattedTimeString() {
      let d = /* @__PURE__ */ new Date();
      let hourString = _padZeroes(2, String(d.getUTCHours()));
      let minuteString = _padZeroes(2, String(d.getUTCMinutes()));
      let secondString = _padZeroes(2, String(d.getUTCSeconds()));
      let millisecondString = _padZeroes(3, String(d.getUTCMilliseconds()));
      return hourString + ":" + minuteString + ":" + secondString + "." + millisecondString + " UTC";
    }
    function _padZeroes(minDesiredLength, numberToPad) {
      if (numberToPad.length >= minDesiredLength) {
        return numberToPad;
      } else {
        return String("0".repeat(minDesiredLength) + numberToPad).slice(-minDesiredLength);
      }
    }
  }
});

// node_modules/@vscode/debugadapter/lib/logger.js
var require_logger = __commonJS({
  "node_modules/@vscode/debugadapter/lib/logger.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.trimLastNewline = exports2.LogOutputEvent = exports2.logger = exports2.Logger = exports2.LogLevel = void 0;
    var internalLogger_1 = require_internalLogger();
    var debugSession_1 = require_debugSession();
    var LogLevel;
    (function(LogLevel2) {
      LogLevel2[LogLevel2["Verbose"] = 0] = "Verbose";
      LogLevel2[LogLevel2["Log"] = 1] = "Log";
      LogLevel2[LogLevel2["Warn"] = 2] = "Warn";
      LogLevel2[LogLevel2["Error"] = 3] = "Error";
      LogLevel2[LogLevel2["Stop"] = 4] = "Stop";
    })(LogLevel = exports2.LogLevel || (exports2.LogLevel = {}));
    var Logger2 = class {
      constructor() {
        this._pendingLogQ = [];
      }
      log(msg, level = LogLevel.Log) {
        msg = msg + "\n";
        this._write(msg, level);
      }
      verbose(msg) {
        this.log(msg, LogLevel.Verbose);
      }
      warn(msg) {
        this.log(msg, LogLevel.Warn);
      }
      error(msg) {
        this.log(msg, LogLevel.Error);
      }
      dispose() {
        if (this._currentLogger) {
          const disposeP = this._currentLogger.dispose();
          this._currentLogger = null;
          return disposeP;
        } else {
          return Promise.resolve();
        }
      }
      /**
       * `log` adds a newline, `write` doesn't
       */
      _write(msg, level = LogLevel.Log) {
        msg = msg + "";
        if (this._pendingLogQ) {
          this._pendingLogQ.push({ msg, level });
        } else if (this._currentLogger) {
          this._currentLogger.log(msg, level);
        }
      }
      /**
       * Set the logger's minimum level to log in the console, and whether to log to the file. Log messages are queued before this is
       * called the first time, because minLogLevel defaults to Warn.
       */
      setup(consoleMinLogLevel, _logFilePath, prependTimestamp = true) {
        const logFilePath = typeof _logFilePath === "string" ? _logFilePath : _logFilePath && this._logFilePathFromInit;
        if (this._currentLogger) {
          const options = {
            consoleMinLogLevel,
            logFilePath,
            prependTimestamp
          };
          this._currentLogger.setup(options).then(() => {
            if (this._pendingLogQ) {
              const logQ = this._pendingLogQ;
              this._pendingLogQ = null;
              logQ.forEach((item) => this._write(item.msg, item.level));
            }
          });
        }
      }
      init(logCallback, logFilePath, logToConsole) {
        this._pendingLogQ = this._pendingLogQ || [];
        this._currentLogger = new internalLogger_1.InternalLogger(logCallback, logToConsole);
        this._logFilePathFromInit = logFilePath;
      }
    };
    exports2.Logger = Logger2;
    exports2.logger = new Logger2();
    var LogOutputEvent = class extends debugSession_1.OutputEvent {
      constructor(msg, level) {
        const category = level === LogLevel.Error ? "stderr" : level === LogLevel.Warn ? "console" : "stdout";
        super(msg, category);
      }
    };
    exports2.LogOutputEvent = LogOutputEvent;
    function trimLastNewline(str) {
      return str.replace(/(\n|\r\n)$/, "");
    }
    exports2.trimLastNewline = trimLastNewline;
  }
});

// node_modules/@vscode/debugadapter/lib/loggingDebugSession.js
var require_loggingDebugSession = __commonJS({
  "node_modules/@vscode/debugadapter/lib/loggingDebugSession.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LoggingDebugSession = void 0;
    var Logger2 = require_logger();
    var logger2 = Logger2.logger;
    var debugSession_1 = require_debugSession();
    var LoggingDebugSession2 = class extends debugSession_1.DebugSession {
      constructor(obsolete_logFilePath, obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer) {
        super(obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer);
        this.obsolete_logFilePath = obsolete_logFilePath;
        this.on("error", (event) => {
          logger2.error(event.body);
        });
      }
      start(inStream, outStream) {
        super.start(inStream, outStream);
        logger2.init((e) => this.sendEvent(e), this.obsolete_logFilePath, this._isServer);
      }
      /**
       * Overload sendEvent to log
       */
      sendEvent(event) {
        if (!(event instanceof Logger2.LogOutputEvent)) {
          let objectToLog = event;
          if (event instanceof debugSession_1.OutputEvent && event.body && event.body.data && event.body.data.doNotLogOutput) {
            delete event.body.data.doNotLogOutput;
            objectToLog = { ...event };
            objectToLog.body = { ...event.body, output: "<output not logged>" };
          }
          logger2.verbose(`To client: ${JSON.stringify(objectToLog)}`);
        }
        super.sendEvent(event);
      }
      /**
       * Overload sendRequest to log
       */
      sendRequest(command, args, timeout, cb) {
        logger2.verbose(`To client: ${JSON.stringify(command)}(${JSON.stringify(args)}), timeout: ${timeout}`);
        super.sendRequest(command, args, timeout, cb);
      }
      /**
       * Overload sendResponse to log
       */
      sendResponse(response) {
        logger2.verbose(`To client: ${JSON.stringify(response)}`);
        super.sendResponse(response);
      }
      dispatchRequest(request) {
        logger2.verbose(`From client: ${request.command}(${JSON.stringify(request.arguments)})`);
        super.dispatchRequest(request);
      }
    };
    exports2.LoggingDebugSession = LoggingDebugSession2;
  }
});

// node_modules/@vscode/debugadapter/lib/handles.js
var require_handles = __commonJS({
  "node_modules/@vscode/debugadapter/lib/handles.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Handles = void 0;
    var Handles2 = class {
      constructor(startHandle) {
        this.START_HANDLE = 1e3;
        this._handleMap = /* @__PURE__ */ new Map();
        this._nextHandle = typeof startHandle === "number" ? startHandle : this.START_HANDLE;
      }
      reset() {
        this._nextHandle = this.START_HANDLE;
        this._handleMap = /* @__PURE__ */ new Map();
      }
      create(value) {
        var handle = this._nextHandle++;
        this._handleMap.set(handle, value);
        return handle;
      }
      get(handle, dflt) {
        return this._handleMap.get(handle) || dflt;
      }
    };
    exports2.Handles = Handles2;
  }
});

// node_modules/@vscode/debugadapter/lib/main.js
var require_main = __commonJS({
  "node_modules/@vscode/debugadapter/lib/main.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Handles = exports2.Response = exports2.Event = exports2.ErrorDestination = exports2.CompletionItem = exports2.Module = exports2.Source = exports2.Breakpoint = exports2.Variable = exports2.Scope = exports2.StackFrame = exports2.Thread = exports2.MemoryEvent = exports2.InvalidatedEvent = exports2.ProgressEndEvent = exports2.ProgressUpdateEvent = exports2.ProgressStartEvent = exports2.CapabilitiesEvent = exports2.LoadedSourceEvent = exports2.ModuleEvent = exports2.BreakpointEvent = exports2.ThreadEvent = exports2.OutputEvent = exports2.ContinuedEvent = exports2.StoppedEvent = exports2.ExitedEvent = exports2.TerminatedEvent = exports2.InitializedEvent = exports2.logger = exports2.Logger = exports2.LoggingDebugSession = exports2.DebugSession = void 0;
    var debugSession_1 = require_debugSession();
    Object.defineProperty(exports2, "DebugSession", { enumerable: true, get: function() {
      return debugSession_1.DebugSession;
    } });
    Object.defineProperty(exports2, "InitializedEvent", { enumerable: true, get: function() {
      return debugSession_1.InitializedEvent;
    } });
    Object.defineProperty(exports2, "TerminatedEvent", { enumerable: true, get: function() {
      return debugSession_1.TerminatedEvent;
    } });
    Object.defineProperty(exports2, "ExitedEvent", { enumerable: true, get: function() {
      return debugSession_1.ExitedEvent;
    } });
    Object.defineProperty(exports2, "StoppedEvent", { enumerable: true, get: function() {
      return debugSession_1.StoppedEvent;
    } });
    Object.defineProperty(exports2, "ContinuedEvent", { enumerable: true, get: function() {
      return debugSession_1.ContinuedEvent;
    } });
    Object.defineProperty(exports2, "OutputEvent", { enumerable: true, get: function() {
      return debugSession_1.OutputEvent;
    } });
    Object.defineProperty(exports2, "ThreadEvent", { enumerable: true, get: function() {
      return debugSession_1.ThreadEvent;
    } });
    Object.defineProperty(exports2, "BreakpointEvent", { enumerable: true, get: function() {
      return debugSession_1.BreakpointEvent;
    } });
    Object.defineProperty(exports2, "ModuleEvent", { enumerable: true, get: function() {
      return debugSession_1.ModuleEvent;
    } });
    Object.defineProperty(exports2, "LoadedSourceEvent", { enumerable: true, get: function() {
      return debugSession_1.LoadedSourceEvent;
    } });
    Object.defineProperty(exports2, "CapabilitiesEvent", { enumerable: true, get: function() {
      return debugSession_1.CapabilitiesEvent;
    } });
    Object.defineProperty(exports2, "ProgressStartEvent", { enumerable: true, get: function() {
      return debugSession_1.ProgressStartEvent;
    } });
    Object.defineProperty(exports2, "ProgressUpdateEvent", { enumerable: true, get: function() {
      return debugSession_1.ProgressUpdateEvent;
    } });
    Object.defineProperty(exports2, "ProgressEndEvent", { enumerable: true, get: function() {
      return debugSession_1.ProgressEndEvent;
    } });
    Object.defineProperty(exports2, "InvalidatedEvent", { enumerable: true, get: function() {
      return debugSession_1.InvalidatedEvent;
    } });
    Object.defineProperty(exports2, "MemoryEvent", { enumerable: true, get: function() {
      return debugSession_1.MemoryEvent;
    } });
    Object.defineProperty(exports2, "Thread", { enumerable: true, get: function() {
      return debugSession_1.Thread;
    } });
    Object.defineProperty(exports2, "StackFrame", { enumerable: true, get: function() {
      return debugSession_1.StackFrame;
    } });
    Object.defineProperty(exports2, "Scope", { enumerable: true, get: function() {
      return debugSession_1.Scope;
    } });
    Object.defineProperty(exports2, "Variable", { enumerable: true, get: function() {
      return debugSession_1.Variable;
    } });
    Object.defineProperty(exports2, "Breakpoint", { enumerable: true, get: function() {
      return debugSession_1.Breakpoint;
    } });
    Object.defineProperty(exports2, "Source", { enumerable: true, get: function() {
      return debugSession_1.Source;
    } });
    Object.defineProperty(exports2, "Module", { enumerable: true, get: function() {
      return debugSession_1.Module;
    } });
    Object.defineProperty(exports2, "CompletionItem", { enumerable: true, get: function() {
      return debugSession_1.CompletionItem;
    } });
    Object.defineProperty(exports2, "ErrorDestination", { enumerable: true, get: function() {
      return debugSession_1.ErrorDestination;
    } });
    var loggingDebugSession_1 = require_loggingDebugSession();
    Object.defineProperty(exports2, "LoggingDebugSession", { enumerable: true, get: function() {
      return loggingDebugSession_1.LoggingDebugSession;
    } });
    var Logger2 = require_logger();
    exports2.Logger = Logger2;
    var messages_1 = require_messages();
    Object.defineProperty(exports2, "Event", { enumerable: true, get: function() {
      return messages_1.Event;
    } });
    Object.defineProperty(exports2, "Response", { enumerable: true, get: function() {
      return messages_1.Response;
    } });
    var handles_1 = require_handles();
    Object.defineProperty(exports2, "Handles", { enumerable: true, get: function() {
      return handles_1.Handles;
    } });
    var logger2 = Logger2.logger;
    exports2.logger = logger2;
  }
});

// src/vscode/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));
var path2 = __toESM(require("path"));
var os = __toESM(require("os"));
var fs4 = __toESM(require("fs"));

// src/server/HttpServer.ts
var http = __toESM(require("http"));

// src/utils/logging.ts
var vscode = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
var currentLevel = "info";
var LOG_FILE = path.join(__dirname, "..", "proxy.log");
var outputChannel = typeof vscode.window?.createOutputChannel === "function" ? vscode.window.createOutputChannel("AI Debug Proxy") : {
  append: () => {
  },
  appendLine: () => {
  },
  clear: () => {
  },
  dispose: () => {
  },
  hide: () => {
  },
  name: "MockOutputChannel",
  replace: () => {
  },
  show: () => {
  }
};
function setLogLevel(level) {
  currentLevel = level;
}
function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}
function formatTimestamp() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(11, 23);
}
function log(level, component, message, data) {
  if (!shouldLog(level))
    return;
  const tag = level.toUpperCase().padEnd(5);
  const line = `[${formatTimestamp()}] ${tag} [${component}] ${message}`;
  outputChannel.appendLine(line);
  console.log(line);
  let extra = "";
  if (data !== void 0) {
    extra = `
  \u2514\u2500 ${stringifySafe(data)}`;
    outputChannel.appendLine(`  \u2514\u2500 ${stringifySafe(data)}`);
    console.log(`  \u2514\u2500 ${stringifySafe(data)}`);
  }
  try {
    fs.appendFileSync(LOG_FILE, line + extra + "\n");
  } catch (e) {
  }
}
var logger = {
  debug: (component, msg, data) => log("debug", component, msg, data),
  info: (component, msg, data) => log("info", component, msg, data),
  warn: (component, msg, data) => log("warn", component, msg, data),
  error: (component, msg, data) => log("error", component, msg, data)
};
function stringifySafe(obj, indent = 2) {
  const cache = /* @__PURE__ */ new Set();
  try {
    return JSON.stringify(
      obj,
      (_key, value) => {
        if (typeof value === "object" && value !== null) {
          if (cache.has(value))
            return "[Circular]";
          cache.add(value);
        }
        return value;
      },
      indent
    );
  } catch (e) {
    return `[Serialization Error: ${e instanceof Error ? e.message : String(e)}]`;
  } finally {
    cache.clear();
  }
}

// src/backend/GDBBackend.ts
var import_events2 = require("events");
var fs2 = __toESM(require("fs"));

// src/protocol/mi2/MI2.ts
var import_child_process = require("child_process");
var import_events = require("events");

// src/protocol/mi2/mi_parse.ts
var octalMatch = /^[0-7]{3}/;
var escapeMap = {
  "\\": "\\",
  '"': '"',
  "'": "'",
  "n": "\n",
  "r": "\r",
  "t": "	",
  "b": "\b",
  "f": "\f",
  "v": "\v",
  "0": "\0"
};
function parseString(str) {
  const ret = Buffer.alloc(str.length * 4);
  let bufIndex = 0;
  if (str[0] !== '"' || str[str.length - 1] !== '"') {
    throw new Error("Not a valid string");
  }
  str = str.slice(1, -1);
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\") {
      if (++i >= str.length) {
        throw new Error("Not a valid escape sequence");
      }
      const sub = escapeMap[str[i]];
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
    } else if (str[i] === '"') {
      throw new Error("Not a valid string");
    } else {
      bufIndex += ret.write(str[i], bufIndex);
    }
  }
  return ret.toString("utf8", 0, bufIndex);
}
var MINode = class _MINode {
  token;
  outOfBandRecord;
  resultRecords;
  /** Original raw output string. */
  output = "";
  /**
   * Extracts a value from a nested MI result list using a path.
   * 
   * @param start - Starting point (usually results array)
   * @param path - Dot-separated path (e.g., 'frame.addr')
   * @returns The value at path or undefined
   */
  static valueOf(start, path3) {
    if (!start) {
      return void 0;
    }
    const pathRegex = /^\.?([a-zA-Z_-][a-zA-Z0-9_-]*)/;
    const indexRegex = /^\[(\d+)\](?:$|\.)/;
    path3 = path3.trim();
    if (!path3) {
      return start;
    }
    let current = start;
    do {
      let target = pathRegex.exec(path3);
      if (target) {
        path3 = path3.substr(target[0].length);
        if (current.length && typeof current !== "string") {
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
            return void 0;
          }
        } else {
          return void 0;
        }
      } else if (path3[0] === "@") {
        current = [current];
        path3 = path3.substr(1);
      } else {
        target = indexRegex.exec(path3);
        if (target) {
          path3 = path3.substr(target[0].length);
          const i = parseInt(target[1]);
          if (current.length && typeof current !== "string" && i >= 0 && i < current.length) {
            current = current[i];
          } else if (i !== 0) {
            return void 0;
          }
        } else {
          return void 0;
        }
      }
      path3 = path3.trim();
    } while (path3);
    return current;
  }
  constructor(token, info, result) {
    this.token = token;
    this.outOfBandRecord = info;
    this.resultRecords = result;
  }
  record(path3) {
    if (!this.outOfBandRecord || this.outOfBandRecord.length === 0) {
      return void 0;
    }
    const first = this.outOfBandRecord[0];
    if (first.isStream) {
      return void 0;
    }
    return _MINode.valueOf(first.output, path3);
  }
  result(path3) {
    if (!this.resultRecords) {
      return void 0;
    }
    return _MINode.valueOf(this.resultRecords.results, path3);
  }
};
var outOfBandRecordRegex = /^(?:(\d*|undefined)([*+=])|([~@&]))/;
var resultRecordRegex = /^(\d*)\^(done|running|connected|error|exit)/;
var newlineRegex = /^\r\n?/;
var variableRegex = /^([a-zA-Z_-][a-zA-Z0-9_-]*)/;
var asyncClassRegex = /^(.*?),/;
function parseMI(output) {
  let token;
  const outOfBandRecord = [];
  let resultRecords;
  const asyncRecordType = {
    "*": "exec",
    "+": "status",
    "=": "notify"
  };
  const streamRecordType = {
    "~": "console",
    "@": "target",
    "&": "log"
  };
  const parseCString = () => {
    if (output[0] !== '"') {
      return "";
    }
    let stringEnd = 1;
    let inString = true;
    let remaining = output.substr(1);
    let escaped = false;
    while (inString) {
      if (escaped) {
        escaped = false;
      } else if (remaining[0] === "\\") {
        escaped = true;
      } else if (remaining[0] === '"') {
        inString = false;
      }
      remaining = remaining.substr(1);
      stringEnd++;
    }
    let str;
    try {
      str = parseString(output.substr(0, stringEnd));
    } catch (e) {
      str = output.substr(0, stringEnd);
    }
    output = output.substr(stringEnd);
    return str;
  };
  function parseTupleOrList() {
    if (output[0] !== "{" && output[0] !== "[") {
      return void 0;
    }
    const oldContent = output;
    const canBeValueList = output[0] === "[";
    output = output.substr(1);
    if (output[0] === "}" || output[0] === "]") {
      output = output.substr(1);
      return [];
    }
    if (canBeValueList) {
      let value = parseValue();
      if (value) {
        const values = [];
        values.push(value);
        const remaining = output;
        while ((value = parseCommaValue()) !== void 0) {
          values.push(value);
        }
        output = output.substr(1);
        return values;
      }
    }
    let result = parseResult();
    if (result) {
      const results = [];
      results.push(result);
      while (result = parseCommaResult()) {
        results.push(result);
      }
      output = output.substr(1);
      return results;
    }
    output = (canBeValueList ? "[" : "{") + output;
    return void 0;
  }
  ;
  function parseValue() {
    if (output[0] === '"') {
      return parseCString();
    } else if (output[0] === "{" || output[0] === "[") {
      return parseTupleOrList();
    } else {
      return void 0;
    }
  }
  ;
  function parseResult() {
    const variableMatch = variableRegex.exec(output);
    if (!variableMatch) {
      return void 0;
    }
    output = output.substr(variableMatch[0].length + 1);
    const variable = variableMatch[1];
    return [variable, parseValue()];
  }
  ;
  function parseCommaValue() {
    if (output[0] !== ",") {
      return void 0;
    }
    output = output.substr(1);
    return parseValue();
  }
  ;
  function parseCommaResult() {
    if (output[0] !== ",") {
      return void 0;
    }
    output = output.substr(1);
    return parseResult();
  }
  ;
  let match;
  while (match = outOfBandRecordRegex.exec(output)) {
    output = output.substr(match[0].length);
    if (match[1] && token === void 0 && match[1] !== "undefined") {
      token = parseInt(match[1]);
    }
    if (match[2]) {
      const classMatch = asyncClassRegex.exec(output);
      let asyncClass = "";
      if (classMatch) {
        asyncClass = classMatch[1];
        output = output.substr(asyncClass.length);
      } else {
        asyncClass = output;
        output = "";
      }
      const asyncRecord = {
        isStream: false,
        type: asyncRecordType[match[2]],
        asyncClass,
        output: []
      };
      let result;
      while (result = parseCommaResult()) {
        asyncRecord.output.push(result);
      }
      outOfBandRecord.push(asyncRecord);
    } else if (match[3]) {
      const streamRecord = {
        isStream: true,
        type: streamRecordType[match[3]],
        content: parseCString()
      };
      outOfBandRecord.push(streamRecord);
    }
    output = output.replace(newlineRegex, "");
  }
  if (match = resultRecordRegex.exec(output)) {
    output = output.substr(match[0].length);
    if (match[1] && token === void 0) {
      token = parseInt(match[1]);
    }
    resultRecords = {
      resultClass: match[2],
      results: []
    };
    let result;
    while (result = parseCommaResult()) {
      resultRecords.results.push(result);
    }
    output = output.replace(newlineRegex, "");
  }
  return new MINode(token, outOfBandRecord || [], resultRecords);
}

// src/protocol/mi2/MI2.ts
var MI2 = class extends import_events.EventEmitter {
  constructor(application, args) {
    super();
    this.application = application;
    this.args = args;
  }
  process;
  buffer = "";
  token = 1;
  pendingCommands = /* @__PURE__ */ new Map();
  running = false;
  /**
   * Start GDB process
   */
  async start(cwd, initCommands = []) {
    return new Promise((resolve, reject) => {
      console.log("[MI2] Starting GDB:", this.application);
      this.process = (0, import_child_process.spawn)(this.application, this.args, {
        cwd,
        env: { PATH: process.env.PATH }
      });
      this.process.stdout?.on("data", (data) => {
        this.handleOutput(data.toString());
      });
      this.process.stderr?.on("data", (data) => {
        console.error("[MI2] GDB stderr:", data.toString());
      });
      this.process.on("exit", (code) => {
        console.log("[MI2] GDB exited with code:", code);
        this.running = false;
        this.emit("exited", code);
      });
      this.process.on("error", (err) => {
        console.error("[MI2] GDB process error:", err);
        reject(err);
      });
      setTimeout(async () => {
        try {
          for (const cmd of initCommands) {
            await this.sendCommand(cmd);
          }
          this.running = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 500);
    });
  }
  /**
   * Handle GDB output
   */
  normalize(val, forceObject = false) {
    if (!Array.isArray(val))
      return val;
    if (val.length === 0)
      return [];
    const isTupleList = val.every(
      (item) => Array.isArray(item) && item.length === 2 && typeof item[0] === "string"
    );
    if (isTupleList) {
      const keys = val.map((v) => v[0]);
      const allSame = keys.every((k) => k === keys[0]);
      if (allSame && !forceObject) {
        return val.map((v) => this.normalize(v[1]));
      }
      return val.reduce((acc, [k, v]) => {
        const normalizedV = this.normalize(v);
        if (acc[k] !== void 0) {
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
    return val.map((v) => this.normalize(v));
  }
  // Buffer to capture recent console stream output (~ commands)
  pendingConsoleOutput = "";
  /**
   * Handle GDB output
   */
  handleOutput(output) {
    this.emit("msg", output);
    this.buffer += output;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim())
        continue;
      const mi = parseMI(line);
      if (!mi)
        continue;
      if (mi.outOfBandRecord) {
        for (const record of mi.outOfBandRecord) {
          if (record.isStream && record.type === "~") {
            this.pendingConsoleOutput += record.content;
          }
        }
      }
      if (mi.token !== void 0 && this.pendingCommands.has(mi.token)) {
        const callback = this.pendingCommands.get(mi.token);
        this.pendingCommands.delete(mi.token);
        if (mi.resultRecords && (mi.resultRecords.resultClass === "done" || mi.resultRecords.resultClass === "running")) {
          const resultData = this.normalize(mi.resultRecords.results || [], true) || {};
          if (this.pendingConsoleOutput) {
            resultData.consoleOutput = this.pendingConsoleOutput;
            this.pendingConsoleOutput = "";
          }
          callback.resolve({
            token: mi.token,
            resultClass: mi.resultRecords.resultClass,
            resultData
          });
        } else if (mi.resultRecords && mi.resultRecords.resultClass === "error") {
          callback.reject(new Error(mi.resultRecords.results?.[0]?.[1] || "GDB error"));
          this.pendingConsoleOutput = "";
        }
      }
      if (mi.outOfBandRecord) {
        for (const record of mi.outOfBandRecord) {
          if (!record.isStream) {
            if (record.asyncClass === "stopped") {
              const event = {
                reason: this.extractStringValue(record.output, "reason") || "unknown",
                signalName: this.extractStringValue(record.output, "signal-name"),
                threadId: parseInt(this.extractStringValue(record.output, "thread-id") || "1") || 1,
                frame: this.normalize(record.output.find((o) => o[0] === "frame")?.[1])
              };
              this.emit("stopped", event);
            } else if (record.asyncClass === "running") {
              this.emit("running");
            }
          }
        }
      }
    }
  }
  /**
   * Send command to GDB
   */
  async sendCommand(cmd) {
    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error("GDB not started"));
        return;
      }
      const token = this.token++;
      this.pendingCommands.set(token, { resolve, reject });
      const line = `${token}${cmd}
`;
      console.log("[MI2] Sending:", line.trim());
      this.process.stdin?.write(line);
      const timeoutMs = cmd.includes("-file-") ? 3e4 : 1e4;
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
  kill() {
    if (this.process) {
      this.process.kill();
      this.process = void 0;
      this.running = false;
    }
  }
  /**
   * Check if GDB is running
   */
  isRunning() {
    return this.running;
  }
  /**
   * Helper to extract string value from MI output
   */
  extractStringValue(output, key) {
    const item = output ? output.find((o) => o[0] === key) : void 0;
    return item ? String(item[1]) : void 0;
  }
};

// src/backend/GDBBackend.ts
var LOG_FILE2 = "/home/datdang/working/common_dev/ai_vscode_debug/proxy.log";
var GDBBackend = class extends import_events2.EventEmitter {
  mi2;
  config;
  running = false;
  breakpoints = /* @__PURE__ */ new Map();
  currentFrame;
  lastStopEvent;
  /**
   * Log helper
   */
  log(message) {
    const logMsg = `[GDBBackend][${(/* @__PURE__ */ new Date()).toISOString()}] ${message}
`;
    console.log(logMsg.trim());
    try {
      fs2.appendFileSync(LOG_FILE2, logMsg);
    } catch (e) {
    }
  }
  /**
   * Initializes the GDB backend.
   * Starts the GDB process with MI2 interpreter and pretty-printing enabled.
   * 
   * @param config - Backend configuration (gdbPath, etc.)
   */
  async initialize(config) {
    this.log(`Initializing GDBBackend: ${JSON.stringify(config, null, 2)}`);
    this.config = config;
    this.mi2 = new MI2(config.gdbPath || "gdb", ["--interpreter=mi2"]);
    this.mi2.on("msg", (msg) => {
      this.log(`[MI2 RAW] ${msg}`);
    });
    this.mi2.on("stopped", (event) => {
      this.log(`[GDBBackend] Stopped event: ${event.reason}`);
      this.running = false;
      this.updateCurrentFrame(event);
      this.lastStopEvent = this.createStopEvent(event);
      this.emit("stopped", this.lastStopEvent);
    });
    this.mi2.on("running", () => {
      this.log("[GDBBackend] Running event");
      this.running = true;
      this.emit("running");
    });
    this.mi2.on("exited", (code) => {
      this.log(`[GDBBackend] Exited with code: ${code}`);
      this.running = false;
      this.emit("exited", code);
    });
    await this.mi2.start(process.cwd(), [
      "-enable-pretty-printing",
      "-gdb-set target-async on"
    ]);
    this.running = false;
    this.log("GDBBackend initialized successfully");
  }
  /**
   * Create StopEvent from MI2 event
   */
  createStopEvent(event) {
    const reason = event.reason === "exited" ? "exited" : event.reason === "breakpoint-hit" ? "breakpoint" : event.reason === "end-stepping-range" || event.reason === "function-finished" ? "step" : event.reason === "signal-received" ? event.signalName === "SIGINT" ? "pause" : "exception" : "pause";
    return {
      reason,
      threadId: event.threadId || 1,
      allThreadsStopped: true,
      frame: event.frame ? {
        id: 0,
        name: event.frame.func || "??",
        path: event.frame.fullname || event.frame.file || "",
        line: parseInt(event.frame.line) || 0,
        column: 0
      } : void 0
    };
  }
  /**
   * Update current frame from stop event
   */
  updateCurrentFrame(event) {
    if (event.frame) {
      this.currentFrame = {
        id: 0,
        name: event.frame.func || "??",
        path: event.frame.fullname || event.frame.file || "",
        line: parseInt(event.frame.line) || 0,
        column: 0
      };
    }
  }
  /**
   * Launch debug session
   */
  async launch(params) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    this.log(`Starting program: ${params.program}`);
    await this.mi2.sendCommand(`-file-exec-and-symbols "${params.program}"`);
    if (params.cwd) {
      await this.mi2.sendCommand(`-environment-cd "${params.cwd}"`);
    }
    if (params.stopOnEntry) {
      await this.mi2.sendCommand("-break-insert main");
      console.log("[GDBBackend] Breakpoint set at main");
    }
    this.log("Launch complete (deferred -exec-run)");
  }
  /**
   * Start execution
   */
  async start() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Starting program execution");
    await this.mi2.sendCommand("-exec-run");
    this.running = true;
  }
  /**
   * Attach to running process
   */
  async attach(params) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Attaching to PID:", params.processId);
    await this.mi2.sendCommand(`-target-attach ${params.processId}`);
  }
  /**
   * Terminate debug session
   */
  async terminate() {
    console.log("[GDBBackend] Terminating session");
    if (this.mi2) {
      this.mi2.sendCommand("-gdb-exit").catch(() => {
      });
      this.mi2.kill();
      this.mi2 = void 0;
    }
    this.running = false;
    this.breakpoints.clear();
    this.currentFrame = void 0;
  }
  /**
   * Check if debugger is running
   */
  isRunning() {
    this.log(`isRunning() check: ${this.running}`);
    return this.running;
  }
  /**
   * Continue execution
   * Returns immediately when GDB acknowledges (program is running)
   * Emits 'stopped' event when program actually stops
   */
  async continue() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    this.log("[GDBBackend] Continuing execution - setting running=true");
    this.running = true;
    await this.mi2.sendCommand("-exec-continue");
  }
  /**
   * Step over (next line)
   * Returns immediately when GDB acknowledges
   * Emits 'stopped' event when step completes
   */
  async stepOver() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Stepping over");
    this.running = true;
    await this.mi2.sendCommand("-exec-next");
  }
  /**
   * Step into function
   */
  async stepIn() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Stepping into");
    this.running = true;
    await this.mi2.sendCommand("-exec-step");
  }
  /**
   * Step out of function
   */
  async stepOut() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Stepping out");
    this.running = true;
    await this.mi2.sendCommand("-exec-finish");
  }
  /**
   * Pause execution
   */
  async pause() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Pausing execution");
    await this.mi2.sendCommand("-exec-interrupt");
  }
  /**
   * Jump to line (Safely)
   */
  async jumpToLine(line, file) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    this.log(`Attempting jump to line ${line}${file ? ` in ${file}` : ""}`);
    let targetFile = file;
    if (!targetFile) {
      const stack = await this.getStackTrace();
      if (stack.length === 0) {
        throw new Error("Cannot jump: No current file context and no file specified");
      }
      targetFile = stack[0].path;
    }
    if (!targetFile) {
      throw new Error("Cannot jump: No file path available");
    }
    this.log(`Forcing temporary breakpoint at ${targetFile}:${line} for jump safety`);
    await this.mi2.sendCommand(`-break-insert -t ${targetFile}:${line}`);
    await this.mi2.sendCommand(`-exec-jump ${targetFile}:${line}`);
  }
  /**
   * Run until line (safe)
   */
  async runUntilLine(line, file) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    this.log(`Running until line ${line}${file ? ` in ${file}` : ""}`);
    let targetFile = file;
    if (!targetFile) {
      const stack = await this.getStackTrace();
      if (stack.length === 0) {
        throw new Error("Cannot run until line: No current file context and no file specified");
      }
      targetFile = stack[0].path;
    }
    if (!targetFile) {
      throw new Error("Cannot run until line: No file path available");
    }
    await this.mi2.sendCommand(`-break-insert -t ${targetFile}:${line}`);
    await this.mi2.sendCommand("-exec-continue");
  }
  /**
   * Set breakpoint at location
   */
  async setBreakpoint(location) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Setting breakpoint at", location);
    const result = await this.mi2.sendCommand(`-break-insert ${location.path}:${location.line}`);
    const bp = {
      id: `bp-${Date.now()}`,
      verified: true,
      line: location.line,
      file: location.path
    };
    this.breakpoints.set(bp.id, bp);
    return bp;
  }
  /**
   * Remove breakpoint
   */
  async removeBreakpoint(id) {
    console.log("[GDBBackend] Removing breakpoint:", id);
    this.breakpoints.delete(id);
  }
  /**
   * Get all breakpoints
   */
  async getBreakpoints() {
    return Array.from(this.breakpoints.values());
  }
  /**
   * Get stack trace
   */
  async getStackTrace(threadId) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Getting stack trace");
    const result = await this.mi2.sendCommand("-stack-list-frames");
    this.log(`stack-list-frames results: ${JSON.stringify(result.resultData, null, 2)}`);
    if (!result.resultData || !result.resultData.stack) {
      return [];
    }
    return result.resultData.stack.map((frame) => ({
      id: parseInt(frame.level) || 0,
      name: frame.func || "??",
      path: frame.fullname || frame.file || "",
      line: parseInt(frame.line) || 0,
      column: 0
    }));
  }
  /**
   * Get variables in current frame
   */
  async getVariables(frameId) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Getting variables");
    if (frameId !== void 0) {
      await this.mi2.sendCommand(`-stack-select-frame ${frameId}`);
    }
    const result = await this.mi2.sendCommand("-stack-list-locals 1");
    this.log(`stack-list-locals results: ${JSON.stringify(result.resultData, null, 2)}`);
    if (!result.resultData || !result.resultData.locals) {
      return [];
    }
    return result.resultData.locals.map((local) => ({
      name: local.name || "unknown",
      value: local.value || "undefined",
      type: local.type || "unknown",
      children: 0
    }));
  }
  /**
   * Get function arguments
   */
  async getArguments(frameId) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Getting arguments");
    if (frameId !== void 0) {
      await this.mi2.sendCommand(`-stack-select-frame ${frameId}`);
    }
    const result = await this.mi2.sendCommand("-stack-list-arguments 1");
    if (!result.resultData || !result.resultData.stackargs) {
      return [];
    }
    return result.resultData.stackargs.map((arg) => ({
      name: arg.name || "unknown",
      value: arg.value || "undefined",
      type: arg.type || "unknown",
      children: 0
    }));
  }
  /**
   * Get global variables
   */
  async getGlobals() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Getting globals");
    const consoleStr = await this.executeStatement("info variables");
    if (!consoleStr)
      return [];
    const vars = [];
    const lines = consoleStr.split("\n");
    for (const line of lines) {
      const match = line.match(/^\d+:\s+(.*?)\s+([a-zA-Z0-9_]+)(\[.+\])?;/);
      if (match) {
        vars.push({
          name: match[2].trim(),
          value: "<use evaluate>",
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
  async evaluate(expression, frameId) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Evaluating:", expression);
    const result = await this.mi2.sendCommand(`-data-evaluate-expression "${expression}"`);
    return {
      name: expression,
      value: result.resultData?.value || "undefined",
      type: result.resultData?.type || "unknown",
      variablesReference: 0,
      children: 0
    };
  }
  /**
   * Get CPU registers
   */
  async getRegisters() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Getting registers");
    const result = await this.mi2.sendCommand("-data-list-register-values x");
    if (!result.resultData || !result.resultData["register-values"]) {
      return [];
    }
    return result.resultData["register-values"].map((reg) => ({
      name: `r${reg.number}`,
      value: reg.value,
      type: "hex",
      children: 0
    }));
  }
  /**
   * Read memory
   */
  async readMemory(address, length) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Reading memory at 0x" + address.toString(16));
    const result = await this.mi2.sendCommand(
      `-data-read-memory-bytes "0x${address.toString(16)}" ${length}`
    );
    if (!result.resultData || !result.resultData.memory) {
      return Buffer.alloc(length);
    }
    const memory = result.resultData.memory[0];
    const contents = memory.contents || "";
    const hex = contents.replace(/ /g, "");
    return Buffer.from(hex, "hex");
  }
  /**
   * Write memory
   */
  async writeMemory(address, data) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Writing memory at 0x" + address.toString(16));
    const hex = data.toString("hex");
    await this.mi2.sendCommand(
      `-interpreter-exec console "set {char[${data.length}]} 0x${address.toString(16)} = 0x${hex}"`
    );
  }
  /**
   * Get last stop information
   */
  async getLastStopInfo() {
    console.log("[GDBBackend] Getting last stop info");
    if (this.lastStopEvent) {
      return this.lastStopEvent;
    }
    const frames = await this.getStackTrace();
    return {
      reason: "pause",
      threadId: 1,
      allThreadsStopped: true,
      frame: frames[0]
    };
  }
  /**
   * Get debugger capabilities
   */
  getCapabilities() {
    return {
      supportsLaunch: true,
      supportsAttach: true,
      supportsHardwareBreakpoints: false,
      supportsWatchpoints: true,
      supportsTrace: false,
      supportsMultiCore: false,
      supportedArchitectures: ["x86_64", "i386", "arm", "arm64"],
      supportedTargets: ["linux", "windows", "qemu"]
    };
  }
  /**
   * Restart debug session
   */
  async restart() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Restarting session");
    await this.mi2.sendCommand("-exec-run");
  }
  /**
   * Frame up (toward caller)
   */
  async frameUp() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Frame up");
    await this.mi2.sendCommand("-stack-select-frame +1");
  }
  /**
   * Frame down (toward callee)
   */
  async frameDown() {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Frame down");
    await this.mi2.sendCommand("-stack-select-frame -1");
  }
  /**
   * Go to specific frame
   */
  async gotoFrame(frameId) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Go to frame:", frameId);
    await this.mi2.sendCommand(`-stack-select-frame ${frameId}`);
  }
  /**
   * Set temporary breakpoint
   */
  async setTempBreakpoint(location) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Set temp breakpoint at", location);
    await this.mi2.sendCommand(`-break-insert -t ${location.path}:${location.line}`);
    return {
      id: `tbp-${Date.now()}`,
      verified: true,
      line: location.line,
      file: location.path
    };
  }
  /**
   * Remove all breakpoints in file
   */
  async removeAllBreakpointsInFile(filePath) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Remove all breakpoints in", filePath);
    const result = await this.mi2.sendCommand("-break-list");
    if (!result.resultData?.BreakpointTable?.body)
      return;
    const bps = result.resultData.BreakpointTable.body;
    for (const bp of bps) {
      const bpFile = bp[4] || bp.file || "";
      if (bpFile.includes(filePath)) {
        const bpNumber = bp[0] || bp.number;
        await this.mi2.sendCommand(`-break-delete ${bpNumber}`);
      }
    }
  }
  /**
   * List source code
   */
  async listSource(params) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] List source");
    const result = await this.mi2.sendCommand('-interpreter-exec console "list"');
    return result.resultData?.value || "";
  }
  /**
   * Get source info
   */
  async getSource(expression) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Get source:", expression);
    const result = await this.mi2.sendCommand('-interpreter-exec console "info source"');
    return result.resultData?.value || "";
  }
  /**
   * Pretty print expression
   */
  async prettyPrint(expression) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Pretty print:", expression);
    const result = await this.mi2.sendCommand(`-data-evaluate-expression "${expression}"`);
    return {
      name: expression,
      value: result.resultData?.value || "undefined",
      type: result.resultData?.type || "unknown"
    };
  }
  /**
   * Whatis - get type of expression
   */
  async whatis(expression) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Whatis:", expression);
    const result = await this.mi2.sendCommand(`-interpreter-exec console "whatis ${expression}"`);
    return result.resultData?.value || "";
  }
  /**
   * Execute statement
   */
  async executeStatement(statement) {
    if (!this.mi2)
      throw new Error("GDB not initialized");
    console.log("[GDBBackend] Execute statement:", statement);
    const result = await this.mi2.sendCommand(`-interpreter-exec console "${statement}"`);
    return result.resultData?.consoleOutput || result.resultData?.value || "";
  }
  /**
   * List all locals (alias for getVariables)
   */
  async listAllLocals() {
    return this.getVariables();
  }
  /**
   * Get scope preview (locals + args)
   */
  async getScopePreview() {
    const locals = await this.getVariables();
    const args = await this.getArguments();
    return { locals, args };
  }
};

// src/backend/BackendManager.ts
var BackendManager = class _BackendManager {
  static instance;
  currentBackend;
  backendInstances = /* @__PURE__ */ new Map();
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!this.instance) {
      console.log("[BackendManager] Creating NEW singleton instance");
      this.instance = new _BackendManager();
    } else {
    }
    return this.instance;
  }
  /**
   * Create backend based on type
   * @param type Backend type (gdb, lauterbach, etc.)
   * @param config Backend configuration
   */
  createBackend(type, config) {
    console.log("[BackendManager] Creating backend:", type, "Current instances:", this.backendInstances.size);
    const existing = this.backendInstances.get(type);
    if (existing) {
      console.log("[BackendManager] Reusing existing backend instance");
      this.currentBackend = existing;
      return existing;
    }
    let backend;
    switch (type.toLowerCase()) {
      case "gdb":
        backend = new GDBBackend();
        break;
      case "lauterbach":
        throw new Error("Lauterbach backend not yet implemented");
      default:
        throw new Error(`Unknown backend type: ${type}`);
    }
    this.backendInstances.set(type, backend);
    this.currentBackend = backend;
    console.log("[BackendManager] Backend created successfully and set as current");
    return backend;
  }
  /**
   * Get current backend
   */
  getCurrentBackend() {
    if (!this.currentBackend) {
      console.log("[BackendManager] getCurrentBackend: No backend set! Current instances:", this.backendInstances.size);
    } else {
    }
    return this.currentBackend;
  }
  /**
   * Set active backend (used for testing)
   */
  setActiveBackend(backend) {
    this.currentBackend = backend;
    this.backendInstances.set("mock", backend);
  }
  /**
   * Get or create backend
   */
  async getOrCreateBackend(type, config) {
    let backend = this.currentBackend;
    if (!backend) {
      console.log("[BackendManager] getOrCreateBackend: No current backend, creating...");
      backend = this.createBackend(type, config);
      await backend.initialize(config);
    }
    return backend;
  }
  /**
   * Release current backend
   */
  async releaseBackend() {
    if (this.currentBackend) {
      console.log("[BackendManager] Releasing current backend");
      await this.currentBackend.terminate();
      this.currentBackend = void 0;
    }
  }
  /**
   * Release all backends
   */
  async releaseAllBackends() {
    console.log("[BackendManager] Releasing all backends");
    const backends = Array.from(this.backendInstances.entries());
    for (const [type, backend] of backends) {
      try {
        await backend.terminate();
        console.log("[BackendManager] Released backend:", type);
      } catch (error) {
        console.error("[BackendManager] Error releasing backend:", type, error);
      }
    }
    this.backendInstances.clear();
    this.currentBackend = void 0;
  }
  /**
   * Execute operation on current backend
   */
  async executeOperation(operation, params) {
    if (!this.currentBackend) {
      console.log("[BackendManager] executeOperation FAILED: No backend");
      throw new Error("No backend initialized. Call getOrCreateBackend first.");
    }
    const method = this.currentBackend[operation];
    if (!method) {
      throw new Error(`Unknown operation: ${operation}`);
    }
    console.log("[BackendManager] Executing operation:", operation);
    return await method.call(this.currentBackend, params);
  }
};
var backendManager = BackendManager.getInstance();

// src/server/router.ts
var LOG = "Router";
async function handleRequest(method, url, body, req) {
  try {
    const result = await routeRequest(method, url, body);
    return { statusCode: 200, body: result };
  } catch (error) {
    console.error(`[${LOG}] Error:`, error.message);
    return {
      statusCode: 500,
      body: {
        success: false,
        error: error.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
}
async function routeRequest(method, url, body) {
  const normalizePath = (p) => p.replace(/\/+$/, "") || "/";
  const pathname = normalizePath(url.split("?")[0]);
  console.log(`[${LOG}] Routing request: ${method} ${pathname}`);
  if (method === "GET" && pathname === "/api/ping") {
    return handlePing();
  }
  if (method === "GET" && (pathname === "/api/status" || pathname === "/api/debug/status")) {
    return handleStatus();
  }
  if (method === "POST" && pathname === "/api/debugger/create") {
    return handleCreateDebugger(body);
  }
  if (method === "POST" && (pathname === "/api/debug" || pathname === "/api/debug/execute_operation")) {
    return handleDebugOperation(body);
  }
  console.log(`[${LOG}] No route matched for ${method} ${pathname}`);
  throw new Error(`Unknown route: ${method} ${pathname}`);
}
function handlePing() {
  return {
    success: true,
    data: {
      message: "pong",
      version: "v3.a0",
      operations: [
        // Session
        "launch",
        "attach",
        "terminate",
        "restart",
        // Execution
        "continue",
        "next",
        "step_in",
        "step_out",
        "pause",
        "jump",
        "until",
        // Frame navigation
        "up",
        "down",
        "goto_frame",
        // Breakpoints
        "set_breakpoint",
        "set_temp_breakpoint",
        "remove_breakpoint",
        "remove_all_breakpoints_in_file",
        "get_active_breakpoints",
        // Inspection
        "stack_trace",
        "get_variables",
        "get_arguments",
        "get_globals",
        "evaluate",
        "get_registers",
        "read_memory",
        "write_memory",
        "list_source",
        "get_source",
        "pretty_print",
        "whatis",
        "execute_statement",
        "list_all_locals",
        "get_scope_preview",
        // Info
        "get_last_stop_info",
        "get_capabilities"
      ],
      operationCount: 38
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function handleStatus() {
  const backend = backendManager.getCurrentBackend();
  const stopInfo = backend ? await backend.getLastStopInfo() : void 0;
  const isRunning = backend ? backend.isRunning() : false;
  return {
    success: true,
    data: {
      version: "v3.a0",
      hasActiveSession: !!backend,
      isRunning,
      status: isRunning ? "running" : "stopped",
      lastStopInfo: isRunning ? void 0 : stopInfo
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function handleCreateDebugger(body) {
  const { backendType, gdbPath, lauterbachHost, lauterbachPort } = body;
  if (!backendType) {
    throw new Error("Missing backendType field");
  }
  console.log(`[${LOG}] Creating debugger: ${backendType}`);
  const config = {
    backendType,
    gdbPath,
    lauterbachHost,
    lauterbachPort
  };
  const backend = backendManager.createBackend(backendType, config);
  await backend.initialize(config);
  return {
    success: true,
    data: {
      backendType,
      isRunning: backend.isRunning()
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
var launchDelegate = null;
function setLaunchDelegate(delegate) {
  launchDelegate = delegate;
}
async function handleDebugOperation(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }
  const { operation, params } = body;
  if (!operation || typeof operation !== "string") {
    throw new Error("Missing or invalid 'operation' field");
  }
  if (operation === "launch") {
    const backendType = params?.backendType || "gdb";
    const config = {
      backendType,
      gdbPath: params?.gdbPath || "gdb"
    };
    console.log(`[${LOG}] Creating backend for launch: ${backendType}`);
    if (launchDelegate) {
      console.log(`[${LOG}] Delegating launch to VS Code UI via callback`);
      const success = await launchDelegate(params);
      if (!success) {
        throw new Error("Failed to start VS Code debugging session");
      }
      return {
        success: true,
        sessionId: "v3-session-vscode"
      };
    }
    const backend2 = backendManager.createBackend(backendType, config);
    await backend2.initialize(config);
    await backend2.launch(params);
    return {
      success: true,
      sessionId: "v3-session",
      stopReason: params.stopOnEntry ? "entry" : "breakpoint"
    };
  }
  const backend = backendManager.getCurrentBackend();
  if (!backend) {
    throw new Error("No debug backend initialized. Launch a debug session first.");
  }
  console.log(`[${LOG}] Executing operation: ${operation}`);
  const result = await executeBackendOperation(backend, operation, params);
  return {
    success: true,
    operation,
    data: result,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function executeBackendOperation(backend, operation, params) {
  switch (operation) {
    case "launch":
      return await backend.launch(params);
    case "attach":
      return await backend.attach(params);
    case "terminate":
      return await backend.terminate();
    case "continue":
      await backend.continue();
      return { success: true };
    case "next":
    case "stepOver":
    case "step_over":
      await backend.stepOver();
      return { success: true };
    case "step_in":
    case "stepIn":
      await backend.stepIn();
      return { success: true };
    case "step_out":
    case "stepOut":
      await backend.stepOut();
      return { success: true };
    case "pause":
      await backend.pause();
      return { success: true };
    case "jump":
      await backend.jumpToLine(params?.line, params?.file);
      return { success: true };
    case "until":
      await backend.runUntilLine(params?.line, params?.file);
      return { success: true };
    case "restart":
      await backend.restart();
      return { success: true };
    case "up":
    case "frame_up":
      await backend.frameUp();
      return { success: true };
    case "down":
    case "frame_down":
      await backend.frameDown();
      return { success: true };
    case "goto_frame":
      await backend.gotoFrame(params?.frameId);
      return { success: true };
    case "set_breakpoint":
      return await backend.setBreakpoint(params?.location);
    case "set_temp_breakpoint":
      return await backend.setTempBreakpoint(params?.location);
    case "remove_breakpoint":
      return await backend.removeBreakpoint(params?.id);
    case "remove_all_breakpoints_in_file":
      await backend.removeAllBreakpointsInFile(params?.filePath);
      return { success: true };
    case "get_active_breakpoints":
      return await backend.getBreakpoints();
    case "stack_trace":
      return await backend.getStackTrace(params?.threadId);
    case "get_variables":
      return await backend.getVariables(params?.frameId);
    case "get_arguments":
      return await backend.getArguments(params?.frameId);
    case "get_globals":
      return await backend.getGlobals();
    case "evaluate":
      return await backend.evaluate(params?.expression, params?.frameId);
    case "get_registers":
      return await backend.getRegisters();
    case "read_memory":
      return await backend.readMemory(params?.address, params?.length);
    case "write_memory":
      return await backend.writeMemory(params?.address, params?.data);
    case "list_source":
      return await backend.listSource(params);
    case "get_source":
      return await backend.getSource(params?.expression);
    case "pretty_print":
      return await backend.prettyPrint(params?.expression);
    case "whatis":
      return await backend.whatis(params?.expression);
    case "execute_statement":
      return await backend.executeStatement(params?.statement);
    case "list_all_locals":
      return await backend.listAllLocals();
    case "get_scope_preview":
      return await backend.getScopePreview();
    case "get_last_stop_info":
      return await backend.getLastStopInfo();
    case "get_capabilities":
      return backend.getCapabilities();
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// src/server/HttpServer.ts
var LOG2 = "HttpServer";
var MAX_BODY_SIZE = 1024 * 1024;
var HttpServer = class {
  server = null;
  port;
  /**
   * @brief Initialize the HTTP server.
   *
   * @param [in]  port    The TCP port to bind to (default: 9999).
   */
  constructor(port = 9999) {
    this.port = port;
  }
  /**
   * $DD DD-SW-1.1
   *
   * @brief Start the HTTP server.
   *
   * Binds the server to 127.0.0.1 on the configured port.
   *
   * @return Promise resolving when the server is listening.
   *
   * @throws Error if the port is in use or binding fails.
   *
   * [Satisfies $ARCH-1]
   */
  async start() {
    if (this.server) {
      logger.warn(LOG2, "server.already_running");
      return;
    }
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.onRequest(req, res);
      });
      this.server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          logger.error(LOG2, "port.in_use", { port: this.port });
          reject(new Error(`Port ${this.port} in use`));
        } else {
          logger.error(LOG2, "server.error", { error: err.message });
          reject(err);
        }
      });
      this.server.listen(this.port, "127.0.0.1", () => {
        logger.info(LOG2, "server.listening", { url: `http://127.0.0.1:${this.port}` });
        resolve();
      });
    });
  }
  /**
   * $DD DD-SW-1.2
   *
   * @brief Stop the HTTP server.
   *
   * Gracefully shuts down the server, closing all active connections.
   *
   * @return Promise resolving when the server has stopped.
   */
  async stop() {
    if (!this.server)
      return;
    return new Promise((resolve) => {
      this.server.close(() => {
        this.server = null;
        logger.info(LOG2, "server.stopped");
        resolve();
      });
    });
  }
  /**
   * $DD DD-SW-1.3
   *
   * @brief Check if the server is currently running.
   *
   * @return True if responding to requests.
   */
  isRunning() {
    return this.server !== null;
  }
  /**
   * $DD DD-SW-1.4
   *
   * @brief Get the configured server port.
   *
   * @return Port number.
   */
  getPort() {
    return this.port;
  }
  /**
   * $DD DD-SW-1.5
   *
   * @brief Update the server port.
   *
   * @param [in]  port    New port number.
   *
   * @note Requires restart if server is running.
   */
  setPort(port) {
    this.port = port;
  }
  /**************************************************************************
   * Internal Helpers
   **************************************************************************/
  /**
   * @brief Handle incoming HTTP request.
   *
   * Manages request parsing, routing, and response generation.
   *
   * @param [in]  req     Node.js request object.
   * @param [in]  res     Node.js response object.
   */
  async onRequest(req, res) {
    const startTime = Date.now();
    const method = req.method || "GET";
    const url = req.url || "/";
    console.log(`[${LOG2}] Incoming request: ${method} ${url}`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");
    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    try {
      let body = void 0;
      if (method === "POST" || method === "PUT") {
        body = await this.readBody(req);
      }
      const result = await handleRequest(method, url, body, req);
      const status = result.statusCode || 200;
      const responseBody = JSON.stringify(result.body);
      res.writeHead(status);
      res.end(responseBody);
      const elapsed = Date.now() - startTime;
      logger.info(LOG2, "request.handled", { method, url, status, elapsed });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error(LOG2, "request.failed", { method, url, elapsed, error: error.message });
      if (!res.headersSent && !res.destroyed) {
        try {
          res.writeHead(500);
          res.end(
            JSON.stringify({
              success: false,
              error: error.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            })
          );
        } catch (writeErr) {
          logger.warn(LOG2, "error_response.failed", { error: writeErr.message });
        }
      }
    }
  }
  /**
   * @brief Parse JSON request body.
   *
   * @param [in]  req     Node.js request object.
   *
   * @return Promise resolving to parsed body object.
   */
  readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_SIZE) {
          reject(new Error("Request body too large"));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        if (chunks.length === 0) {
          resolve(void 0);
          return;
        }
        try {
          const raw = Buffer.concat(chunks).toString("utf-8");
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error("Invalid JSON body"));
        }
      });
      req.on("error", reject);
    });
  }
};

// src/protocol/dap/DebugAdapter.ts
var import_debugadapter = __toESM(require_main());
var fs3 = __toESM(require("fs"));
var LOG_FILE3 = "/home/datdang/working/common_dev/ai_vscode_debug/proxy.log";
var AIDebugSession = class _AIDebugSession extends import_debugadapter.LoggingDebugSession {
  static THREAD_ID = 1;
  variableHandles = new import_debugadapter.Handles();
  breakpointIdMap = /* @__PURE__ */ new Map();
  backend;
  isRunning = false;
  stopRequested = false;
  constructor() {
    super("ai-debug.debug");
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerColumnsStartAt1(true);
  }
  /**
   * Initialize debug adapter
   */
  initializeRequest(response, args) {
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
    this.log("Initialize response sent");
  }
  /**
   * Launch debug session
   */
  async launchRequest(response, args) {
    try {
      this.log(`Launch request: ${JSON.stringify(args, null, 2)}`);
      if (!fs3.existsSync(args.program)) {
        this.sendErrorResponse(response, {
          id: 1,
          format: `Program not found: ${args.program}`
        });
        return;
      }
      const config = {
        backendType: args.backendType || "gdb",
        gdbPath: args.gdbPath || "gdb"
      };
      this.backend = backendManager.createBackend(config.backendType, config);
      this.setupBackendEvents();
      await this.backend.initialize(config);
      await this.backend.launch({
        program: args.program,
        cwd: args.cwd,
        stopOnEntry: args.stopOnEntry ?? true
      });
      this.sendEvent(new import_debugadapter.InitializedEvent());
      this.sendResponse(response);
      this.log("Launch complete");
    } catch (error) {
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
  setupBackendEvents() {
    if (!this.backend)
      return;
    this.backend.on("stopped", (event) => {
      this.log(`Backend stopped event: ${event.reason}`);
      this.sendEvent(new import_debugadapter.StoppedEvent(event.reason, event.threadId));
    });
    this.backend.on("running", () => {
      this.log("Backend running event");
      this.isRunning = true;
      this.sendEvent(new import_debugadapter.ContinuedEvent(_AIDebugSession.THREAD_ID));
    });
    this.backend.on("exited", (code) => {
      this.log(`Backend exited with code: ${code}`);
      this.isRunning = false;
      this.sendEvent(new import_debugadapter.TerminatedEvent());
    });
    this.backend.on("output", (output, category) => {
      this.sendEvent(new import_debugadapter.OutputEvent(output, category));
    });
  }
  /**
   * Attach to running process
   */
  async attachRequest(response, args) {
    try {
      this.log(`Attach request: PID ${args.processId}`);
      const config = {
        backendType: "gdb",
        gdbPath: args.gdbPath || "gdb"
      };
      this.backend = backendManager.createBackend(config.backendType, config);
      await this.backend.initialize(config);
      await this.backend.attach({
        processId: args.processId
      });
      this.sendEvent(new import_debugadapter.InitializedEvent());
      this.sendResponse(response);
      this.log("Attach complete");
    } catch (error) {
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
  async continueRequest(response, args) {
    try {
      this.log("Continue request");
      if (!this.backend) {
        this.sendErrorResponse(response, {
          id: 4,
          format: "Debugger not initialized"
        });
        return;
      }
      await this.backend.continue();
      this.isRunning = true;
      this.sendResponse(response);
      this.log("Continue response sent - execution running");
    } catch (error) {
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
  async nextRequest(response, args) {
    try {
      this.log("Next request");
      if (!this.backend) {
        this.sendErrorResponse(response, {
          id: 6,
          format: "Debugger not initialized"
        });
        return;
      }
      await this.backend.stepOver();
      this.sendResponse(response);
      this.log("Next response sent - stepping running");
    } catch (error) {
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
  async stepInRequest(response, args) {
    try {
      this.log("Step in request");
      if (!this.backend) {
        this.sendErrorResponse(response, {
          id: 8,
          format: "Debugger not initialized"
        });
        return;
      }
      await this.backend.stepIn();
      this.sendResponse(response);
      this.log("Step in response sent");
    } catch (error) {
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
  async stepOutRequest(response, args) {
    try {
      this.log("Step out request");
      if (!this.backend) {
        this.sendErrorResponse(response, {
          id: 10,
          format: "Debugger not initialized"
        });
        return;
      }
      await this.backend.stepOut();
      this.sendResponse(response);
      this.log("Step out response sent");
    } catch (error) {
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
  async setBreakpointsRequest(response, args) {
    try {
      this.log(`Set breakpoints: ${JSON.stringify(args, null, 2)}`);
      if (!this.backend) {
        this.sendErrorResponse(response, {
          id: 12,
          format: "Debugger not initialized"
        });
        return;
      }
      const actualBreakpoints = [];
      const sourcePath = args.source.path || "";
      for (const sourceBp of args.breakpoints || []) {
        const result = await this.backend.setBreakpoint({
          path: sourcePath,
          line: sourceBp.line
        });
        const dapId = Date.now() + Math.random();
        this.breakpointIdMap.set(dapId, result.id);
        const bp = new import_debugadapter.Breakpoint(
          result.verified,
          sourceBp.line,
          void 0,
          args.source
        );
        bp.id = dapId;
        actualBreakpoints.push(bp);
      }
      response.body = { breakpoints: actualBreakpoints };
      this.sendResponse(response);
      this.log("Set breakpoints complete");
    } catch (error) {
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
  async stackTraceRequest(response, args) {
    try {
      this.log("Stack trace request");
      if (!this.backend) {
        this.sendErrorResponse(response, {
          id: 14,
          format: "Debugger not initialized"
        });
        return;
      }
      const frames = await this.backend.getStackTrace(args.threadId);
      const stackFrames = frames.map((frame) => ({
        id: frame.id,
        name: frame.name,
        source: {
          name: frame.path?.split("/").pop(),
          path: frame.path
        },
        line: frame.line,
        column: frame.column || 0
      }));
      response.body = {
        stackFrames,
        totalFrames: stackFrames.length
      };
      this.log(`Stack trace response: ${JSON.stringify(response.body, null, 2)}`);
      this.sendResponse(response);
      this.log("Stack trace complete");
    } catch (error) {
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
  async scopesRequest(response, args) {
    try {
      this.log("Scopes request");
      const scopes = [
        new import_debugadapter.Scope("Locals", this.variableHandles.create("locals"), false),
        new import_debugadapter.Scope("Arguments", this.variableHandles.create("arguments"), false),
        new import_debugadapter.Scope("Globals", this.variableHandles.create("globals"), false)
      ];
      response.body = { scopes };
      this.log(`Scopes response: ${JSON.stringify(response.body, null, 2)}`);
      this.sendResponse(response);
      this.log("Scopes complete");
    } catch (error) {
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
  async variablesRequest(response, args) {
    try {
      this.log("Variables request");
      if (!this.backend) {
        this.sendErrorResponse(response, {
          id: 17,
          format: "Debugger not initialized"
        });
        return;
      }
      const scopeType = this.variableHandles.get(args.variablesReference);
      let variables = [];
      if (scopeType === "locals") {
        const vars = await this.backend.getVariables();
        variables = vars.map((v) => new import_debugadapter.Variable(v.name, v.value || "undefined"));
      } else if (scopeType === "arguments") {
        const vars = await this.backend.getArguments();
        variables = vars.map((v) => new import_debugadapter.Variable(v.name, v.value || "undefined"));
      } else if (scopeType === "globals") {
        const vars = await this.backend.getGlobals();
        variables = vars.map((v) => new import_debugadapter.Variable(v.name, v.value || "undefined"));
      }
      response.body = { variables };
      this.log(`Variables response: ${JSON.stringify(response.body, null, 2)}`);
      this.sendResponse(response);
      this.log("Variables complete");
    } catch (error) {
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
  async evaluateRequest(response, args) {
    try {
      this.log(`Evaluate request: ${args.expression}`);
      if (!this.backend) {
        this.sendErrorResponse(response, {
          id: 19,
          format: "Debugger not initialized"
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
      this.log("Evaluate complete");
    } catch (error) {
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
  async restartRequest(response, args) {
    try {
      this.log("Restart request");
      if (this.backend) {
        await this.backend.terminate();
        this.backend = void 0;
      }
      this.sendResponse(response);
      this.log("Restart complete");
    } catch (error) {
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
  async terminateRequest(response, args) {
    try {
      this.log("Terminate request");
      if (this.backend) {
        await this.backend.terminate();
        this.backend = void 0;
      }
      this.sendEvent(new import_debugadapter.TerminatedEvent());
      this.sendResponse(response);
      this.log("Terminate complete");
    } catch (error) {
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
  async disconnectRequest(response, args) {
    try {
      this.log("Disconnect request");
      if (this.backend) {
        await this.backend.terminate();
        this.backend = void 0;
      }
      this.sendResponse(response);
      this.log("Disconnect complete");
    } catch (error) {
      this.log(`Disconnect error: ${error.message}`);
      this.sendErrorResponse(response, {
        id: 23,
        format: error.message
      });
    }
  }
  /**
   * Get threads
   */
  threadsRequest(response) {
    this.log("Threads request");
    response.body = {
      threads: [
        new import_debugadapter.Thread(_AIDebugSession.THREAD_ID, "Thread 1")
      ]
    };
    this.sendResponse(response);
    this.log("Threads complete");
  }
  /**
   * Configuration done (all breakpoints set)
   */
  async configurationDoneRequest(response, args) {
    this.log("Configuration done");
    this.sendResponse(response);
    if (this.backend && !this.isRunning) {
      this.log("Starting backend execution");
      try {
        await this.backend.start();
        this.isRunning = true;
      } catch (error) {
        this.log(`Failed to start backend: ${error.message}`);
      }
    }
  }
  /**
   * Log helper
   */
  log(message) {
    const logMsg = `[AIDebugSession][${(/* @__PURE__ */ new Date()).toISOString()}] ${message}
`;
    console.log(logMsg.trim());
    try {
      fs3.appendFileSync(LOG_FILE3, logMsg);
    } catch (e) {
    }
  }
};

// src/vscode/extension.ts
var LOG3 = "Extension";
var server = null;
function activate(context) {
  logger.info(LOG3, "AI Debug Proxy v3.0 activating...");
  const config = vscode2.workspace.getConfiguration("aiDebugProxy");
  const port = config.get("port", 9999);
  const autoStart = config.get("autoStart", true);
  const logLevel = config.get("logLevel", "info");
  setLogLevel(logLevel);
  setLaunchDelegate(async (params) => {
    logger.info(LOG3, `Triggering VS Code debug UI for AI Proxy...`);
    let workspaceFolder = void 0;
    if (vscode2.workspace.workspaceFolders && vscode2.workspace.workspaceFolders.length > 0) {
      workspaceFolder = vscode2.workspace.workspaceFolders[0];
    }
    return await vscode2.debug.startDebugging(workspaceFolder, {
      type: "ai-debug",
      request: "launch",
      name: `AI Debug Proxy: ${params.program || "Unknown"}`,
      ...params
    });
  });
  server = new HttpServer(port);
  server.start().then(() => {
    logger.info(LOG3, `HTTP Server started on port ${port}`);
  }).catch((error) => {
    logger.error(LOG3, `Failed to start HTTP Server: ${error.message}`);
  });
  const debugAdapterFactory = vscode2.debug.registerDebugAdapterDescriptorFactory(
    "ai-debug",
    {
      createDebugAdapterDescriptor: (session) => {
        logger.info(LOG3, `Creating DebugAdapter for session: ${session.id} (${session.name})`);
        const adapter = new AIDebugSession();
        logger.info(LOG3, "DebugAdapter instance created");
        return new vscode2.DebugAdapterInlineImplementation(adapter);
      }
    }
  );
  context.subscriptions.push(debugAdapterFactory);
  logger.info(LOG3, 'Debug Adapter Factory registered for "ai-debug" type');
  context.subscriptions.push(
    vscode2.commands.registerCommand("ai-debug-proxy.start", async () => {
      if (server?.isRunning()) {
        vscode2.window.showInformationMessage(
          `AI Debug Proxy already running on port ${server.getPort()}`
        );
        return;
      }
      try {
        const currentConfig = vscode2.workspace.getConfiguration("aiDebugProxy");
        const currentPort = currentConfig.get("port", 9999);
        if (!server || server.getPort() !== currentPort) {
          server = new HttpServer(currentPort);
        }
        await server.start();
        vscode2.window.showInformationMessage(
          `AI Debug Proxy started on port ${currentPort}`
        );
      } catch (e) {
        vscode2.window.showErrorMessage(
          `Failed to start AI Debug Proxy: ${e.message}`
        );
      }
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("ai-debug-proxy.stop", async () => {
      if (!server?.isRunning()) {
        vscode2.window.showInformationMessage("AI Debug Proxy is not running");
        return;
      }
      await server.stop();
      vscode2.window.showInformationMessage("AI Debug Proxy stopped");
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("ai-debug-proxy.showLog", () => {
      outputChannel.show();
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("ai-debug-proxy.installCLI", async () => {
      const src = path2.join(context.extensionPath, "resources", "ai-debug.sh");
      const installDir = path2.join(os.homedir(), ".local", "lib", "ai-debug-proxy");
      const dest = path2.join(installDir, "ai-debug.sh");
      try {
        await fs4.promises.mkdir(installDir, { recursive: true });
        await fs4.promises.copyFile(src, dest);
        await fs4.promises.chmod(dest, 493);
        const shellConfig = vscode2.workspace.getConfiguration("terminal.integrated.env");
        const platform2 = os.platform();
        const shellEnv = platform2 === "win32" ? "windows" : platform2 === "darwin" ? "osx" : "linux";
        const currentPath = process.env.PATH || "";
        if (!currentPath.includes(installDir)) {
          const msg = `AI Debug Proxy CLI installed to ${dest}. Add ${installDir} to your PATH to use the 'ai-debug' command.`;
          vscode2.window.showInformationMessage(msg);
        } else {
          vscode2.window.showInformationMessage(`AI Debug Proxy CLI installed to ${dest}. You can now use the 'ai-debug' command.`);
        }
      } catch (e) {
        vscode2.window.showErrorMessage(`Failed to install CLI: ${e.message}`);
      }
    })
  );
  logger.info(LOG3, "AI Debug Proxy v3.0 activated successfully");
}
async function deactivate() {
  logger.info(LOG3, "Deactivating AI Debug Proxy...");
  if (server) {
    await server.stop();
    server = null;
    logger.info(LOG3, "HTTP Server stopped");
  }
  logger.info(LOG3, "AI Debug Proxy deactivated");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
