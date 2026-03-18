"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
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

// src/utils/logging.ts
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
  let extra = "";
  if (data !== void 0) {
    extra = `
  \u2514\u2500 ${stringifySafe(data)}`;
    outputChannel.appendLine(`  \u2514\u2500 ${stringifySafe(data)}`);
  }
  try {
    fs.appendFileSync(LOG_FILE, line + extra + "\n");
  } catch (e) {
  }
}
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
var vscode, fs, path, LOG_LEVELS, currentLevel, LOG_FILE, outputChannel, logger;
var init_logging = __esm({
  "src/utils/logging.ts"() {
    "use strict";
    vscode = __toESM(require("vscode"));
    fs = __toESM(require("fs"));
    path = __toESM(require("path"));
    LOG_LEVELS = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    currentLevel = "info";
    LOG_FILE = path.join(__dirname, "..", "proxy.log");
    outputChannel = typeof vscode.window?.createOutputChannel === "function" ? vscode.window.createOutputChannel("AI Debug Proxy") : {
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
    logger = {
      debug: (component, msg, data) => log("debug", component, msg, data),
      info: (component, msg, data) => log("info", component, msg, data),
      warn: (component, msg, data) => log("warn", component, msg, data),
      error: (component, msg, data) => log("error", component, msg, data)
    };
  }
});

// src/utils/errors.ts
var DebugError, OperationError;
var init_errors = __esm({
  "src/utils/errors.ts"() {
    "use strict";
    DebugError = class _DebugError extends Error {
      /**
       * @brief Create a DebugError.
       *
       * @param [in] code       Machine-readable error code.
       * @param [in] message    Human-readable error message.
       * @param [in] suggestion Optional suggestion for resolving the error.
       * @param [in] details    Optional additional context/details.
       */
      constructor(code, message, suggestion, details) {
        super(message);
        this.code = code;
        this.suggestion = suggestion;
        this.details = details;
        this.name = "DebugError";
        Object.setPrototypeOf(this, _DebugError.prototype);
        Error.captureStackTrace(this, this.constructor);
      }
      /**
       * @brief Convert error to JSON for API response.
       *
       * @return JSON-serializable error object.
       */
      toJSON() {
        return {
          code: this.code,
          message: this.message,
          suggestion: this.suggestion,
          details: this.details
        };
      }
      /**
       * @brief Create a BINARY_NOT_FOUND error.
       *
       * @param [in] path Path to the missing binary.
       * @return DebugError instance.
       */
      static binaryNotFound(path7) {
        return new _DebugError(
          "BINARY_NOT_FOUND" /* BINARY_NOT_FOUND */,
          `Binary not found: ${path7}`,
          `Have you built the project? Check your build configuration and output path.`,
          { path: path7, exists: false }
        );
      }
      /**
       * @brief Create a GDB_NOT_FOUND error.
       *
       * @param [in] path Path to the missing GDB executable.
       * @return DebugError instance.
       */
      static gdbNotFound(path7) {
        return new _DebugError(
          "GDB_NOT_FOUND" /* GDB_NOT_FOUND */,
          `GDB debugger not found: ${path7}`,
          `Install GDB: sudo apt-get install gdb (or configure miDebuggerPath correctly)`,
          { path: path7, exists: false }
        );
      }
      /**
       * @brief Create a WORKSPACE_NOT_FOUND error.
       *
       * @param [in] path Path to the missing workspace.
       * @return DebugError instance.
       */
      static workspaceNotFound(path7) {
        return new _DebugError(
          "WORKSPACE_NOT_FOUND" /* WORKSPACE_NOT_FOUND */,
          `Workspace not found: ${path7}`,
          `Ensure the workspace path is correct and the folder is open in VS Code.`,
          { path: path7, exists: false }
        );
      }
      /**
       * @brief Create a MISSING_PARAMETER error.
       *
       * @param [in] paramName Name of the missing parameter.
       * @return DebugError instance.
       */
      static missingParameter(paramName) {
        return new _DebugError(
          "MISSING_PARAMETER" /* MISSING_PARAMETER */,
          `Missing required parameter: ${paramName}`,
          `Add '${paramName}' field to params object.`,
          { missingField: paramName }
        );
      }
      /**
       * @brief Create an INVALID_PARAMETER error.
       *
       * @param [in] paramName Name of the invalid parameter.
       * @param [in] reason    Reason why the parameter is invalid.
       * @return DebugError instance.
       */
      static invalidParameter(paramName, reason) {
        return new _DebugError(
          "INVALID_PARAMETER" /* INVALID_PARAMETER */,
          `Invalid parameter '${paramName}': ${reason}`,
          `Check the parameter value and try again.`,
          { paramName, reason }
        );
      }
      /**
       * @brief Create an INTERNAL_ERROR.
       *
       * @param [in] message Error message.
       * @param [in] details Optional additional details.
       * @return DebugError instance.
       */
      static internal(message, details) {
        return new _DebugError(
          "INTERNAL_ERROR" /* INTERNAL_ERROR */,
          `Internal error: ${message}`,
          `This is likely a bug in the extension. Please check the logs.`,
          details
        );
      }
    };
    OperationError = class _OperationError extends Error {
      operation;
      cause;
      constructor(operation, message, cause) {
        super(message);
        this.operation = operation;
        this.cause = cause;
        this.name = "OperationError";
        Object.setPrototypeOf(this, _OperationError.prototype);
        Error.captureStackTrace(this, this.constructor);
      }
    };
  }
});

// src/debug/events.ts
var events_exports = {};
__export(events_exports, {
  clearCurrentTopFrameId: () => clearCurrentTopFrameId,
  clearLastStopEvent: () => clearLastStopEvent,
  getCurrentFrameId: () => getCurrentFrameId,
  getCurrentThreadId: () => getCurrentThreadId,
  getCurrentTopFrameId: () => getCurrentTopFrameId,
  getLastLocation: () => getLastLocation,
  getLastStopEventBody: () => getLastStopEventBody,
  getLastStopSessionId: () => getLastStopSessionId,
  invalidateState: () => invalidateState,
  isStateValid: () => isStateValid,
  onDapStopEvent: () => onDapStopEvent,
  registerDebugEventListeners: () => registerDebugEventListeners,
  resolveWaitPromise: () => resolveWaitPromise,
  setCurrentFrameId: () => setCurrentFrameId,
  setCurrentThreadId: () => setCurrentThreadId,
  updateCurrentTopFrameId: () => updateCurrentTopFrameId,
  waitForStopEvent: () => waitForStopEvent
});
function resolveWaitPromise(stopped = true, reason) {
  const resolvers = _stopResolvers.splice(0);
  for (const resolve of resolvers)
    resolve({ stopped, reason });
}
function getCurrentTopFrameId(sessionId) {
  if (sessionId)
    return _sessionState.get(sessionId)?.topFrameId;
  const active = vscode2.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.topFrameId : void 0;
}
function updateCurrentTopFrameId(frameId, sessionId) {
  const id = sessionId ?? vscode2.debug.activeDebugSession?.id;
  if (!id)
    return;
  const state = _sessionState.get(id) ?? {};
  state.topFrameId = frameId;
  state.currentFrameId = frameId;
  state.stateValid = true;
  _sessionState.set(id, state);
}
function clearCurrentTopFrameId(sessionId) {
  const id = sessionId ?? vscode2.debug.activeDebugSession?.id;
  if (id) {
    const state = _sessionState.get(id);
    if (state)
      state.topFrameId = void 0;
  }
}
function getCurrentThreadId(sessionId) {
  if (sessionId)
    return _sessionState.get(sessionId)?.currentThreadId;
  const active = vscode2.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.currentThreadId : void 0;
}
function setCurrentThreadId(threadId, sessionId) {
  const id = sessionId ?? vscode2.debug.activeDebugSession?.id;
  if (!id)
    return;
  const state = _sessionState.get(id) ?? {};
  state.currentThreadId = threadId;
  state.stateValid = true;
  _sessionState.set(id, state);
}
function getCurrentFrameId(sessionId) {
  if (sessionId)
    return _sessionState.get(sessionId)?.currentFrameId;
  const active = vscode2.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.currentFrameId : void 0;
}
function setCurrentFrameId(frameId, sessionId) {
  const id = sessionId ?? vscode2.debug.activeDebugSession?.id;
  if (!id)
    return;
  const state = _sessionState.get(id) ?? {};
  state.currentFrameId = frameId;
  state.stateValid = true;
  _sessionState.set(id, state);
}
function getLastLocation(sessionId) {
  if (sessionId)
    return _sessionState.get(sessionId)?.lastLocation;
  const active = vscode2.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.lastLocation : void 0;
}
function isStateValid(sessionId) {
  if (sessionId)
    return _sessionState.get(sessionId)?.stateValid ?? false;
  const active = vscode2.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.stateValid ?? false : false;
}
function invalidateState(sessionId) {
  const id = sessionId ?? vscode2.debug.activeDebugSession?.id;
  if (!id)
    return;
  const state = _sessionState.get(id) ?? {};
  state.stateValid = false;
  _sessionState.set(id, state);
}
function getLastStopEventBody(sessionId) {
  if (sessionId)
    return _sessionState.get(sessionId)?.lastStopBody;
  const active = vscode2.debug.activeDebugSession;
  return active ? _sessionState.get(active.id)?.lastStopBody : void 0;
}
function getLastStopSessionId() {
  let last;
  for (const [id, state] of _sessionState) {
    if (state.lastStopBody !== void 0)
      last = id;
  }
  return last;
}
function clearLastStopEvent(sessionId) {
  if (sessionId) {
    const state = _sessionState.get(sessionId);
    if (state)
      state.lastStopBody = void 0;
  } else {
    for (const state of _sessionState.values()) {
      state.lastStopBody = void 0;
    }
  }
}
function waitForStopEvent(timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const idx = _stopResolvers.indexOf(resolver);
      if (idx !== -1)
        _stopResolvers.splice(idx, 1);
      const lastStop = getLastStopEventBody();
      if (lastStop) {
        logger.info(LOG, `Program already stopped: reason=${lastStop.reason}`);
        resolve({ stopped: true, reason: lastStop.reason });
      } else {
        logger.warn(LOG, `Stop event timeout after ${timeoutMs}ms`);
        resolve({ stopped: false, reason: "timeout" });
      }
    }, timeoutMs);
    const resolver = (result) => {
      clearTimeout(timer);
      resolve(result);
    };
    _stopResolvers.push(resolver);
  });
}
function onDapStopEvent(callback) {
  stopEventCallbacks.push(callback);
}
function registerDebugEventListeners(context) {
  context.subscriptions.push(
    vscode2.debug.onDidStartDebugSession((session) => {
      logger.info(LOG, `Session started: ${session.name} [${session.id}]`);
      _sessionState.set(session.id, {});
    })
  );
  context.subscriptions.push(
    vscode2.debug.onDidTerminateDebugSession((session) => {
      logger.info(LOG, `Session terminated: ${session.name} [${session.id}]`);
      resolveWaitPromise(false, "terminated");
      _sessionState.delete(session.id);
      clearLastSession();
    })
  );
  context.subscriptions.push(
    vscode2.debug.onDidReceiveDebugSessionCustomEvent((e) => {
      logger.debug(LOG, `Custom event: ${e.event}`);
    })
  );
  context.subscriptions.push(
    vscode2.debug.registerDebugAdapterTrackerFactory(
      "*",
      new DapStopTrackerFactory()
    )
  );
  context.subscriptions.push(
    vscode2.debug.onDidChangeBreakpoints((e) => {
      logger.debug(
        LOG,
        `Breakpoints changed: +${e.added.length} -${e.removed.length} ~${e.changed.length}`
      );
    })
  );
}
var vscode2, LOG, _sessionState, _stopResolvers, stopEventCallbacks, DapStopTracker, DapStopTrackerFactory;
var init_events = __esm({
  "src/debug/events.ts"() {
    "use strict";
    vscode2 = __toESM(require("vscode"));
    init_logging();
    init_session();
    LOG = "Events";
    _sessionState = /* @__PURE__ */ new Map();
    _stopResolvers = [];
    stopEventCallbacks = [];
    DapStopTracker = class {
      constructor(session) {
        this.session = session;
      }
      onDidSendMessage(message) {
        if (message.type === "event") {
          if (message.event === "stopped") {
            const body = message.body || {};
            logger.debug(
              LOG,
              `Stopped event (Tracker): reason=${body.reason}`,
              body
            );
            const state = _sessionState.get(this.session.id) ?? {};
            state.lastStopBody = body;
            if (body.threadId !== void 0) {
              state.currentThreadId = body.threadId;
            }
            state.currentFrameId = 0;
            state.stateValid = true;
            _sessionState.set(this.session.id, state);
            resolveWaitPromise(true, body.reason);
            for (const cb of stopEventCallbacks) {
              try {
                cb(this.session.id, body);
              } catch (err) {
                logger.error(LOG, "Error in stop event callback", err);
              }
            }
          } else if (message.event === "terminated" || message.event === "exited") {
            logger.debug(LOG, `Program ${message.event} (Tracker)`);
            resolveWaitPromise(false, message.event);
          }
        }
      }
    };
    DapStopTrackerFactory = class {
      createDebugAdapterTracker(session) {
        return new DapStopTracker(session);
      }
    };
  }
});

// src/debug/session.ts
function resolveVSCodeVariables(str, workspaceFolder) {
  if (!str)
    return str;
  const wsFolder = workspaceFolder ?? vscode3.workspace.workspaceFolders?.[0];
  const wsPath = wsFolder?.uri.fsPath ?? process.cwd();
  let resolved = str;
  resolved = resolved.replace(/\$\{workspaceFolder\}/g, wsPath);
  resolved = resolved.replace(/\$\{workspaceRoot\}/g, wsPath);
  const activeFile = vscode3.window.activeTextEditor?.document.uri.fsPath;
  if (activeFile) {
    resolved = resolved.replace(/\$\{file\}/g, activeFile);
    resolved = resolved.replace(/\$\{fileBasename\}/g, path2.basename(activeFile));
    resolved = resolved.replace(/\$\{fileDirname\}/g, path2.dirname(activeFile));
  }
  resolved = resolved.replace(/\$\{cwd\}/g, process.cwd());
  resolved = resolved.replace(/\$\{env:([^}]+)\}/g, (_, varName) => {
    return process.env[varName] ?? "";
  });
  resolved = path2.normalize(resolved);
  return resolved;
}
function getActiveSession() {
  return vscode3.debug.activeDebugSession ?? _lastSession;
}
function ensureActiveSession(operationName) {
  const session = vscode3.debug.activeDebugSession ?? _lastSession;
  if (!session) {
    throw new Error(
      `No active debug session for '${operationName}'. Launch a session first.`
    );
  }
  return session;
}
function clearLastSession() {
  _lastSession = void 0;
}
async function launchSession(params) {
  logger.info(LOG2, "Launching debug session", params);
  if (!params.program && !params.configName) {
    throw DebugError.missingParameter("program or configName");
  }
  if (params.program && !fs2.existsSync(params.program)) {
    throw DebugError.binaryNotFound(params.program);
  }
  if (params.miDebuggerPath && !fs2.existsSync(params.miDebuggerPath)) {
    throw DebugError.gdbNotFound(params.miDebuggerPath);
  }
  if (params.workspacePath && !fs2.existsSync(params.workspacePath)) {
    throw DebugError.workspaceNotFound(params.workspacePath);
  }
  let workspaceFolder;
  if (params.workspacePath) {
    const allFolders = vscode3.workspace.workspaceFolders ?? [];
    workspaceFolder = allFolders.find(
      (f) => f.uri.fsPath === params.workspacePath
    );
    if (!workspaceFolder) {
      workspaceFolder = {
        uri: vscode3.Uri.file(params.workspacePath),
        name: path2.basename(params.workspacePath),
        index: 0
      };
      logger.warn(
        LOG2,
        `Workspace path provided (${params.workspacePath}) but not found in open folders. Creating virtual workspace.`
      );
    } else {
      logger.info(LOG2, `Found matching workspace folder: ${workspaceFolder.name}`);
    }
  } else {
    workspaceFolder = vscode3.workspace.workspaceFolders?.[0];
  }
  if (params.configName) {
    logger.info(LOG2, `Using launch.json config: ${params.configName}`);
    const allFolders = vscode3.workspace.workspaceFolders ?? [];
    const searchFolders = allFolders.length > 0 ? allFolders : [void 0];
    let started = false;
    const stopPromise = waitForStopEvent(15e3);
    for (const folder of searchFolders) {
      try {
        started = await vscode3.debug.startDebugging(folder, params.configName);
        if (started)
          break;
      } catch {
      }
    }
    if (started) {
      const stopped = await stopPromise;
      const session = getActiveSession();
      if (session)
        _lastSession = session;
      return {
        success: true,
        sessionId: session?.id || "unknown",
        stopReason: stopped ? "entry" : "running"
      };
    }
    const fallbackDirs = [];
    if (params.workspacePath) {
      fallbackDirs.push(params.workspacePath);
    }
    if (params.program) {
      let dir = path2.dirname(params.program);
      for (let i = 0; i < 6; i++) {
        fallbackDirs.push(dir);
        const parent = path2.dirname(dir);
        if (parent === dir)
          break;
        dir = parent;
      }
    }
    for (const dir of fallbackDirs) {
      const launchJsonPath = path2.join(dir, ".vscode", "launch.json");
      try {
        const raw = await fs2.promises.readFile(launchJsonPath, "utf-8");
        const parsed = JSON.parse(raw);
        const configs = parsed.configurations ?? [];
        const found = configs.find((c) => c.name === params.configName);
        if (!found)
          continue;
        logger.info(
          LOG2,
          `Found config '${params.configName}' in ${launchJsonPath}`
        );
        const wsFolder = {
          uri: vscode3.Uri.file(dir),
          name: path2.basename(dir),
          index: 0
        };
        const resolvedConfig = JSON.parse(
          resolveVSCodeVariables(JSON.stringify(found), wsFolder)
        );
        const stopPromise2 = waitForStopEvent(15e3);
        started = await vscode3.debug.startDebugging(wsFolder, resolvedConfig);
        if (started) {
          const stopped = await stopPromise2;
          const session = getActiveSession();
          if (session)
            _lastSession = session;
          return {
            success: true,
            sessionId: session?.id || "unknown",
            stopReason: stopped ? "entry" : "running"
          };
        }
      } catch (e) {
        logger.warn(LOG2, `Could not read ${launchJsonPath}: ${e.message}`);
      }
    }
    return {
      success: false,
      errorMessage: `Configuration '${params.configName}' not found. Searched workspace folders and fallback paths.`
    };
  } else {
    const debugType = params.type || "cppdbg";
    const isCppdbg = debugType === "cppdbg";
    const programPath = resolveVSCodeVariables(
      params.program || "${workspaceFolder}/a.out",
      workspaceFolder
    );
    const cwdPath = resolveVSCodeVariables(
      params.cwd || workspaceFolder?.uri.fsPath || process.cwd(),
      workspaceFolder
    );
    if (params.program && params.program !== programPath) {
      logger.info(LOG2, `Resolved program path: ${params.program} -> ${programPath}`);
    }
    const debugConfig = {
      name: "AI Debug Proxy",
      type: debugType,
      request: params.request || "launch",
      program: programPath,
      args: params.args || [],
      cwd: cwdPath,
      stopAtEntry: params.stopOnEntry ?? false,
      ...isCppdbg ? {
        environment: params.env ? Object.entries(params.env).map(([k, v]) => ({
          name: k,
          value: v ?? ""
        })) : [],
        externalConsole: false,
        MIMode: "gdb"
      } : {
        env: params.env ?? {}
      },
      ...params.extra
    };
    const stopPromise = waitForStopEvent(15e3);
    const started = await vscode3.debug.startDebugging(
      workspaceFolder,
      debugConfig
    );
    if (!started) {
      return { success: false, errorMessage: "Failed to start debug session" };
    }
    const stopped = await stopPromise;
    const session = getActiveSession();
    if (!session) {
      return {
        success: true,
        sessionId: "unknown",
        stopReason: stopped ? "entry" : "running"
      };
    }
    _lastSession = session;
    return {
      success: true,
      sessionId: session.id,
      stopReason: stopped ? "entry" : "running"
    };
  }
}
async function restartSession() {
  const session = getActiveSession();
  if (!session) {
    return {
      success: false,
      errorMessage: "No active debug session to restart"
    };
  }
  try {
    await vscode3.commands.executeCommand("workbench.action.debug.restart");
    return { success: true };
  } catch (e) {
    return { success: false, errorMessage: `Restart failed: ${e.message}` };
  }
}
async function quitSession() {
  const session = getActiveSession();
  if (!session) {
    return { success: false, errorMessage: "No active debug session to quit" };
  }
  try {
    await vscode3.commands.executeCommand("workbench.action.debug.stop");
    return { success: true };
  } catch (e) {
    return { success: false, errorMessage: `Quit failed: ${e.message}` };
  }
}
var vscode3, path2, fs2, LOG2, _lastSession;
var init_session = __esm({
  "src/debug/session.ts"() {
    "use strict";
    vscode3 = __toESM(require("vscode"));
    path2 = __toESM(require("path"));
    fs2 = __toESM(require("fs"));
    init_logging();
    init_errors();
    init_events();
    LOG2 = "Session";
  }
});

// src/debug/inspection.ts
var inspection_exports = {};
__export(inspection_exports, {
  evaluate: () => evaluate,
  executeStatement: () => executeStatement,
  frameDown: () => frameDown,
  frameUp: () => frameUp,
  getSource: () => getSource,
  getStackFrameVariables: () => getStackFrameVariables,
  getStackTrace: () => getStackTrace,
  gotoFrame: () => gotoFrame,
  listAllLocals: () => listAllLocals,
  listSource: () => listSource,
  prettyPrint: () => prettyPrint,
  whatis: () => whatis
});
async function getThreadId(session) {
  const currentThreadId = getCurrentThreadId(session.id);
  if (currentThreadId !== void 0) {
    logger.debug(LOG4, `Using cached threadId: ${currentThreadId}`);
    return currentThreadId;
  }
  const stopBody = getLastStopEventBody(session.id);
  if (stopBody?.threadId) {
    return stopBody.threadId;
  }
  try {
    const res = await session.customRequest("threads");
    if (!stopBody?.threadId) {
      logger.warn(LOG4, "No stop event threadId, falling back to first thread");
    }
    return res.threads?.[0]?.id ?? 1;
  } catch {
    return 1;
  }
}
async function getStackTrace(session) {
  try {
    const threadId = await getThreadId(session);
    const res = await session.customRequest("stackTrace", {
      threadId,
      startFrame: 0,
      levels: 50
    });
    const frames = (res.stackFrames || []).map((f) => ({
      id: f.id,
      name: f.name || "<unknown>",
      sourcePath: f.source?.path || "",
      line: f.line || 0,
      column: f.column || 0
    }));
    if (frames.length > 0) {
      updateCurrentTopFrameId(frames[0].id);
      const topFrame = frames[0];
      setCurrentFrameId(topFrame.id, session.id);
    }
    return { success: true, frames, totalFrames: res.totalFrames };
  } catch (e) {
    logger.error(LOG4, `Stack trace failed: ${e.message}`);
    return { success: false, errorMessage: e.message, frames: [] };
  }
}
async function getStackFrameVariables(session, params) {
  const frameId = params.frameId ?? getCurrentTopFrameId();
  if (frameId === void 0) {
    return {
      success: false,
      errorMessage: "No frame ID available. Get stack trace first.",
      scopes: []
    };
  }
  try {
    const scopesRes = await session.customRequest("scopes", { frameId });
    const scopes = [];
    for (const scope of scopesRes.scopes || []) {
      if (params.scopeFilter && !params.scopeFilter.includes(scope.name)) {
        continue;
      }
      if (scope.expensive && !params.scopeFilter?.includes(scope.name)) {
        continue;
      }
      try {
        const varsRes = await session.customRequest("variables", {
          variablesReference: scope.variablesReference
        });
        scopes.push({
          name: scope.name,
          variables: (varsRes.variables || []).map((v) => ({
            name: v.name,
            // Sanitize value: strip control characters that cause jq parse
            // errors in shell pipelines (e.g. GDB emits \v, raw \x?? seqs)
            value: typeof v.value === "string" ? v.value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") : v.value,
            type: v.type || void 0,
            variablesReference: v.variablesReference || 0
          }))
        });
      } catch (e) {
        logger.warn(
          LOG4,
          `Failed to get variables for scope '${scope.name}': ${e.message}`
        );
        scopes.push({ name: scope.name, variables: [] });
      }
    }
    return { success: true, scopes };
  } catch (e) {
    logger.error(LOG4, `Get variables failed: ${e.message}`);
    return { success: false, errorMessage: e.message, scopes: [] };
  }
}
async function listAllLocals(session, frameId) {
  try {
    const res = await getStackFrameVariables(session, {
      frameId,
      scopeFilter: ["Locals", "Local", "Arguments", "Args", "Parameters"]
    });
    if (!res.success) {
      return { success: false, variables: [], errorMessage: res.errorMessage };
    }
    const allVars = [];
    const seen = /* @__PURE__ */ new Set();
    for (const scope of res.scopes) {
      for (const v of scope.variables) {
        if (!seen.has(v.name)) {
          allVars.push(v);
          seen.add(v.name);
        }
      }
    }
    return { success: true, variables: allVars };
  } catch (e) {
    return { success: false, variables: [], errorMessage: e.message };
  }
}
async function listSource(session, params) {
  const frameId = params.frameId ?? getCurrentTopFrameId();
  if (frameId === void 0) {
    return { success: false, errorMessage: "No frame ID available" };
  }
  try {
    const traceRes = await getStackTrace(session);
    const frame = traceRes.frames.find((f) => f.id === frameId) || traceRes.frames[0];
    if (!frame || !frame.sourcePath) {
      return { success: false, errorMessage: "No source path for frame" };
    }
    let fsPath = frame.sourcePath;
    if (/^[a-z][\w+\-.]*:\/\//i.test(fsPath)) {
      fsPath = vscode5.Uri.parse(fsPath).path;
    }
    let uri;
    const workspaceFolder = vscode5.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const relPath = vscode5.workspace.asRelativePath(fsPath, false);
      if (relPath === fsPath) {
        uri = vscode5.Uri.file(fsPath);
      } else {
        uri = vscode5.Uri.joinPath(workspaceFolder.uri, relPath);
      }
    } else {
      uri = vscode5.Uri.file(fsPath);
    }
    const doc = await vscode5.workspace.openTextDocument(uri);
    const lines = doc.getText().split("\n");
    const around = params.linesAround ?? 10;
    const start = Math.max(0, frame.line - 1 - around);
    const end = Math.min(lines.length, frame.line - 1 + around + 1);
    const sourceLines = lines.slice(start, end).map((line, i) => {
      const lineNum = start + i + 1;
      const marker = lineNum === frame.line ? ">>>" : "   ";
      const cleanLine = line.replace(/[\x00-\x1F]/g, (char) => {
        if (char === "	")
          return "    ";
        return "";
      });
      return `${marker} ${String(lineNum).padStart(4)} | ${cleanLine}`;
    });
    return {
      success: true,
      sourceCode: sourceLines.join("\n"),
      currentLine: frame.line
    };
  } catch (e) {
    return { success: false, errorMessage: e.message };
  }
}
async function frameUp(session) {
  try {
    await vscode5.commands.executeCommand("workbench.action.debug.callStackUp");
    return { success: true };
  } catch (e) {
    return { success: false, errorMessage: e.message };
  }
}
async function frameDown(session) {
  try {
    await vscode5.commands.executeCommand(
      "workbench.action.debug.callStackDown"
    );
    return { success: true };
  } catch (e) {
    return { success: false, errorMessage: e.message };
  }
}
async function gotoFrame(session, params) {
  if (params.frameId !== void 0) {
    updateCurrentTopFrameId(params.frameId);
    return { success: true };
  }
  return { success: false, errorMessage: "frameId is required" };
}
async function evaluate(session, params) {
  const frameId = params.frameId ?? getCurrentFrameId(session.id) ?? getCurrentTopFrameId();
  if (frameId === void 0) {
    return {
      success: false,
      errorMessage: "No frame available for evaluation. Ensure debugger is stopped at a breakpoint.",
      result: "",
      variablesReference: 0
    };
  }
  try {
    const res = await session.customRequest("evaluate", {
      expression: params.expression,
      frameId,
      context: params.context || "watch"
    });
    if (params.raw) {
      return {
        success: true,
        result: res.result,
        type: res.type,
        variablesReference: res.variablesReference || 0
      };
    }
    if (res.result && typeof res.result === "string") {
      const result = res.result;
      if (result.includes("-var-create") || result.includes("unable to create variable") || result.includes("No symbol") || result.includes("not available")) {
        let errorMessage = `Cannot evaluate expression '${params.expression}'.`;
        if (result.includes("-var-create") || result.includes("unable to create")) {
          errorMessage += " Variable may be optimized out or not in current scope.";
        } else if (result.includes("No symbol")) {
          errorMessage += " Symbol not found. Check variable name and scope.";
        } else if (result.includes("not available")) {
          errorMessage += " Expression is not available in the current context.";
        }
        logger.debug(LOG4, `Evaluation returned error for '${params.expression}': ${result}`);
        return {
          success: false,
          errorMessage,
          result: "",
          variablesReference: 0
        };
      }
    }
    return {
      success: true,
      result: res.result,
      type: res.type,
      variablesReference: res.variablesReference || 0
    };
  } catch (e) {
    if (params.raw) {
      return {
        success: false,
        errorMessage: e.message,
        result: "",
        variablesReference: 0
      };
    }
    let errorMessage = e.message;
    if (errorMessage.includes("-var-create")) {
      errorMessage = `Cannot evaluate expression '${params.expression}'. Variable may be optimized out or not in current scope.`;
    } else if (errorMessage.includes("not available")) {
      errorMessage = `Expression '${params.expression}' is not available in the current context.`;
    } else if (errorMessage.includes("No symbol")) {
      errorMessage = `Symbol '${params.expression}' not found. Check variable name and scope.`;
    }
    logger.debug(LOG4, `Evaluation failed for '${params.expression}': ${e.message}`);
    return {
      success: false,
      errorMessage,
      result: "",
      variablesReference: 0
    };
  }
}
async function prettyPrint(session, params) {
  const evalResult = await evaluate(session, params);
  if (!evalResult.success) {
    return {
      success: false,
      errorMessage: evalResult.errorMessage,
      result: "",
      variablesReference: 0
    };
  }
  const base = {
    success: true,
    result: evalResult.result,
    type: evalResult.type,
    variablesReference: evalResult.variablesReference
  };
  if (evalResult.variablesReference > 0) {
    try {
      const varsRes = await session.customRequest("variables", {
        variablesReference: evalResult.variablesReference
      });
      base.fields = (varsRes.variables || []).map((v) => ({
        name: v.name,
        type: v.type || void 0,
        value: typeof v.value === "string" ? v.value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") : String(v.value ?? "")
      }));
    } catch {
    }
  }
  return base;
}
async function whatis(session, params) {
  return evaluate(session, {
    ...params,
    expression: `(typeof ${params.expression})`,
    context: "repl"
  });
}
async function executeStatement(session, params) {
  return evaluate(session, {
    expression: params.statement,
    context: "repl",
    frameId: params.frameId
  });
}
async function getSource(session, params) {
  try {
    const result = await evaluate(session, {
      expression: params.expression,
      context: "repl",
      frameId: params.frameId
    });
    return {
      success: result.success,
      sourcePath: result.result,
      errorMessage: result.errorMessage
    };
  } catch (e) {
    return { success: false, errorMessage: e.message };
  }
}
var vscode5, LOG4;
var init_inspection = __esm({
  "src/debug/inspection.ts"() {
    "use strict";
    vscode5 = __toESM(require("vscode"));
    init_logging();
    init_events();
    LOG4 = "Inspection";
  }
});

// src/agent/SubagentOrchestrator.ts
var SubagentOrchestrator_exports = {};
__export(SubagentOrchestrator_exports, {
  SubagentOrchestrator: () => SubagentOrchestrator,
  subagentOrchestrator: () => subagentOrchestrator
});
var import_child_process2, vscode8, LOG14, MAX_TASKS, MAX_CONCURRENCY, MAX_OUTPUT_BYTES, SubagentOrchestrator, subagentOrchestrator;
var init_SubagentOrchestrator = __esm({
  "src/agent/SubagentOrchestrator.ts"() {
    "use strict";
    import_child_process2 = require("child_process");
    vscode8 = __toESM(require("vscode"));
    init_logging();
    LOG14 = "SubagentOrchestrator";
    MAX_TASKS = 50;
    MAX_CONCURRENCY = 5;
    MAX_OUTPUT_BYTES = 1024 * 1024;
    SubagentOrchestrator = class {
      /**
       * $DD DD-SW-5.1
       *
       * @brief Executes multiple external agent tasks with a concurrency limit.
       *
       * @param [in]  tasks           The array of subagent CLI tasks to run.
       * @param [in]  timeoutMs       Maximum time to wait before killing a task.
       * @param [in]  maxConcurrency   Maximum number of tasks to run simultaneously.
       *
       * @return Promise resolving to an array of results.
       *
       * @throws Error if the task count exceeds MAX_TASKS.
       *
       * [Satisfies $ARCH ARCH-5]
       */
      async runParallelSubagents(tasks, timeoutMs = 6e4, maxConcurrency = MAX_CONCURRENCY) {
        if (tasks.length > MAX_TASKS) {
          throw new Error(`Too many tasks: ${tasks.length} (max ${MAX_TASKS})`);
        }
        logger.info(
          LOG14,
          `Starting ${tasks.length} subagent tasks (concurrency=${maxConcurrency})...`
        );
        const results = new Array(tasks.length);
        let nextIndex = 0;
        const runNext = async () => {
          while (nextIndex < tasks.length) {
            const index = nextIndex++;
            results[index] = await this.runSingleSubagent(tasks[index], timeoutMs);
          }
        };
        const workers = Array.from(
          { length: Math.min(maxConcurrency, tasks.length) },
          () => runNext()
        );
        await Promise.all(workers);
        logger.info(LOG14, `All ${tasks.length} subagents completed.`);
        return results;
      }
      /**************************************************************************
       * Internal Helpers
       **************************************************************************/
      /**
       * @brief Run a single subagent task.
       *
       * @param [in]  task        Task configuration.
       * @param [in]  timeoutMs   Execution timeout.
       *
       * @return Promise resolving to the individual task result.
       */
      runSingleSubagent(task, timeoutMs) {
        return new Promise((resolve) => {
          const config = vscode8.workspace.getConfiguration("aiDebugProxy");
          const allowedCommands = config.get("subagents.allowedCommands", []);
          if (allowedCommands.length === 0 || !allowedCommands.includes(task.command)) {
            logger.error(LOG14, `[Subagent ${task.id}] Blocked by whitelist: ${task.command}`);
            resolve({
              id: task.id,
              success: false,
              stdout: "",
              stderr: `Command '${task.command}' is not whitelisted in aiDebugProxy.subagents.allowedCommands`,
              exitCode: -3
            });
            return;
          }
          logger.debug(
            LOG14,
            `[Subagent ${task.id}] Spawning: ${task.command} ${task.args.join(" ")}`
          );
          const child = (0, import_child_process2.spawn)(task.command, task.args, {
            shell: false
          });
          if (task.input) {
            child.stdin.write(task.input);
            child.stdin.end();
          }
          let stdoutStr = "";
          let stderrStr = "";
          child.stdout.on("data", (data) => {
            if (stdoutStr.length < MAX_OUTPUT_BYTES) {
              stdoutStr += data.toString();
              if (stdoutStr.length >= MAX_OUTPUT_BYTES) {
                stdoutStr = stdoutStr.slice(0, MAX_OUTPUT_BYTES) + "\n[Output truncated]";
              }
            }
          });
          child.stderr.on("data", (data) => {
            if (stderrStr.length < MAX_OUTPUT_BYTES) {
              stderrStr += data.toString();
            }
          });
          let timeout = setTimeout(() => {
            logger.warn(
              LOG14,
              `[Subagent ${task.id}] Timed out after ${timeoutMs}ms. Killing process...`
            );
            child.kill();
            resolve({
              id: task.id,
              success: false,
              stdout: stdoutStr,
              stderr: stderrStr + `
[Timeout after ${timeoutMs}ms]`,
              exitCode: -1
            });
            timeout = null;
          }, timeoutMs);
          child.on("close", (code) => {
            if (timeout) {
              clearTimeout(timeout);
            }
            logger.debug(LOG14, `[Subagent ${task.id}] Exited with code ${code}`);
            resolve({
              id: task.id,
              success: code === 0,
              stdout: stdoutStr,
              stderr: stderrStr,
              exitCode: code
            });
          });
          child.on("error", (err) => {
            if (timeout) {
              clearTimeout(timeout);
            }
            logger.error(
              LOG14,
              `[Subagent ${task.id}] Failed to spawn: ${err.message}`
            );
            resolve({
              id: task.id,
              success: false,
              stdout: stdoutStr,
              stderr: err.message,
              exitCode: -2
            });
          });
        });
      }
    };
    subagentOrchestrator = new SubagentOrchestrator();
  }
});

// src/agent/prompts.ts
var prompts_exports = {};
__export(prompts_exports, {
  subagentCreatorPrompt: () => subagentCreatorPrompt
});
var subagentCreatorPrompt;
var init_prompts = __esm({
  "src/agent/prompts.ts"() {
    "use strict";
    subagentCreatorPrompt = `---
name: user-defined-agent-creator
description: >
  Expert system for creating high-quality, reusable predefined subagents following best practices.
  MAIN AGENT INSTRUCTIONS: Before launching this subagent, you MUST gather the following information
  from the user: (1) Whether this should be project-level (.ai-debug/agents/) or user-level
  (~/.ai-debug/agents/), (2) The specific task/workflow the subagent will handle, (3) Key requirements
  and constraints, (4) Any specific methodologies or best practices to emphasize. After gathering
  this info, launch this subagent with ALL details. Once the subagent completes, review the created
  file with the user and iterate if needed.
---

You are an autonomous subagent creator that will generate and save a high-quality predefined subagent based on the requirements provided. You will work independently without asking questions.

## CRITICAL INSTRUCTIONS
- **ONLY CREATE MD FILES**: You must ONLY create a single markdown (.md) file for the subagent definition
- **NO ADDITIONAL FILES**: Do NOT create user guides, documentation files, example files, or any other supplementary files
- **SINGLE FILE OUTPUT**: The entire subagent must be self-contained in one MD file

## Your Mission

You have been provided with all necessary information to create a predefined subagent. You will:
1. Analyze the requirements and reflect on available tools
2. Identify optimal tool usage patterns for the specific domain
3. Apply industry best practices with tool-aware workflows
4. Generate a comprehensive system prompt leveraging the proxy's capabilities
5. Save ONLY the MD file to the appropriate location
6. Report the result

## Core Principles You Will Apply

### Software Engineering Best Practices
- **DRY (Don't Repeat Yourself)**: Ensure the subagent promotes code reusability
- **KISS (Keep It Simple, Stupid)**: Design clear, straightforward workflows
- **SOLID Principles**: Single responsibility, open-closed, proper abstractions
- **YAGNI (You Aren't Gonna Need It)**: Focus on current requirements, not hypothetical futures
- **Clean Code**: Readable, maintainable, and well-structured approaches
- **Defensive Programming**: Handle edge cases and validate inputs
- **Fail Fast**: Early error detection and clear error messaging

## Available Tools and Capabilities

### Core Development Tools
- **File Operations**: Read, Write, Edit, MultiEdit for efficient code manipulation
- **Search Tools**: Grep, Glob, LS for codebase exploration and pattern matching
- **Version Control**: Git operations for commits, diffs, status checks
- **Terminal**: Bash execution with background processes and output monitoring

### Specialized Debugging Tools
- **Session Control**: Start/stop debug sessions, manage configurations
- **Breakpoints**: Set/remove breakpoints, conditional breakpoints, logpoints
- **Execution Control**: Step over/into/out, continue, pause, restart
- **Inspection**: Evaluate expressions, get variables, stack traces, scopes

### Language Server Protocol (LSP) Tools
- **Navigation**: GoToDefinition, FindImplementations, FindUsages, GetDeclaration
- **Code Intelligence**: GetHoverInfo, GetCompletions, GetSignatureHelp, GetCodeActions
- **Symbol Operations**: GetSymbols, GetWorkspaceSymbols
- **Refactoring**: Rename, GetTypeHierarchy, GetCallHierarchy

## Workflow

### Step 1: Analyze Requirements
- Extract the core problem this subagent solves
- Identify which tools are most relevant
- Map requirements to specific tool capabilities

### Step 2: Design the Tool-Aware System Prompt
Create a comprehensive prompt that includes:
1. **Role Definition**
2. **Methodology Section**
3. **Standards and Principles**
4. **Output Specifications**

### Step 3: Generate the Tool-Optimized Subagent File
Create the markdown file with this exact format:

\`\`\`markdown
---
name: [unique-kebab-case-identifier]
description: [Concise description of purpose and key tools used]
---

[Comprehensive system prompt]

## Core Responsibilities
[What this subagent does]

## Primary Tools and Usage Patterns
[List the main tools and how]

## Methodology
[Step-by-step approach with explicit tool usage]

## Tool Optimization Guidelines
[Specific patterns for efficiency]
\`\`\`

### Step 4: Save ONLY the MD File (Critical)
Save to:
- **Project-level**: \`.ai-debug/agents/[name].md\`
- **User-level**: \`~/.ai-debug/agents/[name].md\`

### Step 5: Report Results
`;
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var fs7 = __toESM(require("fs"));
var os = __toESM(require("os"));
var path6 = __toESM(require("path"));
var vscode11 = __toESM(require("vscode"));

// src/server/HttpServer.ts
var http = __toESM(require("http"));
init_logging();

// src/server/router.ts
var path5 = __toESM(require("path"));
var fs6 = __toESM(require("fs"));

// src/debug/DebugController.ts
var vscode6 = __toESM(require("vscode"));
init_logging();

// src/utils/validation.ts
function ok(params) {
  return { isValid: true, params };
}
function fail(message) {
  return { isValid: false, message };
}
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isNumber(v) {
  return typeof v === "number" && !isNaN(v);
}
function validateLocation(loc) {
  if (!loc || typeof loc !== "object")
    return null;
  if (!isNonEmptyString(loc.path) || !isNumber(loc.line))
    return null;
  return { path: loc.path, line: loc.line, column: loc.column };
}
function validateOperationArgs(operation, args) {
  switch (operation) {
    case "continue":
    case "next":
    case "step_in":
    case "step_out":
    case "restart":
    case "quit":
    case "stack_trace":
    case "up":
    case "down":
    case "get_active_breakpoints":
    case "get_last_stop_info":
    case "get_scope_preview":
      return ok(args || {});
    case "launch": {
      if (!args || typeof args !== "object")
        return ok({});
      return ok(args);
    }
    case "set_breakpoint":
    case "set_temp_breakpoint":
    case "remove_breakpoint": {
      if (!args)
        return fail(`'${operation}' requires a 'location' parameter`);
      const loc = validateLocation(args.location);
      if (!loc)
        return fail(
          `'${operation}' requires 'location' with 'path' (string) and 'line' (number)`
        );
      return ok({ ...args, location: loc });
    }
    case "remove_all_breakpoints_in_file": {
      if (!args || !isNonEmptyString(args.filePath)) {
        return fail(
          "'remove_all_breakpoints_in_file' requires 'filePath' (string)"
        );
      }
      return ok(args);
    }
    case "disable_breakpoint":
    case "enable_breakpoint": {
      if (!args)
        return fail(`'${operation}' requires a 'location' parameter`);
      const loc = validateLocation(args.location);
      if (!loc)
        return fail(
          `'${operation}' requires 'location' with 'path' and 'line'`
        );
      return ok({
        ...args,
        location: loc,
        enable: operation === "enable_breakpoint"
      });
    }
    case "ignore_breakpoint": {
      if (!args)
        return fail(
          "'ignore_breakpoint' requires 'location' and 'ignoreCount'"
        );
      const loc = validateLocation(args.location);
      if (!loc)
        return fail(
          "'ignore_breakpoint' requires 'location' with 'path' and 'line'"
        );
      if (args.ignoreCount !== null && !isNumber(args.ignoreCount)) {
        return fail("'ignoreCount' must be a number or null");
      }
      return ok({ ...args, location: loc });
    }
    case "set_breakpoint_condition": {
      if (!args)
        return fail(
          "'set_breakpoint_condition' requires 'location' and 'condition'"
        );
      const loc = validateLocation(args.location);
      if (!loc)
        return fail("requires 'location' with 'path' and 'line'");
      return ok({ ...args, location: loc });
    }
    case "jump":
    case "until": {
      if (!args || !isNumber(args.line)) {
        return fail(`'${operation}' requires 'line' (number)`);
      }
      return ok(args);
    }
    case "goto_frame": {
      if (!args || !isNumber(args.frameId)) {
        return fail("'goto_frame' requires 'frameId' (number)");
      }
      return ok(args);
    }
    case "list_source":
      return ok(args || {});
    case "get_source": {
      if (!args || !isNonEmptyString(args.expression)) {
        return fail("'get_source' requires 'expression' (string)");
      }
      return ok(args);
    }
    case "get_stack_frame_variables":
    case "get_args":
    case "list_all_locals":
      return ok(args || {});
    case "evaluate":
    case "pretty_print":
    case "whatis": {
      if (!args || !isNonEmptyString(args.expression)) {
        return fail(`'${operation}' requires 'expression' (string)`);
      }
      return ok(args);
    }
    case "execute_statement": {
      if (!args || !isNonEmptyString(args.statement)) {
        return fail("'execute_statement' requires 'statement' (string)");
      }
      return ok(args);
    }
    case "list_threads":
      return ok(args || {});
    case "switch_thread": {
      if (!args || !isNumber(args.threadId)) {
        return fail("'switch_thread' requires 'threadId' (number)");
      }
      return ok(args);
    }
    case "get_registers": {
      if (args && args.frameId !== void 0 && !isNumber(args.frameId)) {
        return fail("'get_registers' requires 'frameId' to be a number if provided");
      }
      return ok(args || {});
    }
    case "read_memory": {
      if (!args || !isNonEmptyString(args.memoryReference) || !isNumber(args.count)) {
        return fail("'read_memory' requires 'memoryReference' (string) and 'count' (number)");
      }
      if (args.offset !== void 0 && !isNumber(args.offset)) {
        return fail("'read_memory' requires 'offset' to be a number if provided");
      }
      return ok(args);
    }
    case "disassemble": {
      if (!args || !isNonEmptyString(args.memoryReference) || !isNumber(args.instructionCount)) {
        return fail("'disassemble' requires 'memoryReference' (string) and 'instructionCount' (number)");
      }
      if (args.offset !== void 0 && !isNumber(args.offset)) {
        return fail("'offset' must be a number");
      }
      if (args.instructionOffset !== void 0 && !isNumber(args.instructionOffset)) {
        return fail("'instructionOffset' must be a number");
      }
      return ok(args);
    }
    case "get_data_breakpoint_info": {
      if (!args || !isNonEmptyString(args.name)) {
        return fail("'get_data_breakpoint_info' requires 'name' (string)");
      }
      return ok(args);
    }
    case "set_data_breakpoint": {
      if (!args || !isNonEmptyString(args.dataId)) {
        return fail("'set_data_breakpoint' requires 'dataId' (string)");
      }
      return ok(args);
    }
    case "watch": {
      if (!args || !isNonEmptyString(args.name)) {
        return fail("'watch' requires 'name' (string)");
      }
      if (args.accessType !== void 0 && !["read", "write", "readWrite"].includes(args.accessType)) {
        return fail("'watch' accessType must be 'read', 'write', or 'readWrite'");
      }
      return ok(args);
    }
    default:
      return fail(`Unknown operation: '${operation}'`);
  }
}

// src/debug/DebugController.ts
init_session();

// src/debug/breakpoints.ts
var vscode4 = __toESM(require("vscode"));
var path3 = __toESM(require("path"));
var fs3 = __toESM(require("fs"));
init_logging();
var LOG3 = "Breakpoints";
function findBreakpointAtLocation(path7, line) {
  const uri = vscode4.Uri.file(path7);
  return vscode4.debug.breakpoints.find((bp) => {
    if (bp instanceof vscode4.SourceBreakpoint) {
      return bp.location.uri.fsPath === uri.fsPath && bp.location.range.start.line === line - 1;
    }
    return false;
  });
}
async function setBreakpoint(params) {
  const { location, condition, hitCondition, logMessage } = params;
  logger.info(LOG3, `Setting breakpoint at ${location.path}:${location.line}`);
  const normalizedPath = path3.normalize(location.path);
  if (!path3.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Breakpoint path must be absolute" };
  }
  if (!fs3.existsSync(normalizedPath)) {
    return { success: false, errorMessage: "File not found for breakpoint" };
  }
  try {
    const uri = vscode4.Uri.file(normalizedPath);
    const pos = new vscode4.Position(
      location.line - 1,
      (location.column ?? 1) - 1
    );
    const loc = new vscode4.Location(uri, pos);
    const bp = new vscode4.SourceBreakpoint(
      loc,
      true,
      condition,
      hitCondition,
      logMessage
    );
    vscode4.debug.addBreakpoints([bp]);
    logger.info(LOG3, `Breakpoint set at ${location.path}:${location.line}`);
    return { success: true };
  } catch (e) {
    logger.error(LOG3, `Failed to set breakpoint: ${e.message}`);
    return { success: false, errorMessage: e.message };
  }
}
async function setTempBreakpoint(params) {
  return setBreakpoint(params);
}
async function removeBreakpointByLocation(params) {
  const { location } = params;
  logger.info(LOG3, `Removing breakpoint at ${location.path}:${location.line}`);
  const normalizedPath = path3.normalize(location.path);
  if (!path3.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Path must be absolute" };
  }
  const existing = findBreakpointAtLocation(normalizedPath, location.line);
  if (!existing) {
    return {
      success: false,
      errorMessage: `No breakpoint found at ${location.path}:${location.line}`
    };
  }
  vscode4.debug.removeBreakpoints([existing]);
  logger.info(LOG3, `Breakpoint removed at ${location.path}:${location.line}`);
  return { success: true };
}
async function removeAllBreakpointsInFile(filePath) {
  logger.info(LOG3, `Removing all breakpoints in ${filePath}`);
  const normalizedPath = path3.normalize(filePath);
  if (!path3.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Path must be absolute" };
  }
  const uri = vscode4.Uri.file(normalizedPath);
  const toRemove = vscode4.debug.breakpoints.filter((bp) => {
    if (bp instanceof vscode4.SourceBreakpoint) {
      return bp.location.uri.fsPath === uri.fsPath;
    }
    return false;
  });
  if (toRemove.length === 0) {
    return { success: true, errorMessage: "No breakpoints found in file" };
  }
  vscode4.debug.removeBreakpoints(toRemove);
  logger.info(LOG3, `Removed ${toRemove.length} breakpoints from ${filePath}`);
  return { success: true };
}
async function toggleBreakpoint(params) {
  const { location, enable } = params;
  logger.info(
    LOG3,
    `${enable ? "Enabling" : "Disabling"} breakpoint at ${location.path}:${location.line}`
  );
  const normalizedPath = path3.normalize(location.path);
  if (!path3.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Path must be absolute" };
  }
  const existing = findBreakpointAtLocation(normalizedPath, location.line);
  if (!existing) {
    return {
      success: false,
      errorMessage: `No breakpoint found at ${location.path}:${location.line}`
    };
  }
  vscode4.debug.removeBreakpoints([existing]);
  const uri = vscode4.Uri.file(location.path);
  const pos = new vscode4.Position(location.line - 1, 0);
  const loc = new vscode4.Location(uri, pos);
  const newBp = new vscode4.SourceBreakpoint(
    loc,
    enable,
    existing.condition,
    existing.hitCondition,
    existing.logMessage
  );
  vscode4.debug.addBreakpoints([newBp]);
  return { success: true };
}
async function ignoreBreakpoint(params) {
  const { location, ignoreCount } = params;
  const normalizedPath = path3.normalize(location.path);
  if (!path3.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Path must be absolute" };
  }
  const existing = findBreakpointAtLocation(normalizedPath, location.line);
  if (!existing) {
    return {
      success: false,
      errorMessage: `No breakpoint at ${location.path}:${location.line}`
    };
  }
  vscode4.debug.removeBreakpoints([existing]);
  const uri = vscode4.Uri.file(location.path);
  const pos = new vscode4.Position(location.line - 1, 0);
  const loc = new vscode4.Location(uri, pos);
  const hitCond = ignoreCount !== null ? String(ignoreCount) : void 0;
  const newBp = new vscode4.SourceBreakpoint(
    loc,
    true,
    existing.condition,
    hitCond,
    existing.logMessage
  );
  vscode4.debug.addBreakpoints([newBp]);
  return { success: true };
}
async function setBreakpointCondition(params) {
  const { location, condition } = params;
  const normalizedPath = path3.normalize(location.path);
  if (!path3.isAbsolute(normalizedPath)) {
    return { success: false, errorMessage: "Path must be absolute" };
  }
  const existing = findBreakpointAtLocation(normalizedPath, location.line);
  if (!existing) {
    return {
      success: false,
      errorMessage: `No breakpoint at ${location.path}:${location.line}`
    };
  }
  vscode4.debug.removeBreakpoints([existing]);
  const uri = vscode4.Uri.file(location.path);
  const pos = new vscode4.Position(location.line - 1, 0);
  const loc = new vscode4.Location(uri, pos);
  const cond = condition ?? void 0;
  const newBp = new vscode4.SourceBreakpoint(
    loc,
    true,
    cond,
    existing.hitCondition,
    existing.logMessage
  );
  vscode4.debug.addBreakpoints([newBp]);
  return { success: true };
}
async function getActiveBreakpoints() {
  const breakpoints = vscode4.debug.breakpoints.filter(
    (bp) => bp instanceof vscode4.SourceBreakpoint
  ).map((bp) => ({
    verified: true,
    location: {
      path: bp.location.uri.fsPath,
      line: bp.location.range.start.line + 1,
      column: bp.location.range.start.character + 1
    },
    condition: bp.condition,
    hitCondition: bp.hitCondition,
    logMessage: bp.logMessage,
    enabled: bp.enabled
  }));
  return { success: true, breakpoints };
}
async function getDataBreakpointInfo(session, params) {
  try {
    const res = await session.customRequest("dataBreakpointInfo", {
      name: params.name,
      variablesReference: params.variablesReference,
      frameId: params.frameId
    });
    return { success: true, ...res };
  } catch (e) {
    logger.error(LOG3, `getDataBreakpointInfo failed: ${e.message}`);
    return { success: false, errorMessage: `getDataBreakpointInfo failed: ${e.message}` };
  }
}
async function setDataBreakpoint(params) {
  const { dataId, accessType, condition, hitCondition } = params;
  logger.info(LOG3, `Setting data breakpoint for dataId ${dataId}`);
  try {
    const bp = new vscode4.DataBreakpoint(
      `Watch ${dataId}`,
      dataId,
      false,
      // canPersist
      hitCondition,
      condition
    );
    vscode4.debug.addBreakpoints([bp]);
    return { success: true };
  } catch (e) {
    logger.error(LOG3, `Failed to set data breakpoint: ${e.message}`);
    return { success: false, errorMessage: e.message };
  }
}
async function setBreakpoints(params) {
  const { file, breakpoints } = params;
  logger.info(LOG3, `Setting ${breakpoints.length} breakpoints in ${file}`);
  try {
    const results = [];
    const bps = [];
    for (const bp of breakpoints) {
      const uri = vscode4.Uri.file(file);
      const range = new vscode4.Range(
        bp.line - 1,
        bp.column ? bp.column - 1 : 0,
        bp.line - 1,
        bp.column ? bp.column - 1 : 0
      );
      const location = new vscode4.Location(uri, range);
      const sourceBp = new vscode4.SourceBreakpoint(
        location,
        bp.condition ? true : false,
        bp.condition,
        bp.hitCondition,
        bp.logMessage
      );
      bps.push(sourceBp);
    }
    vscode4.debug.addBreakpoints(bps);
    for (let i = 0; i < breakpoints.length; i++) {
      const bp = breakpoints[i];
      results.push({
        id: i + 1,
        line: bp.line,
        verified: true,
        condition: bp.condition,
        source: file
      });
    }
    return {
      success: true,
      breakpoints: results
    };
  } catch (e) {
    logger.error(LOG3, `Failed to set batch breakpoints: ${e.message}`);
    return {
      success: false,
      error: {
        code: "OPERATION_FAILED",
        message: `Failed to set breakpoints: ${e.message}`
      },
      breakpoints: []
    };
  }
}

// src/debug/execution.ts
init_logging();
init_events();
init_inspection();
var LOG5 = "Execution";
var STEP_TIMEOUT_MS = 3e4;
var CONTINUE_TIMEOUT_MS = 3e5;
async function fetchScopePreview(session) {
  try {
    const frameId = getCurrentFrameId(session.id) ?? 0;
    const threadId = getCurrentThreadId(session.id) ?? 1;
    const scopesResponse = await session.customRequest("scopes", {
      frameId,
      threadId
    });
    if (!scopesResponse.scopes || !Array.isArray(scopesResponse.scopes)) {
      return null;
    }
    const scopePreview = {
      parameters: [],
      locals: [],
      uninitialized: []
    };
    for (const scope of scopesResponse.scopes) {
      if (!scope.variablesReference)
        continue;
      const varsResponse = await session.customRequest("variables", {
        variablesReference: scope.variablesReference
      });
      if (!varsResponse.variables || !Array.isArray(varsResponse.variables)) {
        continue;
      }
      const isArguments = scope.name.toLowerCase().includes("argument") || scope.name.toLowerCase().includes("param");
      for (const variable of varsResponse.variables) {
        const varInfo = {
          name: variable.name,
          type: variable.type || "unknown",
          value: variable.value || null,
          status: isUninitialized(variable.value) ? "uninitialized" : "initialized"
        };
        if (isArguments) {
          scopePreview.parameters.push(varInfo);
        } else if (scope.name.toLowerCase().includes("local")) {
          scopePreview.locals.push(varInfo);
        } else {
          scopePreview.locals.push(varInfo);
        }
      }
    }
    logger.debug(LOG5, `Fetched scope: ${scopePreview.parameters.length} params, ${scopePreview.locals.length} locals`);
    return scopePreview;
  } catch (e) {
    logger.warn(LOG5, `Failed to fetch scope preview: ${e.message}`);
    return null;
  }
}
function isUninitialized(value) {
  if (!value)
    return true;
  const uninitializedPatterns = [
    "optimized out",
    "<optimized out>",
    "<not available>",
    "<unavailable>",
    "cannot be used",
    "no value"
  ];
  const lowerValue = value.toLowerCase();
  return uninitializedPatterns.some((pattern) => lowerValue.includes(pattern));
}
async function getThreadId2(session) {
  const currentId = getCurrentThreadId(session.id);
  if (currentId !== void 0) {
    return currentId;
  }
  try {
    const threadsRes = await session.customRequest("threads");
    if (threadsRes.threads && threadsRes.threads.length > 0) {
      const id = threadsRes.threads[0].id;
      setCurrentThreadId(id, session.id);
      return id;
    }
  } catch (e) {
    logger.warn(LOG5, `Failed to get threads: ${e.message}`);
  }
  return 1;
}
async function buildNavigationResult(session, stopReason) {
  try {
    const traceResult = await getStackTrace(session);
    const topFrame = traceResult.success && traceResult.frames.length > 0 ? traceResult.frames[0] : void 0;
    if (topFrame) {
      updateCurrentTopFrameId(topFrame.id);
    }
    return {
      success: true,
      frame: topFrame,
      stopReason: stopReason || "step"
    };
  } catch (e) {
    return { success: true, stopReason: stopReason || "unknown" };
  }
}
async function executeNavigationCommand(session, dapCommand, operationName, timeoutMs) {
  logger.info(LOG5, `Executing ${operationName} (session: ${session.id})`);
  try {
    const threadId = await getThreadId2(session);
    invalidateState(session.id);
    const stopPromise = waitForStopEvent(timeoutMs);
    const dapArgs = { threadId };
    await session.customRequest(dapCommand, dapArgs);
    const { stopped, reason } = await stopPromise;
    if (!stopped) {
      if (reason === "terminated" || reason === "exited") {
        logger.info(LOG5, `${operationName}: Program ${reason}`);
        return {
          success: true,
          stopReason: reason,
          errorMessage: `Program ${reason}.`
        };
      }
      logger.warn(
        LOG5,
        `${operationName} timeout: debugger may still be running or stalled`
      );
      return {
        success: true,
        stopReason: "timeout",
        errorMessage: `${operationName} timeout (${timeoutMs}ms). Program may still be running.`
      };
    }
    return await buildNavigationResult(session, reason || operationName);
  } catch (e) {
    logger.error(LOG5, `${operationName} failed: ${e.message}`);
    return {
      success: false,
      errorMessage: `${operationName} failed: ${e.message}`
    };
  }
}
async function listThreads(session) {
  try {
    const threadsRes = await session.customRequest("threads");
    return { success: true, threads: threadsRes.threads || [] };
  } catch (e) {
    logger.error(LOG5, `list_threads failed: ${e.message}`);
    return { success: false, errorMessage: `list_threads failed: ${e.message}` };
  }
}
async function switchThread(session, threadId) {
  try {
    setCurrentThreadId(threadId, session.id);
    return { success: true, threadId };
  } catch (e) {
    logger.error(LOG5, `switch_thread failed: ${e.message}`);
    return { success: false, errorMessage: `switch_thread failed: ${e.message}` };
  }
}
async function continueExecution(session) {
  const result = await executeNavigationCommand(
    session,
    "continue",
    "continue",
    CONTINUE_TIMEOUT_MS
  );
  if (result.success && result.stopReason) {
    const crashReasons = ["exception", "signal", "breakpoint"];
    if (crashReasons.includes(result.stopReason)) {
      logger.info(LOG5, `Program stopped: ${result.stopReason}`);
      try {
        const stackTrace = await getStackTrace(session);
        result.crashInfo = {
          reason: result.stopReason,
          description: result.description || "Unknown error",
          stackTrace
        };
      } catch (e) {
        logger.warn(LOG5, `Failed to get crash info: ${e?.message || "Unknown error"}`);
      }
    }
  }
  return result;
}
async function nextStep(session) {
  return executeNavigationCommand(session, "next", "next", STEP_TIMEOUT_MS);
}
async function stepIn(session, withScope = true) {
  const result = await executeNavigationCommand(
    session,
    "stepIn",
    "step_in",
    STEP_TIMEOUT_MS
  );
  if (withScope && result.success) {
    const scopePreview = await fetchScopePreview(session);
    if (scopePreview) {
      result.scopePreview = scopePreview;
    }
  }
  return result;
}
async function stepOut(session) {
  return executeNavigationCommand(
    session,
    "stepOut",
    "step_out",
    STEP_TIMEOUT_MS
  );
}
async function jumpToLine(session, params) {
  const operationName = "jump";
  logger.info(LOG5, `Jump to line ${params.line}`);
  try {
    const frameId = params.frameId ?? getCurrentTopFrameId();
    if (frameId === void 0) {
      return { success: false, errorMessage: "No frame ID available for jump" };
    }
    const targets = await session.customRequest("gotoTargets", {
      source: { path: "" },
      line: params.line
    });
    if (!targets.targets || targets.targets.length === 0) {
      return {
        success: false,
        errorMessage: `No goto target found for line ${params.line}`
      };
    }
    const threadId = await getThreadId2(session);
    const stopPromise = waitForStopEvent(STEP_TIMEOUT_MS);
    await session.customRequest("goto", {
      threadId,
      targetId: targets.targets[0].id
    });
    const { stopped, reason } = await stopPromise;
    if (!stopped && (reason === "terminated" || reason === "exited")) {
      return { success: true, stopReason: reason, errorMessage: `Program ${reason}` };
    }
    return await buildNavigationResult(session, stopped ? "jump" : "running");
  } catch (e) {
    logger.error(LOG5, `${operationName} failed: ${e.message}`);
    return { success: false, errorMessage: `${operationName}: ${e.message}` };
  }
}

// src/debug/hardware.ts
init_logging();
init_events();
init_errors();
var LOG6 = "Hardware";
async function getRegisters(session, frameId) {
  const fId = frameId ?? getCurrentTopFrameId(session.id);
  if (fId === void 0) {
    throw new OperationError("get_registers", "No frame ID available for registers");
  }
  try {
    const scopesRes = await session.customRequest("scopes", { frameId: fId });
    const regScope = scopesRes.scopes.find(
      (s) => s.name.toLowerCase().includes("register") || s.name.toLowerCase().includes("cpu")
    );
    if (!regScope) {
      throw new OperationError("get_registers", "Registers scope not found");
    }
    const varsRes = await session.customRequest("variables", {
      variablesReference: regScope.variablesReference
    });
    return { success: true, registers: varsRes.variables };
  } catch (e) {
    if (e instanceof OperationError)
      throw e;
    logger.error(LOG6, "get_registers.failed", { sessionId: session.id, error: e.message });
    throw new OperationError("get_registers", e.message, e);
  }
}
async function readMemory(session, memoryReference, offset = 0, count = 256) {
  try {
    const res = await session.customRequest("readMemory", { memoryReference, offset, count });
    return { success: true, ...res };
  } catch (e) {
    logger.error(LOG6, "read_memory.failed", { memoryReference, error: e.message });
    throw new OperationError("read_memory", e.message, e);
  }
}
async function disassemble(session, options) {
  const {
    memoryReference,
    offset = 0,
    instructionOffset = 0,
    instructionCount = 50,
    resolveSymbols = true
  } = options;
  try {
    const res = await session.customRequest("disassemble", {
      memoryReference,
      offset,
      instructionOffset,
      instructionCount,
      resolveSymbols
    });
    return { success: true, ...res };
  } catch (e) {
    logger.error(LOG6, "disassemble.failed", { memoryReference, error: e.message });
    throw new OperationError("disassemble", e.message, e);
  }
}

// src/debug/DebugController.ts
init_inspection();
init_events();
var LOG7 = "Controller";
var DebugController = class {
  tempBreakpoints = /* @__PURE__ */ new Map();
  operationMap;
  constructor() {
    this.operationMap = this.buildOperationMap();
    onDapStopEvent((_sessionId, body) => {
      if (body?.reason === "breakpoint" && this.tempBreakpoints.size > 0) {
        this.handleTempBreakpointHit();
      }
    });
  }
  /**
   * @brief Build the operation map.
   *
   * Maps operation names to controller methods.
   *
   * @return Operation map object.
   *
   * [Satisfies $ARCH-2]
   */
  buildOperationMap() {
    return {
      // Session Management $DD-1.1
      launch: (args) => launchSession(args || {}),
      restart: () => restartSession(),
      quit: () => quitSession(),
      // Execution Control $DD-1.2
      continue: () => continueExecution(ensureActiveSession("continue")),
      next: () => nextStep(ensureActiveSession("next")),
      step_in: () => stepIn(ensureActiveSession("step_in")),
      step_out: () => stepOut(ensureActiveSession("step_out")),
      jump: (args) => jumpToLine(ensureActiveSession("jump"), args),
      until: (args) => this.executeUntil(args),
      // Breakpoint Management $DD-1.3
      set_breakpoint: (args) => setBreakpoint(args),
      set_breakpoints: (args) => setBreakpoints(args),
      // AIVS-005: Batch operation
      set_temp_breakpoint: (args) => this.setTempBreakpointTracked(args),
      remove_breakpoint: (args) => removeBreakpointByLocation(args),
      remove_all_breakpoints_in_file: (args) => removeAllBreakpointsInFile(args.filePath),
      disable_breakpoint: (args) => toggleBreakpoint({ ...args, enable: false }),
      enable_breakpoint: (args) => toggleBreakpoint({ ...args, enable: true }),
      ignore_breakpoint: (args) => ignoreBreakpoint(args),
      set_breakpoint_condition: (args) => setBreakpointCondition(args),
      get_active_breakpoints: () => getActiveBreakpoints(),
      get_data_breakpoint_info: (args) => getDataBreakpointInfo(ensureActiveSession("get_data_breakpoint_info"), args),
      set_data_breakpoint: (args) => setDataBreakpoint(args),
      watch: (args) => this.watchVariable(args),
      // Hardware & Thread Management (Phase 3)
      list_threads: () => listThreads(ensureActiveSession("list_threads")),
      switch_thread: (args) => switchThread(ensureActiveSession("switch_thread"), args.threadId),
      get_registers: (args) => getRegisters(ensureActiveSession("get_registers"), args?.frameId),
      read_memory: (args) => readMemory(ensureActiveSession("read_memory"), args.memoryReference, args.offset, args.count),
      disassemble: (args) => disassemble(ensureActiveSession("disassemble"), args),
      // Stack & Code Inspection $DD-1.4
      stack_trace: () => getStackTrace(ensureActiveSession("stack_trace")),
      list_source: (args) => listSource(ensureActiveSession("list_source"), args || {}),
      up: () => frameUp(ensureActiveSession("up")),
      down: () => frameDown(ensureActiveSession("down")),
      goto_frame: (args) => gotoFrame(ensureActiveSession("goto_frame"), args),
      get_source: (args) => getSource(ensureActiveSession("get_source"), args),
      // State Inspection & Evaluation $DD-1.4
      // Default scopeFilter to "Locals" only so ai_vars shows local vars distinct from args.
      // Callers may override by passing explicit scopeFilter in params.
      get_stack_frame_variables: (args) => getStackFrameVariables(
        ensureActiveSession("get_stack_frame_variables"),
        { scopeFilter: ["Locals", "Local"], ...args }
      ),
      list_all_locals: (args) => listAllLocals(ensureActiveSession("list_all_locals"), args?.frameId),
      get_args: (args) => this.getArgs(args || {}),
      evaluate: (args) => evaluate(ensureActiveSession("evaluate"), args),
      pretty_print: (args) => prettyPrint(ensureActiveSession("pretty_print"), args),
      whatis: (args) => whatis(ensureActiveSession("whatis"), args),
      execute_statement: (args) => executeStatement(ensureActiveSession("execute_statement"), args),
      // Scope Preview (PROXY-004)
      get_scope_preview: () => this.getScopePreview(),
      // Status $DD-1.5
      get_last_stop_info: () => this.getLastStopInfo()
    };
  }
  /**
   * $DD DD-1.6
   *
   * @brief Execute an operation by name.
   *
   * Dispatches the request to the appropriate DAP operation handler.
   *
   * @param [in]  operation   Name of the operation to execute.
   * @param [in]  params      Optional parameters for the operation.
   *
   * @return Promise resolving to the operation result.
   *
   * @throws Error if the operation is unknown.
   *
   * $ARCH ARCH-2
   */
  async executeOperation(operation, params) {
    const fn = this.operationMap[operation];
    if (!fn) {
      throw new Error(`Unknown operation: '${operation}'`);
    }
    logger.info(LOG7, `Executing: ${operation}`, params);
    const result = await fn(params);
    logger.info(LOG7, `Result: ${operation}`, {
      success: result?.success,
      stopReason: result?.stopReason
    });
    return result;
  }
  /**
   * @brief Get list of supported operations.
   *
   * @return Array of operation names.
   */
  getOperations() {
    return Object.keys(this.operationMap);
  }
  /**
   * @brief Execute a batch of operations.
   *
   * @param operations Array of { operation, params } objects.
   * @param parallel   If true, executes them concurrently using Promise.all().
   * @return Array of results mapping to the input operations.
   */
  async executeBatchOperations(operations, parallel = false) {
    logger.info(LOG7, `Executing batch of ${operations.length} operations (parallel: ${parallel})`);
    for (const op of operations) {
      if (!this.operationMap[op.operation]) {
        throw new Error(`Unknown operation in batch: '${op.operation}'`);
      }
      const validationResult = validateOperationArgs(op.operation, op.params);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed for '${op.operation}': ${validationResult.message}`);
      }
      op.params = validationResult.params;
    }
    if (parallel) {
      return Promise.all(
        operations.map(async (op) => {
          try {
            const res = await this.operationMap[op.operation](op.params);
            return { operation: op.operation, success: true, data: res };
          } catch (e) {
            return { operation: op.operation, success: false, error: e.message };
          }
        })
      );
    } else {
      const results = [];
      for (const op of operations) {
        try {
          const res = await this.operationMap[op.operation](op.params);
          results.push({ operation: op.operation, success: true, data: res });
        } catch (e) {
          results.push({ operation: op.operation, success: false, error: e.message });
        }
      }
      return results;
    }
  }
  /**************************************************************************
   * Internal Helpers
   **************************************************************************/
  async setTempBreakpointTracked(params) {
    const result = await setTempBreakpoint(params);
    if (result.success) {
      const key = this.locationKey(params.location);
      const uri = vscode6.Uri.file(params.location.path);
      const line = params.location.line - 1;
      const bp = vscode6.debug.breakpoints.find(
        (b) => b instanceof vscode6.SourceBreakpoint && b.location.uri.fsPath === uri.fsPath && b.location.range.start.line === line
      );
      if (bp) {
        this.tempBreakpoints.set(key, bp);
        logger.debug(LOG7, `Registered temp breakpoint: ${key}`);
      }
    }
    return result;
  }
  async handleTempBreakpointHit() {
    try {
      const session = vscode6.debug.activeDebugSession;
      if (!session)
        return;
      const trace = await getStackTrace(session);
      if (!trace.success || trace.frames.length === 0)
        return;
      const top = trace.frames[0];
      const key = this.locationKey({ path: top.sourcePath, line: top.line });
      const bp = this.tempBreakpoints.get(key);
      if (bp) {
        logger.debug(LOG7, `Removing temp breakpoint: ${key}`);
        vscode6.debug.removeBreakpoints([bp]);
        this.tempBreakpoints.delete(key);
      }
    } catch (e) {
      logger.warn(LOG7, `Error handling temp breakpoint: ${e.message}`);
    }
  }
  async executeUntil(params) {
    const session = ensureActiveSession("until");
    const trace = await getStackTrace(session);
    if (!trace.success || trace.frames.length === 0) {
      return {
        success: false,
        errorMessage: "Cannot get current frame for 'until'"
      };
    }
    const currentFile = trace.frames[0].sourcePath;
    if (!currentFile) {
      return {
        success: false,
        errorMessage: "No source path for current frame"
      };
    }
    const tempResult = await this.setTempBreakpointTracked({
      location: { path: currentFile, line: params.line }
    });
    if (!tempResult.success) {
      return {
        success: false,
        errorMessage: `Failed to set temp breakpoint: ${tempResult.errorMessage}`
      };
    }
    return continueExecution(session);
  }
  async getArgs(params) {
    const session = ensureActiveSession("get_args");
    const result = await getStackFrameVariables(session, {
      frameId: params.frameId,
      scopeFilter: params.scopeFilter || ["Arguments", "Args", "Parameters"]
    });
    if (result.success && result.scopes.every((s) => s.variables.length === 0)) {
      return getStackFrameVariables(session, {
        frameId: params.frameId,
        scopeFilter: ["Locals", "Local"]
      });
    }
    return result;
  }
  async watchVariable(params) {
    const session = ensureActiveSession("watch");
    const accessType = params.accessType || "write";
    const frameId = getCurrentFrameId() ?? getCurrentTopFrameId();
    if (frameId === void 0) {
      return { success: false, errorMessage: "No frame available. Ensure debugger is stopped at a breakpoint." };
    }
    let scopeRef;
    try {
      const scopesRes = await session.customRequest("scopes", { frameId });
      for (const scope of scopesRes.scopes || []) {
        if (scope.expensive)
          continue;
        const varsRes = await session.customRequest("variables", {
          variablesReference: scope.variablesReference
        });
        const found = (varsRes.variables || []).find((v) => v.name === params.name);
        if (found) {
          scopeRef = scope.variablesReference;
          break;
        }
      }
    } catch (e) {
      return { success: false, errorMessage: `Cannot get variables: ${e.message}` };
    }
    if (scopeRef === void 0) {
      return {
        success: false,
        errorMessage: `Variable '${params.name}' not found in current scope. Ensure the debugger is stopped at a frame where it is visible.`
      };
    }
    const infoResult = await getDataBreakpointInfo(session, {
      name: params.name,
      variablesReference: scopeRef
    });
    if (!infoResult.success || !infoResult.dataId) {
      return {
        success: false,
        errorMessage: infoResult.errorMessage || `Watchpoint not supported for '${params.name}'. Check that your debug adapter supports data breakpoints.`
      };
    }
    try {
      const bpResult = await setDataBreakpoint({
        dataId: infoResult.dataId,
        accessType,
        condition: params.condition
      });
      if (bpResult.success) {
        return { ...bpResult, dataId: infoResult.dataId, accessType };
      }
    } catch {
    }
    const gdbCmd = accessType === "read" ? `rwatch ${params.name}` : accessType === "readWrite" ? `awatch ${params.name}` : `watch ${params.name}`;
    try {
      const res = await session.customRequest("evaluate", {
        expression: gdbCmd,
        frameId,
        context: "repl"
      });
      if (res.result && !res.result.toLowerCase().includes("error")) {
        return { success: true, method: "gdb", command: gdbCmd, result: res.result, accessType };
      }
      return { success: false, errorMessage: res.result || `GDB '${gdbCmd}' returned no result` };
    } catch (e) {
      return { success: false, errorMessage: `Failed to set watchpoint: ${e.message}` };
    }
  }
  async getLastStopInfo() {
    const body = getLastStopEventBody();
    const sessionId = getLastStopSessionId();
    if (!body || !sessionId) {
      return { success: false, errorMessage: "No stop event recorded" };
    }
    return { success: true, sessionId, stopInfo: body };
  }
  async getScopePreview() {
    const session = ensureActiveSession("get_scope_preview");
    const scopePreview = await fetchScopePreview(session);
    if (!scopePreview) {
      return {
        success: false,
        errorMessage: "Could not fetch scope preview. Ensure debugger is stopped."
      };
    }
    return {
      success: true,
      scopePreview,
      metadata: {
        parametersCount: scopePreview.parameters.length,
        localsCount: scopePreview.locals.length,
        uninitializedCount: scopePreview.uninitialized.length
      }
    };
  }
  locationKey(loc) {
    try {
      return `${vscode6.Uri.file(loc.path).toString()}:${loc.line}`;
    } catch {
      return `${loc.path}:${loc.line}`;
    }
  }
};
var debugController = new DebugController();

// src/server/router.ts
init_session();
init_events();

// src/debug/ContextAggregator.ts
init_logging();
init_inspection();
init_events();
var LOG8 = "ContextAggregator";
var DEFAULT_DEPTH = 10;
var DEFAULT_SOURCE_LINES = 10;
var MAX_VARIABLE_VALUE_LENGTH = 200;
var MAX_VARIABLES_PER_SCOPE = 50;
function shouldIncludeSection(section, options) {
  if (options.exclude?.includes(section)) {
    return false;
  }
  if (options.include?.length && !options.include.includes(section)) {
    return false;
  }
  return true;
}
function compressValue(value) {
  if (!value || value.length <= MAX_VARIABLE_VALUE_LENGTH) {
    return value;
  }
  return value.substring(0, MAX_VARIABLE_VALUE_LENGTH - 3) + "...";
}
function compressVariables(variables, maxVars = MAX_VARIABLES_PER_SCOPE) {
  if (!variables)
    return [];
  const limited = variables.slice(0, maxVars);
  return limited.map((v) => ({
    ...v,
    value: compressValue(v.value || ""),
    type: v.type?.substring(0, 50) || v.type
  }));
}
async function fetchSource(session, location, lines) {
  try {
    if (!location.file || !location.line) {
      return null;
    }
    const { listSource: listSource2 } = await Promise.resolve().then(() => (init_inspection(), inspection_exports));
    const result = await listSource2(session, {
      linesAround: lines
    });
    if (!result.success || !result.sourceCode) {
      return null;
    }
    return {
      window: `lines ${Math.max(1, location.line - lines)}-${location.line + lines}`,
      code: result.sourceCode,
      highlights: [
        { line: location.line, reason: "current" }
      ]
    };
  } catch (e) {
    logger.warn(LOG8, `Failed to fetch source: ${e.message}`);
    return null;
  }
}
async function fetchThreads(session) {
  try {
    const currentThreadId = getCurrentThreadId(session.id);
    const response = await session.customRequest("threads");
    const threads = response.threads || [];
    return threads.map((t) => ({
      id: t.id,
      name: t.name || `Thread ${t.id}`,
      state: "stopped",
      current: t.id === currentThreadId
    }));
  } catch (e) {
    logger.warn(LOG8, `Failed to fetch threads: ${e.message}`);
    return [];
  }
}
async function aggregateContext(session, options = {}) {
  const startTime = Date.now();
  let location = getLastLocation(session.id);
  if (!location) {
    logger.debug(LOG8, "Location not in state, fetching from stack trace");
    const threadId = getCurrentThreadId(session.id) || 1;
    try {
      const stackResponse = await session.customRequest("stackTrace", {
        threadId,
        startFrame: 0,
        levels: 1
      });
      if (stackResponse.stackFrames?.length > 0) {
        const frame = stackResponse.stackFrames[0];
        location = {
          file: frame.source?.path || "unknown",
          line: frame.line || 0,
          function: frame.name
        };
      }
    } catch (e) {
      logger.warn(LOG8, `Failed to fetch location: ${e.message}`);
      location = { file: "unknown", line: 0 };
    }
  }
  const depth = options.depth ?? DEFAULT_DEPTH;
  const sourceLines = options.sourceLines ?? DEFAULT_SOURCE_LINES;
  const maxVariables = options.maxVariables ?? MAX_VARIABLES_PER_SCOPE;
  const [stackResult, variablesResult, sourceResult, threadsResult] = await Promise.all([
    // Stack trace
    shouldIncludeSection("stack", options) ? (async () => {
      try {
        const stack = await getStackTrace(session);
        if (!stack.success)
          return [];
        const frames = stack.frames || [];
        const limited = frames.slice(0, depth);
        return limited.map((f) => ({
          id: f.id,
          name: f.name,
          sourcePath: f.sourcePath?.substring(0, 200) || f.sourcePath,
          line: f.line,
          column: f.column
        }));
      } catch (e) {
        logger.warn(LOG8, `Stack fetch failed: ${e.message}`);
        return [];
      }
    })() : Promise.resolve([]),
    // Variables
    shouldIncludeSection("variables", options) ? (async () => {
      try {
        const { getStackFrameVariables: getStackFrameVariables2 } = await Promise.resolve().then(() => (init_inspection(), inspection_exports));
        const frameId = getCurrentFrameId(session.id) ?? 0;
        const result = await getStackFrameVariables2(session, { frameId });
        if (!result.success || !result.scopes)
          return [];
        return result.scopes.map((scope) => ({
          scopeName: scope.name || "Unknown",
          locals: compressVariables(scope.variables || [], maxVariables)
        }));
      } catch (e) {
        logger.warn(LOG8, `Variables fetch failed: ${e.message}`);
        return [];
      }
    })() : Promise.resolve([]),
    // Source code
    shouldIncludeSection("source", options) ? fetchSource(session, location, sourceLines) : Promise.resolve(null),
    // Threads
    shouldIncludeSection("threads", options) ? fetchThreads(session) : Promise.resolve([])
  ]);
  const latencyMs = Date.now() - startTime;
  const compressionApplied = true;
  return {
    location,
    source: sourceResult,
    stack: stackResult,
    variables: variablesResult,
    threads: threadsResult,
    metadata: {
      cached: false,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      latencyMs,
      compressionApplied
    }
  };
}

// src/debug/WatchSuggestService.ts
var vscode7 = __toESM(require("vscode"));
init_logging();
init_inspection();
init_events();

// src/debug/VariableChangeTracker.ts
init_logging();
var LOG9 = "VariableChangeTracker";
var DEFAULT_MAX_STEPS = 50;
var DEFAULT_CHANGE_WINDOW = 5;
var LRUCache = class {
  max;
  map;
  constructor(max = DEFAULT_MAX_STEPS) {
    this.max = max;
    this.map = /* @__PURE__ */ new Map();
  }
  get(key) {
    const value = this.map.get(key);
    if (value !== void 0) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }
  set(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.max) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== void 0) {
        this.map.delete(firstKey);
      }
    }
    this.map.set(key, value);
  }
  has(key) {
    return this.map.has(key);
  }
  get size() {
    return this.map.size;
  }
  get entries() {
    return Array.from(this.map.entries());
  }
};
var VariableChangeTracker = class {
  // sessionId -> varName -> count
  constructor(maxSteps = DEFAULT_MAX_STEPS) {
    this.maxSteps = maxSteps;
    this.history = new LRUCache(100);
    this.stepCounters = /* @__PURE__ */ new Map();
    this.changeCounts = /* @__PURE__ */ new Map();
  }
  history;
  // sessionId -> snapshots
  stepCounters;
  // sessionId -> step counter
  changeCounts;
  /**
   * @brief Track variables at current step.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  variables   Current variables.
   *
   * @return Number of changes detected.
   */
  trackVariables(sessionId, variables) {
    const stepNumber = this.stepCounters.get(sessionId) ?? 0;
    const snapshot = {
      timestamp: Date.now(),
      stepNumber,
      variables: new Map(variables.map((v) => [v.name, { name: v.name, value: v.value || "", type: v.type || "" }]))
    };
    let sessionHistory = this.history.get(sessionId);
    if (!sessionHistory) {
      sessionHistory = [];
      this.history.set(sessionId, sessionHistory);
    }
    let changeCount = 0;
    if (sessionHistory.length > 0) {
      const prevSnapshot = sessionHistory[sessionHistory.length - 1];
      changeCount = this.detectChanges(sessionId, prevSnapshot, snapshot);
    }
    sessionHistory.push(snapshot);
    if (sessionHistory.length > this.maxSteps) {
      sessionHistory.shift();
    }
    this.stepCounters.set(sessionId, stepNumber + 1);
    logger.debug(LOG9, `Tracked ${variables.length} variables, ${changeCount} changes at step ${stepNumber}`);
    return changeCount;
  }
  /**
   * @brief Get variables that changed in last N steps.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  lastNSteps  Number of steps to look back (default: 5).
   *
   * @return Array of variable changes.
   */
  getChangedVariables(sessionId, lastNSteps = DEFAULT_CHANGE_WINDOW) {
    const sessionHistory = this.history.get(sessionId);
    if (!sessionHistory || sessionHistory.length < 2) {
      return [];
    }
    const changes = /* @__PURE__ */ new Map();
    const currentStep = this.stepCounters.get(sessionId) ?? 0;
    const changeCounts = this.changeCounts.get(sessionId) || /* @__PURE__ */ new Map();
    const startIndex = Math.max(0, sessionHistory.length - lastNSteps - 1);
    for (let i = startIndex; i < sessionHistory.length - 1; i++) {
      const prev = sessionHistory[i];
      const curr = sessionHistory[i + 1];
      for (const [name, currState] of curr.variables) {
        const prevState = prev.variables.get(name);
        if (!prevState)
          continue;
        if (prevState.value !== currState.value) {
          const stepsAgo = currentStep - curr.stepNumber;
          if (!changes.has(name)) {
            changes.set(name, {
              name,
              oldValue: prevState.value,
              newValue: currState.value,
              type: currState.type,
              stepsAgo,
              changeCount: changeCounts.get(name) ?? 1,
              firstChangeStep: curr.stepNumber
            });
          } else {
            const change = changes.get(name);
            change.newValue = currState.value;
            change.stepsAgo = stepsAgo;
          }
        }
      }
    }
    return Array.from(changes.values()).sort((a, b) => b.changeCount - a.changeCount);
  }
  /**
   * @brief Get history of a specific variable.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  varName     Variable name.
   *
   * @return Array of history entries.
   */
  getVariableHistory(sessionId, varName) {
    const sessionHistory = this.history.get(sessionId);
    if (!sessionHistory) {
      return [];
    }
    const history = [];
    for (const snapshot of sessionHistory) {
      const state = snapshot.variables.get(varName);
      if (state) {
        history.push({
          step: snapshot.stepNumber,
          value: state.value,
          timestamp: snapshot.timestamp
        });
      }
    }
    return history;
  }
  /**
   * @brief Get most frequently changed variables.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  topN        Number of top variables to return.
   *
   * @return Array of variable changes sorted by change count.
   */
  getMostChangedVariables(sessionId, topN = 5) {
    const changes = this.getChangedVariables(sessionId, this.maxSteps);
    return changes.slice(0, topN);
  }
  /**
   * @brief Clear tracking data for a session.
   *
   * @param [in]  sessionId   Debug session ID.
   */
  clear(sessionId) {
    this.history.set(sessionId, []);
    this.stepCounters.delete(sessionId);
    this.changeCounts.delete(sessionId);
  }
  /**
   * @brief Get current step number for session.
   *
   * @param [in]  sessionId   Debug session ID.
   *
   * @return Current step number.
   */
  getCurrentStep(sessionId) {
    return this.stepCounters.get(sessionId) ?? 0;
  }
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  /**
   * @brief Detect changes between two snapshots.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  prev        Previous snapshot.
   * @param [in]  curr        Current snapshot.
   *
   * @return Number of changes detected.
   */
  detectChanges(sessionId, prev, curr) {
    let changeCount = 0;
    const sessionChangeCounts = this.changeCounts.get(sessionId) || /* @__PURE__ */ new Map();
    for (const [name, currState] of curr.variables) {
      const prevState = prev.variables.get(name);
      if (!prevState)
        continue;
      if (prevState.value !== currState.value) {
        changeCount++;
        const count = sessionChangeCounts.get(name) ?? 0;
        sessionChangeCounts.set(name, count + 1);
      }
    }
    if (curr.stepNumber % 10 === 0) {
      for (const [name, count] of sessionChangeCounts) {
        if (count > 0) {
          sessionChangeCounts.set(name, count - 1);
        }
      }
    }
    this.changeCounts.set(sessionId, sessionChangeCounts);
    return changeCount;
  }
};
var variableChangeTracker = new VariableChangeTracker();

// src/debug/BoundaryDetector.ts
var TYPE_LIMITS = {
  "char": 127,
  "unsigned char": 255,
  "short": 32767,
  "unsigned short": 65535,
  "int": 2147483647,
  "unsigned int": 4294967295,
  "long": 2147483647,
  "unsigned long": 4294967295,
  "long long": 9223372036854776e3,
  "unsigned long long": 18446744073709552e3,
  "float": 34028235e31,
  "double": 17976931348623157e292
};
var HIGH_THRESHOLD = 0.95;
var MEDIUM_THRESHOLD = 0.9;
var LOW_THRESHOLD = 0.8;
var CAPACITY_HIGH_THRESHOLD = 0.9;
var CAPACITY_MEDIUM_THRESHOLD = 0.8;
var BoundaryDetector = class {
  /**
   * @brief Detect overflow/underflow risks.
   *
   * @param [in]  variables   Array of variables to analyze.
   *
   * @return Array of overflow risks.
   */
  detectOverflow(variables) {
    const risks = [];
    for (const variable of variables) {
      if (!variable.type || !variable.value)
        continue;
      const typeKey = variable.type.toLowerCase().replace(/\s+/g, " ");
      const limit = TYPE_LIMITS[typeKey];
      if (!limit)
        continue;
      const value = this.parseValue(variable.value);
      if (value === null)
        continue;
      const ratio = Math.abs(value) / limit;
      let riskLevel = null;
      if (ratio >= HIGH_THRESHOLD) {
        riskLevel = "high";
      } else if (ratio >= MEDIUM_THRESHOLD) {
        riskLevel = "medium";
      } else if (ratio >= LOW_THRESHOLD) {
        riskLevel = "low";
      }
      if (riskLevel) {
        const isNegative = value < 0;
        risks.push({
          variable: variable.name,
          riskType: isNegative ? "underflow" : "overflow",
          riskLevel,
          currentValue: variable.value,
          threshold: limit.toString(),
          expression: variable.name,
          reason: `Value ${variable.value} is ${(ratio * 100).toFixed(1)}% of ${typeKey} max (${limit})`,
          confidence: ratio
        });
      }
    }
    return risks;
  }
  /**
   * @brief Detect null pointer dereference risks.
   *
   * @param [in]  sourceLine  Current source line.
   * @param [in]  pointers    Pointer variables.
   *
   * @return Array of null pointer risks.
   */
  detectNullPointerRisk(sourceLine, pointers) {
    const risks = [];
    const derefPatterns = [
      /\b(\w+)\s*->\s*\w+/g,
      // ptr->member
      /\*\s*(\w+)/g,
      // *ptr
      /\b(\w+)\s*\[\s*\w+\s*\]/g
      // ptr[index]
    ];
    const dereferencedVars = /* @__PURE__ */ new Set();
    for (const pattern of derefPatterns) {
      let match;
      while ((match = pattern.exec(sourceLine)) !== null) {
        dereferencedVars.add(match[1]);
      }
    }
    for (const pointer of pointers) {
      if (!pointer.type?.includes("*") && !pointer.type?.toLowerCase().includes("ptr")) {
        continue;
      }
      if (dereferencedVars.has(pointer.name)) {
        const isNull = pointer.value === "0" || pointer.value === "0x0" || pointer.value === "NULL" || pointer.value === "nullptr" || !pointer.value || pointer.value.toLowerCase() === "null";
        if (isNull) {
          risks.push({
            variable: pointer.name,
            riskType: "null_pointer",
            riskLevel: "high",
            currentValue: pointer.value || "unknown",
            expression: pointer.name,
            reason: `Pointer '${pointer.name}' is null and dereferenced at current line`,
            confidence: 1
          });
        } else {
          const hasNullCheck = this.hasNullCheck(sourceLine, pointer.name);
          if (!hasNullCheck) {
            risks.push({
              variable: pointer.name,
              riskType: "null_pointer",
              riskLevel: "medium",
              currentValue: pointer.value || "unknown",
              expression: pointer.name,
              reason: `Pointer '${pointer.name}' dereferenced without null check`,
              confidence: 0.7
            });
          }
        }
      }
    }
    return risks;
  }
  /**
   * @brief Detect capacity/buffer overflow risks.
   *
   * @param [in]  variables   Array of variables to analyze.
   *
   * @return Array of capacity risks.
   */
  detectCapacityRisk(variables) {
    const risks = [];
    for (const variable of variables) {
      const name = variable.name.toLowerCase();
      if (!name.includes("size") && !name.includes("count") && !name.includes("capacity") && !name.includes("len") && !name.includes("buffer")) {
        continue;
      }
      const value = this.parseValue(variable.value);
      if (value === null || value <= 0)
        continue;
      const maxVar = variables.find(
        (v) => v.name.toLowerCase().includes("max") && v.name.toLowerCase().includes(name.replace(/(size|count|capacity|len|buffer).*/, ""))
      );
      if (maxVar) {
        const maxValue = this.parseValue(maxVar.value);
        if (maxValue && maxValue > 0) {
          const ratio = value / maxValue;
          let riskLevel = null;
          if (ratio >= CAPACITY_HIGH_THRESHOLD) {
            riskLevel = "high";
          } else if (ratio >= CAPACITY_MEDIUM_THRESHOLD) {
            riskLevel = "medium";
          }
          if (riskLevel) {
            risks.push({
              variable: variable.name,
              riskType: "capacity",
              riskLevel,
              currentValue: variable.value,
              threshold: maxVar.value,
              expression: `${variable.name} >= ${maxVar.name}`,
              reason: `${variable.name} (${value}) is ${(ratio * 100).toFixed(1)}% of ${maxVar.name} (${maxValue})`,
              confidence: ratio
            });
          }
        }
      } else {
        if (variable.type?.includes("{")) {
          const capacityMatch = variable.value.match(/capacity\s*=\s*(\d+)/i);
          const sizeMatch = variable.value.match(/(size|count)\s*=\s*(\d+)/i);
          if (capacityMatch && sizeMatch) {
            const capacity = parseInt(capacityMatch[1], 10);
            const size = parseInt(sizeMatch[2], 10);
            if (capacity > 0) {
              const ratio = size / capacity;
              if (ratio >= CAPACITY_MEDIUM_THRESHOLD) {
                risks.push({
                  variable: variable.name,
                  riskType: "capacity",
                  riskLevel: ratio >= CAPACITY_HIGH_THRESHOLD ? "high" : "medium",
                  currentValue: `${size}/${capacity}`,
                  threshold: capacity.toString(),
                  expression: `${variable.name}.size >= ${variable.name}.capacity`,
                  reason: `Buffer ${variable.name} is ${(ratio * 100).toFixed(1)}% full (${size}/${capacity})`,
                  confidence: ratio
                });
              }
            }
          }
        }
      }
    }
    return risks;
  }
  /**
   * @brief Detect division/modulo risks.
   *
   * @param [in]  sourceLine  Current source line.
   * @param [in]  variables   Variables that might be divisors.
   *
   * @return Array of division risks.
   */
  detectDivisionRisk(sourceLine, variables) {
    const risks = [];
    const divPatterns = [
      /\/\s*(\w+)/g,
      // / var
      /%\s*(\w+)/g
      // % var
    ];
    const divisorVars = /* @__PURE__ */ new Set();
    for (const pattern of divPatterns) {
      let match;
      while ((match = pattern.exec(sourceLine)) !== null) {
        divisorVars.add(match[1]);
      }
    }
    for (const variable of variables) {
      if (divisorVars.has(variable.name)) {
        const value = this.parseValue(variable.value);
        if (value === 0) {
          risks.push({
            variable: variable.name,
            riskType: "division",
            riskLevel: "high",
            currentValue: variable.value,
            expression: variable.name,
            reason: `Division by zero: '${variable.name}' is 0`,
            confidence: 1
          });
        } else if (value !== null && Math.abs(value) < 1 && variable.type?.includes("float")) {
          risks.push({
            variable: variable.name,
            riskType: "division",
            riskLevel: "medium",
            currentValue: variable.value,
            expression: variable.name,
            reason: `Division by very small number: '${variable.name}' = ${variable.value}`,
            confidence: 0.8
          });
        }
      }
    }
    return risks;
  }
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  /**
   * @brief Parse numeric value from string.
   *
   * @param [in]  valueStr  Value string.
   *
   * @return Parsed number or null.
   */
  parseValue(valueStr) {
    if (!valueStr)
      return null;
    let clean = valueStr.trim().toLowerCase();
    if (clean.startsWith("0x")) {
      clean = parseInt(clean, 16).toString();
    }
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  }
  /**
   * @brief Check if source line has null check for variable.
   *
   * @param [in]  sourceLine  Source line.
   * @param [in]  varName     Variable name.
   *
   * @return True if null check exists.
   */
  hasNullCheck(sourceLine, varName) {
    const patterns = [
      new RegExp(`\\b${varName}\\s*!=\\s*(NULL|nullptr|0)\\b`),
      new RegExp(`\\b${varName}\\s*==\\s*(NULL|nullptr|0)\\b`),
      new RegExp(`\\bif\\s*\\(\\s*!\\s*${varName}\\s*\\)`),
      new RegExp(`\\bif\\s*\\(\\s*${varName}\\s*\\)`)
    ];
    return patterns.some((p) => p.test(sourceLine));
  }
};
var boundaryDetector = new BoundaryDetector();

// src/debug/FSMDetector.ts
var STATE_PATTERNS = [
  /state/i,
  /status/i,
  /mode/i,
  /phase/i,
  /_st$/i,
  /_state$/i,
  /^m_/i,
  /fsm/i,
  /machine/i
];
var KNOWN_STATES = /* @__PURE__ */ new Map([
  ["motor_state", ["MOTOR_STATE_STOPPED", "MOTOR_STATE_RUNNING", "MOTOR_STATE_ERROR", "MOTOR_STATE_INIT"]],
  ["system_state", ["SYSTEM_STATE_IDLE", "SYSTEM_STATE_ACTIVE", "SYSTEM_STATE_ERROR"]],
  ["connection_state", ["CONNECTED", "DISCONNECTED", "CONNECTING", "ERROR"]]
]);
var FSMDetector = class {
  // sessionId -> varName -> value
  constructor(changeTracker) {
    this.changeTracker = changeTracker;
  }
  previousStates = /* @__PURE__ */ new Map();
  /**
   * @brief Identify potential state variables.
   *
   * @param [in]  variables   Array of variables to analyze.
   *
   * @return Array of state variable names.
   */
  identifyStateVariables(variables) {
    const stateVars = [];
    for (const variable of variables) {
      const isStateVar = STATE_PATTERNS.some((pattern) => pattern.test(variable.name));
      const isEnumLike = this.isEnumLike(variable.value);
      if (isStateVar || isEnumLike) {
        stateVars.push(variable.name);
      }
    }
    return stateVars;
  }
  /**
   * @brief Detect state transitions.
   *
   * @param [in]  sessionId   Debug session ID.
   * @param [in]  variables   Current variables.
   *
   * @return Array of detected transitions.
   */
  detectTransitions(sessionId, variables) {
    const transitions = [];
    const sessionPrevStates = this.previousStates.get(sessionId) || /* @__PURE__ */ new Map();
    const currentStep = this.changeTracker?.getCurrentStep(sessionId) ?? 0;
    for (const variable of variables) {
      if (!STATE_PATTERNS.some((p) => p.test(variable.name))) {
        continue;
      }
      const prevState = sessionPrevStates.get(variable.name);
      const currentState = variable.value || "unknown";
      if (prevState && prevState !== currentState) {
        const riskLevel = this.assessTransitionRisk(variable.name, prevState, currentState);
        transitions.push({
          variable: variable.name,
          oldState: prevState,
          newState: currentState,
          stepNumber: currentStep,
          riskLevel,
          reason: `State transition: ${prevState} \u2192 ${currentState}`,
          confidence: riskLevel === "high" ? 0.9 : 0.7
        });
      }
    }
    const newPrevStates = /* @__PURE__ */ new Map();
    for (const variable of variables) {
      if (STATE_PATTERNS.some((p) => p.test(variable.name))) {
        newPrevStates.set(variable.name, variable.value || "unknown");
      }
    }
    this.previousStates.set(sessionId, newPrevStates);
    return transitions;
  }
  /**
   * @brief Generate watch suggestions from transitions.
   *
   * @param [in]  transitions   Array of transitions.
   *
   * @return Array of watch suggestions.
   */
  generateSuggestions(transitions) {
    return transitions.map((t) => ({
      variable: t.variable,
      reason: t.reason,
      riskLevel: t.riskLevel,
      riskScore: t.riskLevel === "high" ? 3 : t.riskLevel === "medium" ? 2 : 1,
      expression: t.variable,
      category: "fsm",
      metadata: {
        oldState: t.oldState,
        newState: t.newState
      }
    }));
  }
  /**
   * @brief Clear state tracking for session.
   *
   * @param [in]  sessionId   Debug session ID.
   */
  clear(sessionId) {
    this.previousStates.delete(sessionId);
  }
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  /**
   * @brief Check if value looks like an enum/state.
   *
   * @param [in]  value   Variable value.
   *
   * @return True if enum-like.
   */
  isEnumLike(value) {
    if (!value)
      return false;
    if (/^[A-Z][A-Z0-9_]+$/.test(value)) {
      return true;
    }
    for (const states of KNOWN_STATES.values()) {
      if (states.some((s) => value.includes(s))) {
        return true;
      }
    }
    return false;
  }
  /**
   * @brief Assess risk level of state transition.
   *
   * @param [in]  varName     Variable name.
   * @param [in]  oldState    Previous state.
   * @param [in]  newState    New state.
   *
   * @return Risk level.
   */
  assessTransitionRisk(varName, oldState, newState) {
    const newStateLower = newState.toLowerCase();
    const oldStateLower = oldState.toLowerCase();
    if (newStateLower.includes("error") || newStateLower.includes("invalid") || newStateLower.includes("fault")) {
      return "high";
    }
    if (KNOWN_STATES.has(varName)) {
      const knownStates = KNOWN_STATES.get(varName);
      if (!knownStates.some((s) => s.toLowerCase() === newStateLower)) {
        return "high";
      }
    }
    if ((oldStateLower.includes("run") || oldStateLower.includes("active")) && (newStateLower.includes("stop") || newStateLower.includes("idle"))) {
      return "medium";
    }
    if (newStateLower.includes("init") || newStateLower.includes("reset")) {
      return "medium";
    }
    return "low";
  }
};
var fsmDetector = new FSMDetector();

// src/debug/WatchSuggestService.ts
var LOG10 = "WatchSuggestService";
var MAX_SUGGESTIONS = 10;
var CHANGE_WINDOW = 5;
var HIGH_RISK_THRESHOLD = 3;
var MEDIUM_RISK_THRESHOLD = 2;
var WatchSuggestService = class {
  changeTracker;
  boundaryDetector;
  fsmDetector;
  constructor(changeTracker, boundaryDetector2, fsmDetector2) {
    this.changeTracker = changeTracker || new VariableChangeTracker();
    this.boundaryDetector = boundaryDetector2 || new BoundaryDetector();
    this.fsmDetector = fsmDetector2 || new FSMDetector(this.changeTracker);
  }
  /**
   * @brief Get ranked watch suggestions for current debug state.
   *
   * @param [in]  session   VS Code debug session.
   *
   * @return Watch suggestions ranked by risk.
   */
  async getSuggestions(session) {
    const sessionId = session.id;
    const allSuggestions = [];
    try {
      const variables = await this.gatherVariables(session);
      const location = getLastLocation(sessionId);
      const sourceLine = await this.getCurrentSourceLine(session, location);
      const changeCount = this.changeTracker.trackVariables(sessionId, variables);
      logger.debug(LOG10, `Tracked ${variables.length} variables, ${changeCount} changes`);
      const changeSuggestions = this.getChangeBasedSuggestions(sessionId);
      allSuggestions.push(...changeSuggestions);
      const boundarySuggestions = this.getBoundarySuggestions(variables, sourceLine);
      allSuggestions.push(...boundarySuggestions);
      const fsmSuggestions = this.getFSMSuggestions(sessionId, variables);
      allSuggestions.push(...fsmSuggestions);
      const ranked = this.rankAndDeduplicate(allSuggestions);
      const autoWatch = ranked.filter((s) => s.riskLevel === "high").slice(0, 5).map((s) => s.variable);
      const highRiskCount = ranked.filter((s) => s.riskLevel === "high").length;
      const mediumRiskCount = ranked.filter((s) => s.riskLevel === "medium").length;
      const lowRiskCount = ranked.filter((s) => s.riskLevel === "low").length;
      return {
        suggestions: ranked,
        autoWatch,
        metadata: {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          totalCandidates: allSuggestions.length,
          highRiskCount,
          mediumRiskCount,
          lowRiskCount
        }
      };
    } catch (e) {
      logger.error(LOG10, `Failed to get suggestions: ${e.message}`);
      return {
        suggestions: [],
        autoWatch: [],
        metadata: {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          totalCandidates: 0,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0
        }
      };
    }
  }
  /**
   * @brief Get change tracker instance.
   */
  getChangeTracker() {
    return this.changeTracker;
  }
  // ==========================================================================
  // Private Helpers - Suggestion Generation
  // ==========================================================================
  /**
   * @brief Get suggestions based on variable changes.
   */
  getChangeBasedSuggestions(sessionId) {
    const suggestions = [];
    const changes = this.changeTracker.getChangedVariables(sessionId, CHANGE_WINDOW);
    for (const change of changes) {
      const riskScore = this.calculateChangeRiskScore(change);
      const riskLevel = this.scoreToRiskLevel(riskScore);
      suggestions.push({
        variable: change.name,
        reason: `Changed ${change.changeCount} time(s) in last ${CHANGE_WINDOW} steps: ${change.oldValue} \u2192 ${change.newValue}`,
        riskLevel,
        riskScore,
        expression: change.name,
        category: "recent_change",
        metadata: {
          changeCount: change.changeCount,
          oldValue: change.oldValue,
          newValue: change.newValue
        }
      });
    }
    return suggestions;
  }
  /**
   * @brief Get suggestions based on boundary risks.
   */
  getBoundarySuggestions(variables, sourceLine) {
    const suggestions = [];
    const overflowRisks = this.boundaryDetector.detectOverflow(variables);
    for (const risk of overflowRisks) {
      suggestions.push(this.boundaryRiskToSuggestion(risk));
    }
    const pointerVars = variables.filter((v) => v.type?.includes("*") || v.type?.toLowerCase().includes("ptr"));
    const nullRisks = this.boundaryDetector.detectNullPointerRisk(sourceLine, pointerVars);
    for (const risk of nullRisks) {
      suggestions.push(this.boundaryRiskToSuggestion(risk));
    }
    const capacityRisks = this.boundaryDetector.detectCapacityRisk(variables);
    for (const risk of capacityRisks) {
      suggestions.push(this.boundaryRiskToSuggestion(risk));
    }
    return suggestions;
  }
  /**
   * @brief Get suggestions based on FSM transitions.
   */
  getFSMSuggestions(sessionId, variables) {
    const transitions = this.fsmDetector.detectTransitions(sessionId, variables);
    return this.fsmDetector.generateSuggestions(transitions);
  }
  // ==========================================================================
  // Private Helpers - Ranking & Scoring
  // ==========================================================================
  /**
   * @brief Rank and deduplicate suggestions.
   */
  rankAndDeduplicate(suggestions) {
    const byVariable = /* @__PURE__ */ new Map();
    for (const suggestion of suggestions) {
      const existing = byVariable.get(suggestion.variable) || [];
      existing.push(suggestion);
      byVariable.set(suggestion.variable, existing);
    }
    const merged = [];
    for (const [variable, varSuggestions] of byVariable) {
      const best = varSuggestions.reduce(
        (a, b) => a.riskScore > b.riskScore ? a : b
      );
      if (varSuggestions.length > 1) {
        const categories = [...new Set(varSuggestions.map((s) => s.category))];
        best.reason = `${best.reason} [${categories.join(", ")}]`;
      }
      merged.push(best);
    }
    return merged.sort((a, b) => b.riskScore - a.riskScore).slice(0, MAX_SUGGESTIONS);
  }
  /**
   * @brief Calculate risk score from change pattern.
   */
  calculateChangeRiskScore(change) {
    let score = 0;
    if (change.changeCount >= 3) {
      score = 3;
    } else if (change.changeCount >= 2) {
      score = 2;
    } else {
      score = 1;
    }
    if (change.stepsAgo === 0) {
      score += 0.5;
    }
    return Math.min(score, 3);
  }
  /**
   * @brief Convert numeric score to risk level.
   */
  scoreToRiskLevel(score) {
    if (score >= HIGH_RISK_THRESHOLD)
      return "high";
    if (score >= MEDIUM_RISK_THRESHOLD)
      return "medium";
    return "low";
  }
  /**
   * @brief Convert BoundaryRisk to WatchSuggestion.
   */
  boundaryRiskToSuggestion(risk) {
    return {
      variable: risk.variable,
      reason: risk.reason,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskLevel === "high" ? 3 : risk.riskLevel === "medium" ? 2 : 1,
      expression: risk.expression,
      category: "boundary",
      metadata: {
        threshold: risk.threshold
      }
    };
  }
  // ==========================================================================
  // Private Helpers - Data Gathering
  // ==========================================================================
  /**
   * @brief Gather all variables from current stack frame.
   */
  async gatherVariables(session) {
    const variables = [];
    try {
      const result = await getStackFrameVariables(session, { frameId: 0 });
      if (result.success && result.scopes) {
        for (const scope of result.scopes) {
          if (scope.variables) {
            variables.push(...scope.variables);
          }
        }
      }
    } catch (e) {
      logger.warn(LOG10, `Failed to gather variables: ${e.message}`);
    }
    return variables;
  }
  /**
   * @brief Get current source line for context analysis.
   */
  async getCurrentSourceLine(session, location) {
    if (!location || !location.file) {
      return "";
    }
    try {
      const uri = vscode7.Uri.file(location.file);
      const document = await vscode7.workspace.openTextDocument(uri);
      const line = document.lineAt(location.line - 1);
      return line.text;
    } catch (e) {
      logger.warn(LOG10, `Failed to get source line: ${e.message}`);
      return "";
    }
  }
};
var watchSuggestService = new WatchSuggestService();

// src/debug/GlobalDiscoveryService.ts
init_logging();

// src/debug/SymbolParser.ts
var import_child_process = require("child_process");
var fs4 = __toESM(require("fs"));
init_logging();
var LOG11 = "SymbolParser";
var SymbolParser = class {
  binaryPath;
  constructor(binaryPath) {
    this.binaryPath = binaryPath;
  }
  /**
   * @brief Discover all global variables in binary.
   *
   * @return Array of global variable info.
   */
  async discoverGlobals() {
    try {
      if (!fs4.existsSync(this.binaryPath)) {
        logger.error(LOG11, `Binary not found: ${this.binaryPath}`);
        return [];
      }
      const symbols = await this.parseWithNm();
      const globals = symbols.filter(
        (sym) => sym.section === ".data" || sym.section === ".bss" || sym.section === ".rodata"
      );
      logger.info(LOG11, `Discovered ${globals.length} global variables`);
      return globals;
    } catch (e) {
      logger.error(LOG11, `Symbol parsing failed: ${e.message}`);
      return [];
    }
  }
  /**
   * @brief Discover globals matching name patterns.
   *
   * @param [in]  patterns  Array of glob patterns (e.g., ['*status*', '*error*'])
   *
   * @return Filtered array of matching globals.
   */
  async discoverByPattern(patterns) {
    const allGlobals = await this.discoverGlobals();
    return allGlobals.filter(
      (global) => patterns.some((pattern) => this.matchesPattern(global.name, pattern))
    );
  }
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  /**
   * @brief Parse symbol table using nm command.
   *
   * @return Array of all symbols.
   */
  async parseWithNm() {
    return new Promise((resolve, reject) => {
      const args = ["-t", "x", "--defined-only", this.binaryPath];
      const proc = (0, import_child_process.spawn)("nm", args);
      let output = "";
      let errorOutput = "";
      proc.stdout.on("data", (data) => {
        output += data.toString();
      });
      proc.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
      proc.on("close", (code) => {
        if (code !== 0 && !output) {
          logger.warn(LOG11, `nm exited with code ${code}: ${errorOutput}`);
          resolve([]);
          return;
        }
        const symbols = this.parseNmOutput(output);
        resolve(symbols);
      });
      proc.on("error", (err) => {
        logger.error(LOG11, `nm spawn failed: ${err.message}`);
        reject(err);
      });
    });
  }
  /**
   * @brief Parse nm output into structured format.
   *
   * nm output format: "<address> <type> <name>"
   * Example: "000000000001a988 B Rte_ErrorCount"
   *
   * @param [in]  output  nm command output.
   *
   * @return Array of symbol info.
   */
  parseNmOutput(output) {
    const symbols = [];
    const lines = output.split("\n").filter((line) => line.trim());
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3)
        continue;
      const address = parts[0];
      const type = parts[1];
      const name = parts.slice(2).join(" ");
      const section = this.parseSectionType(type);
      if (section === "other") {
        continue;
      }
      symbols.push({
        name,
        address: `0x${address}`,
        section,
        size: void 0,
        // Would need objdump for size
        type: "unknown"
      });
    }
    return symbols;
  }
  /**
   * @brief Parse nm symbol type to section.
   *
   * @param [in]  type  nm symbol type character.
   *
   * @return Section type.
   */
  parseSectionType(type) {
    switch (type) {
      case "B":
      case "b":
        return ".bss";
      case "D":
      case "d":
        return ".data";
      case "R":
      case "r":
        return ".rodata";
      case "T":
      case "t":
        return ".text";
      default:
        return "other";
    }
  }
  /**
   * @brief Check if name matches glob pattern.
   *
   * @param [in]  name     Variable name.
   * @param [in]  pattern  Glob pattern (e.g., '*status*')
   *
   * @return True if matches.
   */
  matchesPattern(name, pattern) {
    const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\./g, "\\.");
    const regex = new RegExp(`^${regexPattern}$`, "i");
    return regex.test(name);
  }
};

// src/debug/GlobalDiscoveryService.ts
init_session();
var LOG12 = "GlobalDiscovery";
var DEFAULT_SUSPICIOUS_PATTERNS = [
  "*status*",
  "*state*",
  "*error*",
  "*flag*",
  "*count*",
  "*index*",
  "*mode*",
  "*phase*",
  "*ready*",
  "*active*",
  "*enable*",
  "*disable*",
  "*config*",
  "*setting*",
  "*limit*",
  "*threshold*",
  "*buffer*",
  "*queue*",
  "*stack*"
];
var GlobalDiscoveryService = class {
  parsers = /* @__PURE__ */ new Map();
  cache = /* @__PURE__ */ new Map();
  cacheTimeoutMs = 6e4;
  // 1 minute
  /**
   * @brief Discover all global variables in current binary.
   *
   * @param [in]  binaryPath  Optional binary path (uses active session if not provided)
   *
   * @return Discovery result.
   */
  async discoverGlobals(binaryPath) {
    try {
      if (!binaryPath) {
        const session = getActiveSession();
        if (!session) {
          throw new Error("No active debug session and no binary path provided");
        }
        binaryPath = session.configuration.program;
        if (!binaryPath) {
          throw new Error("Cannot determine binary path from session");
        }
      }
      const cached = this.cache.get(binaryPath);
      if (cached && Date.now() - new Date(cached.discoveredAt).getTime() < this.cacheTimeoutMs) {
        logger.debug(LOG12, `Cache hit for ${binaryPath}`);
        return cached;
      }
      logger.info(LOG12, `Discovering globals in ${binaryPath}`);
      const parser = this.getOrCreateParser(binaryPath);
      const allGlobals = await parser.discoverGlobals();
      const suspiciousGlobals = await this.filterByPattern(
        allGlobals,
        DEFAULT_SUSPICIOUS_PATTERNS
      );
      const result = {
        allGlobals,
        suspiciousGlobals,
        binaryPath,
        discoveredAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.cache.set(binaryPath, result);
      logger.info(LOG12, `Discovered ${allGlobals.length} globals, ${suspiciousGlobals.length} suspicious`);
      return result;
    } catch (e) {
      logger.error(LOG12, `Discovery failed: ${e.message}`);
      return {
        allGlobals: [],
        suspiciousGlobals: [],
        binaryPath: binaryPath || "unknown",
        discoveredAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  /**
   * @brief Discover globals matching custom patterns.
   *
   * @param [in]  patterns  Array of glob patterns.
   * @param [in]  binaryPath  Optional binary path.
   *
   * @return Filtered array of matching globals.
   */
  async discoverByPattern(patterns, binaryPath) {
    const result = await this.discoverGlobals(binaryPath);
    return this.filterByPattern(result.allGlobals, patterns);
  }
  /**
   * @brief Filter globals by name patterns.
   *
   * @param [in]  globals   Array of globals to filter.
   * @param [in]  patterns  Array of glob patterns.
   *
   * @return Filtered array.
   */
  filterByPattern(globals, patterns) {
    return globals.filter(
      (global) => patterns.some((pattern) => this.matchesPattern(global.name, pattern))
    );
  }
  /**
   * @brief Clear discovery cache.
   *
   * @param [in]  binaryPath  Optional binary path (clears all if not provided)
   */
  clearCache(binaryPath) {
    if (binaryPath) {
      this.cache.delete(binaryPath);
      logger.info(LOG12, `Cleared cache for ${binaryPath}`);
    } else {
      this.cache.clear();
      logger.info(LOG12, "Cleared all caches");
    }
  }
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  /**
   * @brief Get or create symbol parser for binary.
   *
   * @param [in]  binaryPath  Binary path.
   *
   * @return Symbol parser.
   */
  getOrCreateParser(binaryPath) {
    let parser = this.parsers.get(binaryPath);
    if (!parser) {
      parser = new SymbolParser(binaryPath);
      this.parsers.set(binaryPath, parser);
      logger.debug(LOG12, `Created parser for ${binaryPath}`);
    }
    return parser;
  }
  /**
   * @brief Check if name matches glob pattern.
   *
   * @param [in]  name     Variable name.
   * @param [in]  pattern  Glob pattern.
   *
   * @return True if matches.
   */
  matchesPattern(name, pattern) {
    const cleanPattern = pattern.replace(/\*/g, "");
    return name.toLowerCase().includes(cleanPattern.toLowerCase());
  }
};
var globalDiscoveryService = new GlobalDiscoveryService();

// src/debug/WatchChangeTracker.ts
init_logging();
init_inspection();
init_events();
var LOG13 = "WatchChangeTracker";
var MAX_HISTORY_SIZE = 100;
var WatchChangeTracker = class {
  watchedVariables = /* @__PURE__ */ new Map();
  changes = [];
  enabled = false;
  /**
   * @brief Enable change tracking.
   */
  enable() {
    this.enabled = true;
    logger.info(LOG13, "Change tracking enabled");
  }
  /**
   * @brief Disable change tracking.
   */
  disable() {
    this.enabled = false;
    logger.info(LOG13, "Change tracking disabled");
  }
  /**
   * @brief Add variable to watch list.
   *
   * @param [in]  name  Variable name.
   */
  async watchVariable(session, name) {
    const value = await this.evaluateVariable(session, name);
    this.watchedVariables.set(name, {
      name,
      value,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    });
    logger.debug(LOG13, `Added to watch: ${name} = ${value}`);
  }
  /**
   * @brief Remove variable from watch list.
   *
   * @param [in]  name  Variable name.
   */
  unwatchVariable(name) {
    this.watchedVariables.delete(name);
    logger.debug(LOG13, `Removed from watch: ${name}`);
  }
  /**
   * @brief Track and detect changes for all watched variables.
   *
   * @param [in]  session  VS Code debug session.
   *
   * @return Array of detected changes.
   */
  async trackAndDetect(session) {
    if (!this.enabled) {
      return [];
    }
    const newChanges = [];
    for (const [name, watched] of this.watchedVariables) {
      const newValue = await this.evaluateVariable(session, name);
      const oldValue = watched.value;
      if (oldValue !== null && oldValue !== newValue) {
        const change = {
          variable: name,
          oldValue: oldValue || "null",
          newValue: newValue || "null",
          detectedAt: (/* @__PURE__ */ new Date()).toISOString(),
          location: await this.getCurrentLocation(session)
        };
        newChanges.push(change);
        logger.info(LOG13, `Change detected: ${name} = ${oldValue} \u2192 ${newValue}`);
      }
      this.watchedVariables.set(name, {
        name,
        value: newValue,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    this.changes.push(...newChanges);
    if (this.changes.length > MAX_HISTORY_SIZE) {
      this.changes = this.changes.slice(-MAX_HISTORY_SIZE);
    }
    return newChanges;
  }
  /**
   * @brief Get all detected changes.
   *
   * @return Array of changes.
   */
  getChanges() {
    return [...this.changes];
  }
  /**
   * @brief Get recent changes (last N).
   *
   * @param [in]  limit  Maximum number of changes to return.
   *
   * @return Array of recent changes.
   */
  getRecentChanges(limit = 10) {
    return this.changes.slice(-limit);
  }
  /**
   * @brief Clear change history.
   */
  clearChanges() {
    this.changes = [];
    logger.debug(LOG13, "Change history cleared");
  }
  /**
   * @brief Get list of watched variables.
   *
   * @return Array of watched variable names.
   */
  getWatchedVariables() {
    return Array.from(this.watchedVariables.keys());
  }
  /**
   * @brief Get current value of watched variable.
   *
   * @param [in]  name  Variable name.
   *
   * @return Current value or null.
   */
  getVariableValue(name) {
    return this.watchedVariables.get(name)?.value || null;
  }
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  /**
   * @brief Evaluate variable value.
   *
   * @param [in]  session  VS Code debug session.
   * @param [in]  name     Variable name.
   *
   * @return Variable value or null.
   */
  async evaluateVariable(session, name) {
    try {
      const frameId = getCurrentFrameId(session.id) ?? 0;
      const result = await evaluate(session, {
        expression: name,
        frameId
      });
      if (result.success && result.result) {
        return result.result;
      }
      return null;
    } catch (e) {
      logger.debug(LOG13, `Failed to evaluate ${name}: ${e.message}`);
      return null;
    }
  }
  /**
   * @brief Get current debug location.
   *
   * @param [in]  session  VS Code debug session.
   *
   * @return Location info or undefined.
   */
  async getCurrentLocation(session) {
    try {
      const frameId = getCurrentFrameId(session.id) ?? 0;
      const stackResponse = await session.customRequest("stackTrace", {
        threadId: getCurrentThreadId(session.id) ?? 1,
        startFrame: frameId,
        levels: 1
      });
      if (stackResponse.stackFrames && stackResponse.stackFrames.length > 0) {
        const frame = stackResponse.stackFrames[0];
        return {
          file: frame.source?.path || "unknown",
          line: frame.line || 0,
          function: frame.name
        };
      }
      return void 0;
    } catch (e) {
      logger.debug(LOG13, `Failed to get location: ${e.message}`);
      return void 0;
    }
  }
};
var watchChangeTracker = new WatchChangeTracker();

// src/server/routes/subagents.routes.ts
init_SubagentOrchestrator();
async function handleSubagentsRequest(tasks) {
  if (!Array.isArray(tasks)) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: "Body must be an array of SubagentTask objects",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  try {
    const results = await subagentOrchestrator.runParallelSubagents(tasks);
    return {
      statusCode: 200,
      body: {
        success: true,
        data: results,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  } catch (error) {
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

// src/commands/CommandHandler.ts
var vscode9 = __toESM(require("vscode"));
var fs5 = __toESM(require("fs"));
var path4 = __toESM(require("path"));
init_logging();
var LOG15 = "CommandHandler";
var CommandHandler = class {
  /**
   * $DD DD-SW-9.1
   *
   * @brief Executes custom macro slash commands for the proxy.
   *
   * @param [in]  command   The command string starting with '/' (e.g., "/init").
   * @param [in]  args      JSON object containing command-specific arguments.
   *
   * @return Promise resolving to command-specific result data.
   *
   * @throws Error if the command is unknown or arguments are invalid.
   *
   * $ARCH ARCH-3
   */
  async handleCommand(command, args) {
    logger.info(LOG15, `Executing command: ${command}`);
    switch (command) {
      case "/init":
        return this.handleInitCommand(args);
      case "/debug-crash":
        return this.handleDebugCrash();
      case "/create-agent":
        return this.handleCreateAgent(args);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
  /**************************************************************************
   * Internal Command Handlers
   **************************************************************************/
  /**
   * $DD DD-SW-9.2
   *
   * @brief Handle the /create-agent command.
   */
  async handleCreateAgent(args) {
    if (!args || !args.name || !args.requirements) {
      throw new Error(
        "Missing 'name' or 'requirements' in /create-agent arguments"
      );
    }
    const { subagentCreatorPrompt: subagentCreatorPrompt2 } = (init_prompts(), __toCommonJS(prompts_exports));
    const { subagentOrchestrator: subagentOrchestrator2 } = (init_SubagentOrchestrator(), __toCommonJS(SubagentOrchestrator_exports));
    const model = args.model || "qwen";
    const prompt = `${subagentCreatorPrompt2}

USER REQUIREMENTS:
Name: ${args.name}
Task: ${args.requirements}

Generate the subagent .md file content now and save it.`;
    logger.info(LOG15, `Spawning agent creator for: ${args.name}`);
    const result = await subagentOrchestrator2.runParallelSubagents(
      [
        {
          id: `create-agent-${args.name}`,
          command: model,
          args: ["-y"],
          input: prompt
        }
      ],
      12e4
    );
    return {
      message: "Agent creation process initiated",
      result: result[0]
    };
  }
  /**
   * $DD DD-SW-9.3
   *
   * @brief Handle the /init command.
   */
  async handleInitCommand(args) {
    if (!vscode9.workspace.workspaceFolders || vscode9.workspace.workspaceFolders.length === 0) {
      throw new Error("No workspace folders found to initialize");
    }
    const root = vscode9.workspace.workspaceFolders[0].uri.fsPath;
    const contextFilePath = path4.join(root, "PROJECT_CONTEXT.md");
    logger.info(LOG15, `Running /init on ${root}`);
    let content = `# Project Context

Generated by AI Debug Proxy \`/init\` command.

`;
    content += `## Workspace Root
\`${root}\`

`;
    try {
      const files = fs5.readdirSync(root);
      content += `## Top Level Files
`;
      files.forEach((f) => {
        content += `- ${f}
`;
      });
      fs5.writeFileSync(contextFilePath, content, "utf-8");
      return {
        message: "Initialization complete",
        contextFile: contextFilePath
      };
    } catch (e) {
      throw new Error(`Failed to initialize: ${e.message}`);
    }
  }
  /**
   * @brief Handle the /debug-crash command (stub).
   */
  async handleDebugCrash() {
    throw new Error("/debug-crash: not implemented");
  }
};
var commandHandler = new CommandHandler();

// src/lsp/LspService.ts
var vscode10 = __toESM(require("vscode"));
init_logging();
var LOG16 = "LspService";
var LspService = class {
  /**************************************************************************
   * Public Methods
   **************************************************************************/
  /**
   * $DD DD-SW-7.1
   *
   * @brief Retrieve document symbols for a source file.
   *
   * Queries the language server to obtain structural symbols
   * present within the document.
   *
   * @param [in]  fsPath      Absolute filesystem path to the source file.
   *
   * @return List of symbols discovered in the document.
   *
   * @retval DocumentSymbol[]      Hierarchical symbol tree
   * @retval SymbolInformation[]   Flat symbol list
   *
   * @throws Error if the VSCode command invocation fails.
   *
   * [Satisfies $ARCH ARCH-6]
   */
  async getDocumentSymbols(fsPath) {
    logger.debug(LOG16, `Getting document symbols for: ${fsPath}`);
    try {
      const uri = vscode10.Uri.file(fsPath);
      const symbols = await vscode10.commands.executeCommand("vscode.executeDocumentSymbolProvider", uri);
      return symbols || [];
    } catch (e) {
      logger.error(LOG16, `Failed to get symbols: ${e.message}`);
      throw e;
    }
  }
  /**
   * $DD DD-SW-7.2
   *
   * @brief Retrieve references for a symbol at a given position.
   *
   * Queries the language server to obtain all locations where
   * the symbol at the specified position is referenced.
   *
   * @param [in]  fsPath      Absolute filesystem path to the source file.
   * @param [in]  line        0-based line index.
   * @param [in]  character   0-based character index.
   *
   * @return List of reference locations.
   *
   * [Satisfies $ARCH ARCH-6]
   */
  async getReferences(fsPath, line, character) {
    logger.debug(LOG16, `Getting references for: ${fsPath}:${line}:${character}`);
    try {
      const uri = vscode10.Uri.file(fsPath);
      const position = new vscode10.Position(line, character);
      const references = await vscode10.commands.executeCommand("vscode.executeReferenceProvider", uri, position);
      return references || [];
    } catch (e) {
      logger.error(LOG16, `Failed to get references: ${e.message}`);
      throw e;
    }
  }
  /**
   * $DD DD-SW-7.3
   *
   * @brief Retrieve incoming calls for a symbol.
   *
   * Analyzes the call hierarchy to find all functions/methods
   * that call the symbol at the specified position.
   *
   * @param [in]  fsPath      Absolute filesystem path.
   * @param [in]  line        0-based line index.
   * @param [in]  character   0-based character index.
   *
   * @return List of incoming calls.
   *
   * [Satisfies $ARCH ARCH-6]
   */
  async getCallHierarchyIncoming(fsPath, line, character) {
    logger.debug(
      LOG16,
      `Getting incoming calls for: ${fsPath}:${line}:${character}`
    );
    try {
      const uri = vscode10.Uri.file(fsPath);
      const position = new vscode10.Position(line, character);
      const items = await vscode10.commands.executeCommand("vscode.prepareCallHierarchy", uri, position);
      if (!items || items.length === 0) {
        return [];
      }
      const incomingCalls = await vscode10.commands.executeCommand("vscode.provideIncomingCalls", items[0]);
      return incomingCalls || [];
    } catch (e) {
      logger.error(LOG16, `Failed to get call hierarchy: ${e.message}`);
      throw e;
    }
  }
  /**
   * $DD DD-SW-7.4
   *
   * @brief Retrieve outgoing calls from a symbol.
   *
   * Analyzes the call hierarchy to find all functions/methods
   * called by the symbol at the specified position.
   *
   * @param [in]  fsPath      Absolute filesystem path.
   * @param [in]  line        0-based line index.
   * @param [in]  character   0-based character index.
   *
   * @return List of outgoing calls.
   *
   * [Satisfies $ARCH ARCH-6]
   */
  async getCallHierarchyOutgoing(fsPath, line, character) {
    logger.debug(
      LOG16,
      `Getting outgoing calls for: ${fsPath}:${line}:${character}`
    );
    try {
      const uri = vscode10.Uri.file(fsPath);
      const position = new vscode10.Position(line, character);
      const items = await vscode10.commands.executeCommand("vscode.prepareCallHierarchy", uri, position);
      if (!items || items.length === 0) {
        return [];
      }
      const outgoingCalls = await vscode10.commands.executeCommand("vscode.provideOutgoingCalls", items[0]);
      return outgoingCalls || [];
    } catch (e) {
      logger.error(LOG16, `Failed to get outgoing call hierarchy: ${e.message}`);
      throw e;
    }
  }
};
var lspService = new LspService();

// src/server/router.ts
init_logging();
init_errors();
var PKG_VERSION = (() => {
  try {
    const pkgPath = path5.join(__dirname, "..", "package.json");
    return JSON.parse(fs6.readFileSync(pkgPath, "utf8")).version;
  } catch {
    return "unknown";
  }
})();
var LOG17 = "Router";
async function handleRequest(method, url, body, _req) {
  const parsedUrl = new URL(url, "http://localhost");
  const pathname = parsedUrl.pathname;
  logger.debug(LOG17, "Routing request", { method, pathname });
  const result = await handleSystemRouting(method, pathname, body, url) ?? await handleWatchRouting(method, pathname, body, url) ?? await handleSubagentRouting(method, pathname, body) ?? await handleCommandRouting(method, pathname, body) ?? await handleLspRouting(method, pathname, parsedUrl) ?? await handleDebugRouting(method, pathname, body);
  if (result)
    return result;
  return {
    statusCode: 404,
    body: {
      success: false,
      error: `Not found: ${method} ${pathname}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
async function handleSystemRouting(method, pathname, body, url) {
  if (method !== "GET" && method !== "POST")
    return null;
  if (pathname === "/api/ping") {
    return {
      statusCode: 200,
      body: {
        success: true,
        data: {
          message: "pong",
          version: PKG_VERSION,
          operations: debugController.getOperations()
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  if (pathname === "/api/status") {
    const activeSession = getActiveSession();
    return {
      statusCode: 200,
      body: {
        success: true,
        data: {
          version: PKG_VERSION,
          hasActiveSession: !!activeSession,
          sessionId: activeSession?.id || null,
          sessionName: activeSession?.name || null
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  if (pathname === "/api/session/state" && method === "GET") {
    const activeSession = getActiveSession();
    if (!activeSession) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: "No active debug session"
        }
      };
    }
    const threadId = getCurrentThreadId(activeSession.id);
    const frameId = getCurrentFrameId(activeSession.id);
    const location = getLastLocation(activeSession.id);
    const stateValid = isStateValid(activeSession.id);
    return {
      statusCode: 200,
      body: {
        success: true,
        data: {
          sessionId: activeSession.id,
          threadId: threadId ?? null,
          frameId: frameId ?? null,
          location: location ?? null,
          stateValid: stateValid ?? false
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  if (pathname === "/api/session/set_context" && method === "POST") {
    const activeSession = getActiveSession();
    if (!activeSession) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: "No active debug session"
        }
      };
    }
    if (!body?.threadId && !body?.frameId) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: "Missing 'threadId' or 'frameId' parameter"
        }
      };
    }
    const { setCurrentThreadId: setCurrentThreadId2, setCurrentFrameId: setCurrentFrameId2 } = (init_events(), __toCommonJS(events_exports));
    if (body.threadId !== void 0) {
      setCurrentThreadId2(body.threadId, activeSession.id);
    }
    if (body.frameId !== void 0) {
      setCurrentFrameId2(body.frameId, activeSession.id);
    }
    return {
      statusCode: 200,
      body: {
        success: true,
        data: {
          message: "Session context updated",
          threadId: body.threadId ?? null,
          frameId: body.frameId ?? null
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  if (pathname === "/api/context" && method === "GET") {
    const activeSession = getActiveSession();
    if (!activeSession) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: "No active debug session"
        }
      };
    }
    try {
      const query = new URL(url, "http://localhost").searchParams;
      const options = {};
      const depth = query.get("depth");
      if (depth)
        options.depth = parseInt(depth, 10);
      const include = query.get("include");
      if (include)
        options.include = include.split(",");
      const exclude = query.get("exclude");
      if (exclude)
        options.exclude = exclude.split(",");
      const sourceLines = query.get("sourceLines");
      if (sourceLines)
        options.sourceLines = parseInt(sourceLines, 10);
      const context = await aggregateContext(activeSession, options);
      return {
        statusCode: 200,
        body: {
          success: true,
          data: context,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    } catch (e) {
      logger.error(LOG17, `Context aggregation failed: ${e.message}`);
      return {
        statusCode: 500,
        body: {
          success: false,
          error: `Context aggregation failed: ${e.message}`
        }
      };
    }
  }
  return null;
}
async function handleWatchRouting(method, pathname, body, url) {
  if (pathname === "/api/watch/suggest" && method === "GET") {
    const activeSession = getActiveSession();
    if (!activeSession) {
      return {
        statusCode: 400,
        body: { success: false, error: "No active debug session" }
      };
    }
    try {
      const result = await watchSuggestService.getSuggestions(activeSession);
      return {
        statusCode: 200,
        body: {
          success: true,
          data: result,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    } catch (e) {
      logger.error(LOG17, `Watch suggestions failed: ${e.message}`);
      return {
        statusCode: 500,
        body: {
          success: false,
          error: `Watch suggestions failed: ${e.message}`
        }
      };
    }
  }
  if (pathname === "/api/watch/auto" && method === "POST") {
    const activeSession = getActiveSession();
    if (!activeSession) {
      return {
        statusCode: 400,
        body: { success: false, error: "No active debug session" }
      };
    }
    watchChangeTracker.enable();
    const patterns = body?.patterns || [];
    if (patterns.length > 0) {
      const globals = await globalDiscoveryService.discoverByPattern(patterns);
      for (const global of globals) {
        await watchChangeTracker.watchVariable(activeSession, global.name);
      }
    }
    return {
      statusCode: 200,
      body: {
        success: true,
        data: {
          message: "Auto-watch enabled",
          watchedCount: watchChangeTracker.getWatchedVariables().length
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  if (pathname === "/api/watch/auto" && method === "DELETE") {
    watchChangeTracker.disable();
    return {
      statusCode: 200,
      body: {
        success: true,
        data: { message: "Auto-watch disabled" },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  if (pathname === "/api/watch/changes" && method === "GET") {
    const changes = watchChangeTracker.getChanges();
    return {
      statusCode: 200,
      body: {
        success: true,
        data: { changes },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  if (pathname === "/api/watch/clear_changes" && method === "POST") {
    watchChangeTracker.clearChanges();
    return {
      statusCode: 200,
      body: {
        success: true,
        data: { message: "Change history cleared" },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  if (pathname === "/api/discover/globals" && method === "GET") {
    try {
      const result = await globalDiscoveryService.discoverGlobals();
      return {
        statusCode: 200,
        body: {
          success: true,
          data: result,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    } catch (e) {
      logger.error(LOG17, `Global discovery failed: ${e.message}`);
      return {
        statusCode: 500,
        body: {
          success: false,
          error: `Global discovery failed: ${e.message}`
        }
      };
    }
  }
  return null;
}
async function handleSubagentRouting(method, pathname, body) {
  if (pathname === "/api/subagents" && method === "POST") {
    return await handleSubagentsRequest(body);
  }
  return null;
}
async function handleCommandRouting(method, pathname, body) {
  if (pathname === "/api/commands" && method === "POST") {
    if (!body?.command) {
      return {
        statusCode: 400,
        body: { success: false, error: "Missing 'command' field" }
      };
    }
    try {
      const result = await commandHandler.handleCommand(body.command, body.args);
      return { statusCode: 200, body: { success: true, data: result } };
    } catch (e) {
      return { statusCode: 500, body: { success: false, error: e.message } };
    }
  }
  return null;
}
async function handleLspRouting(method, pathname, parsedUrl) {
  if (method !== "GET")
    return null;
  if (pathname === "/api/symbols") {
    const fsPath = parsedUrl.searchParams.get("fsPath");
    if (!fsPath)
      return { statusCode: 400, body: { success: false, error: "Missing fsPath" } };
    try {
      const symbols = await lspService.getDocumentSymbols(fsPath);
      return { statusCode: 200, body: { success: true, data: symbols } };
    } catch (e) {
      return { statusCode: 500, body: { success: false, error: e.message } };
    }
  }
  if (pathname === "/api/references") {
    const fsPath = parsedUrl.searchParams.get("fsPath");
    const line = parseInt(parsedUrl.searchParams.get("line") || "-1");
    const char = parseInt(parsedUrl.searchParams.get("character") || "-1");
    if (!fsPath || line < 0 || char < 0)
      return { statusCode: 400, body: { success: false, error: "Missing params" } };
    try {
      const refs = await lspService.getReferences(fsPath, line, char);
      return { statusCode: 200, body: { success: true, data: refs } };
    } catch (e) {
      return { statusCode: 500, body: { success: false, error: e.message } };
    }
  }
  if (pathname === "/api/call-hierarchy") {
    const fsPath = parsedUrl.searchParams.get("fsPath");
    const line = parseInt(parsedUrl.searchParams.get("line") || "-1");
    const char = parseInt(parsedUrl.searchParams.get("character") || "-1");
    const dir = parsedUrl.searchParams.get("direction") || "incoming";
    if (!fsPath || line < 0 || char < 0)
      return { statusCode: 400, body: { success: false, error: "Missing params" } };
    try {
      const calls = dir === "outgoing" ? await lspService.getCallHierarchyOutgoing(fsPath, line, char) : await lspService.getCallHierarchyIncoming(fsPath, line, char);
      return { statusCode: 200, body: { success: true, data: calls } };
    } catch (e) {
      return { statusCode: 500, body: { success: false, error: e.message } };
    }
  }
  return null;
}
async function handleDebugRouting(method, pathname, body) {
  if (method !== "POST")
    return null;
  if (pathname === "/api/debug") {
    return handleDebugOperation(body);
  }
  if (pathname === "/api/debug/batch") {
    return handleBatchOperations(body);
  }
  return null;
}
async function handleDebugOperation(body) {
  if (!body || typeof body !== "object") {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: "Request body must be a JSON object with 'operation' field",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  const { operation, params } = body;
  if (!operation || typeof operation !== "string") {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: "Missing or invalid 'operation' field",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  const validation = validateOperationArgs(operation, params);
  if (!validation.isValid) {
    logger.warn(LOG17, "validation.failed", { operation, message: validation.message });
    return {
      statusCode: 400,
      body: {
        success: false,
        operation,
        error: validation.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  try {
    const result = await debugController.executeOperation(
      operation,
      validation.params
    );
    return {
      statusCode: 200,
      body: {
        success: true,
        operation,
        data: result,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  } catch (error) {
    logger.error(LOG17, "operation.failed", { operation, error: error.message });
    if (error instanceof DebugError) {
      return {
        statusCode: 400,
        body: {
          success: false,
          operation,
          error: error.toJSON(),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
    return {
      statusCode: 500,
      body: {
        success: false,
        operation,
        error: error.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
}
async function handleBatchOperations(body) {
  if (!body || !Array.isArray(body.operations)) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: "Request body must contain an 'operations' array",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  try {
    const result = await debugController.executeBatchOperations(
      body.operations,
      body.parallel
    );
    return {
      statusCode: 200,
      body: {
        success: true,
        data: result,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  } catch (error) {
    logger.error(LOG17, "batch.failed", { error: error.message });
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

// src/server/HttpServer.ts
var LOG18 = "HttpServer";
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
      logger.warn(LOG18, "server.already_running");
      return;
    }
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.onRequest(req, res);
      });
      this.server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          logger.error(LOG18, "port.in_use", { port: this.port });
          reject(new Error(`Port ${this.port} in use`));
        } else {
          logger.error(LOG18, "server.error", { error: err.message });
          reject(err);
        }
      });
      this.server.listen(this.port, "127.0.0.1", () => {
        logger.info(LOG18, "server.listening", { url: `http://127.0.0.1:${this.port}` });
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
        logger.info(LOG18, "server.stopped");
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
      logger.info(LOG18, "request.handled", { method, url, status, elapsed });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error(LOG18, "request.failed", { method, url, elapsed, error: error.message });
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
          logger.warn(LOG18, "error_response.failed", { error: writeErr.message });
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

// src/extension.ts
init_events();
init_logging();
var LOG19 = "Extension";
var server = null;
function activate(context) {
  logger.info(LOG19, "AI Debug Proxy activating...");
  const config = vscode11.workspace.getConfiguration("aiDebugProxy");
  const port = config.get("port", 9999);
  const autoStart = config.get("autoStart", true);
  const logLevel = config.get("logLevel", "info");
  setLogLevel(logLevel);
  registerDebugEventListeners(context);
  server = new HttpServer(port);
  context.subscriptions.push(
    vscode11.commands.registerCommand("ai-debug-proxy.start", async () => {
      if (server?.isRunning()) {
        vscode11.window.showInformationMessage(
          `AI Debug Proxy already running on port ${server.getPort()}`
        );
        return;
      }
      try {
        const currentConfig = vscode11.workspace.getConfiguration("aiDebugProxy");
        const currentPort = currentConfig.get("port", 9999);
        if (!server || server.getPort() !== currentPort) {
          server = new HttpServer(currentPort);
        }
        await server.start();
        vscode11.window.showInformationMessage(
          `AI Debug Proxy started on port ${currentPort}`
        );
      } catch (e) {
        vscode11.window.showErrorMessage(
          `Failed to start AI Debug Proxy: ${e.message}`
        );
      }
    })
  );
  context.subscriptions.push(
    vscode11.commands.registerCommand("ai-debug-proxy.stop", async () => {
      if (!server?.isRunning()) {
        vscode11.window.showInformationMessage("AI Debug Proxy is not running");
        return;
      }
      await server.stop();
      vscode11.window.showInformationMessage("AI Debug Proxy stopped");
    })
  );
  context.subscriptions.push(
    vscode11.commands.registerCommand("ai-debug-proxy.showLog", () => {
      outputChannel.show();
    })
  );
  context.subscriptions.push(
    vscode11.commands.registerCommand("ai-debug-proxy.installCLI", async () => {
      const src = path6.join(context.extensionPath, "resources", "ai-debug.sh");
      const installDir = path6.join(os.homedir(), ".local", "lib", "ai-debug-proxy");
      const target = path6.join(installDir, "ai-debug.sh");
      const sourceLine = `
# AI Debug Proxy CLI
source "${target}"
`;
      try {
        fs7.mkdirSync(installDir, { recursive: true });
        fs7.copyFileSync(src, target);
        fs7.chmodSync(target, 493);
        const rcFiles = [
          path6.join(os.homedir(), ".bashrc"),
          path6.join(os.homedir(), ".zshrc")
        ];
        const sourceCheck = `source "${target}"`;
        const appended = [];
        for (const rc of rcFiles) {
          try {
            const content = fs7.existsSync(rc) ? fs7.readFileSync(rc, "utf8") : "";
            if (!content.includes(sourceCheck)) {
              fs7.appendFileSync(rc, sourceLine);
              appended.push(path6.basename(rc));
            }
          } catch {
          }
        }
        const rcMsg = appended.length > 0 ? ` Source line added to: ${appended.join(", ")}.` : " Source line already present in shell rc files.";
        const open = await vscode11.window.showInformationMessage(
          `AI Debug CLI installed to ${target}.${rcMsg} Open a new terminal to use ai_launch, ai_bp, etc.`,
          "Open file"
        );
        if (open) {
          vscode11.window.showTextDocument(vscode11.Uri.file(target));
        }
      } catch (e) {
        vscode11.window.showErrorMessage(
          `AI Debug Proxy: Failed to install CLI \u2014 ${e.message}`
        );
      }
    })
  );
  context.subscriptions.push(
    vscode11.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("aiDebugProxy.logLevel")) {
        const newLevel = vscode11.workspace.getConfiguration("aiDebugProxy").get("logLevel", "info");
        setLogLevel(newLevel);
        logger.info(LOG19, `Log level changed to: ${newLevel}`);
      }
    })
  );
  if (autoStart) {
    server.start().then(
      () => logger.info(LOG19, `Auto-started on port ${port}`),
      (err) => logger.error(LOG19, `Auto-start failed: ${err.message}`)
    );
  }
  logger.info(LOG19, "AI Debug Proxy activated");
}
function deactivate() {
  logger.info(LOG19, "AI Debug Proxy deactivating...");
  if (server?.isRunning()) {
    server.stop();
  }
  outputChannel.dispose();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
