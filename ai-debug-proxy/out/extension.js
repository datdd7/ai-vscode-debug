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

// src/agent/SubagentOrchestrator.ts
var SubagentOrchestrator_exports = {};
__export(SubagentOrchestrator_exports, {
  SubagentOrchestrator: () => SubagentOrchestrator,
  subagentOrchestrator: () => subagentOrchestrator
});
var import_child_process, vscode7, LOG8, MAX_TASKS, MAX_CONCURRENCY, MAX_OUTPUT_BYTES, SubagentOrchestrator, subagentOrchestrator;
var init_SubagentOrchestrator = __esm({
  "src/agent/SubagentOrchestrator.ts"() {
    "use strict";
    import_child_process = require("child_process");
    vscode7 = __toESM(require("vscode"));
    init_logging();
    LOG8 = "SubagentOrchestrator";
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
          LOG8,
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
        logger.info(LOG8, `All ${tasks.length} subagents completed.`);
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
          const config = vscode7.workspace.getConfiguration("aiDebugProxy");
          const allowedCommands = config.get("subagents.allowedCommands", []);
          if (allowedCommands.length === 0 || !allowedCommands.includes(task.command)) {
            logger.error(LOG8, `[Subagent ${task.id}] Blocked by whitelist: ${task.command}`);
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
            LOG8,
            `[Subagent ${task.id}] Spawning: ${task.command} ${task.args.join(" ")}`
          );
          const child = (0, import_child_process.spawn)(task.command, task.args, {
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
              LOG8,
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
            logger.debug(LOG8, `[Subagent ${task.id}] Exited with code ${code}`);
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
              LOG8,
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
var fs6 = __toESM(require("fs"));
var os = __toESM(require("os"));
var path6 = __toESM(require("path"));
var vscode10 = __toESM(require("vscode"));

// src/server/HttpServer.ts
var http = __toESM(require("http"));
init_logging();

// src/server/router.ts
var path5 = __toESM(require("path"));
var fs5 = __toESM(require("fs"));

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

// src/debug/session.ts
var vscode3 = __toESM(require("vscode"));
var path2 = __toESM(require("path"));
var fs2 = __toESM(require("fs"));
init_logging();

// src/utils/errors.ts
var DebugError = class _DebugError extends Error {
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
var OperationError = class _OperationError extends Error {
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

// src/debug/events.ts
var vscode2 = __toESM(require("vscode"));
init_logging();
var LOG = "Events";
var _sessionState = /* @__PURE__ */ new Map();
var _stopResolvers = [];
function resolveWaitPromise(stopped = true) {
  const resolvers = _stopResolvers.splice(0);
  for (const resolve of resolvers)
    resolve(stopped);
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
  _sessionState.set(id, state);
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
function waitForStopEvent(timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const idx = _stopResolvers.indexOf(resolver);
      if (idx !== -1)
        _stopResolvers.splice(idx, 1);
      const lastStop = getLastStopEventBody();
      if (lastStop) {
        logger.info(LOG, `Program already stopped: reason=${lastStop.reason}`);
        resolve(true);
      } else {
        logger.warn(LOG, `Stop event timeout after ${timeoutMs}ms`);
        resolve(false);
      }
    }, timeoutMs);
    const resolver = (stopped) => {
      clearTimeout(timer);
      resolve(stopped);
    };
    _stopResolvers.push(resolver);
  });
}
function onDapStopEvent(callback) {
  stopEventCallbacks.push(callback);
}
var stopEventCallbacks = [];
var DapStopTracker = class {
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
        _sessionState.set(this.session.id, state);
        resolveWaitPromise(true);
        for (const cb of stopEventCallbacks) {
          try {
            cb(this.session.id, body);
          } catch (err) {
            logger.error(LOG, "Error in stop event callback", err);
          }
        }
      } else if (message.event === "terminated" || message.event === "exited") {
        logger.debug(LOG, `Program ${message.event} (Tracker)`);
        resolveWaitPromise(true);
      }
    }
  }
};
var DapStopTrackerFactory = class {
  createDebugAdapterTracker(session) {
    return new DapStopTracker(session);
  }
};
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
      resolveWaitPromise(true);
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

// src/debug/session.ts
var LOG2 = "Session";
var _lastSession;
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

// src/debug/inspection.ts
var vscode5 = __toESM(require("vscode"));
init_logging();
var LOG4 = "Inspection";
async function getThreadId(session) {
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
  const frameId = params.frameId ?? getCurrentTopFrameId();
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

// src/debug/execution.ts
var LOG5 = "Execution";
var STEP_TIMEOUT_MS = 3e4;
var CONTINUE_TIMEOUT_MS = 3e5;
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
    const stopPromise = waitForStopEvent(timeoutMs);
    const dapArgs = { threadId };
    await session.customRequest(dapCommand, dapArgs);
    const stopped = await stopPromise;
    if (!stopped) {
      logger.warn(
        LOG5,
        `${operationName} timeout: debugger may still be running`
      );
      return {
        success: true,
        stopReason: "running",
        errorMessage: `${operationName} did not hit a stop event within ${timeoutMs}ms. Program may still be running.`
      };
    }
    return await buildNavigationResult(session, operationName);
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
        logger.warn(LOG5, `Failed to get crash info: ${e.message}`);
      }
    }
  }
  return result;
}
async function nextStep(session) {
  return executeNavigationCommand(session, "next", "next", STEP_TIMEOUT_MS);
}
async function stepIn(session) {
  return executeNavigationCommand(
    session,
    "stepIn",
    "step_in",
    STEP_TIMEOUT_MS
  );
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
    const stopped = await stopPromise;
    return await buildNavigationResult(session, stopped ? "jump" : "running");
  } catch (e) {
    logger.error(LOG5, `${operationName} failed: ${e.message}`);
    return { success: false, errorMessage: `${operationName}: ${e.message}` };
  }
}

// src/debug/hardware.ts
init_logging();
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
      get_args: (args) => this.getArgs(args || {}),
      evaluate: (args) => evaluate(ensureActiveSession("evaluate"), args),
      pretty_print: (args) => prettyPrint(ensureActiveSession("pretty_print"), args),
      whatis: (args) => whatis(ensureActiveSession("whatis"), args),
      execute_statement: (args) => executeStatement(ensureActiveSession("execute_statement"), args),
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
      scopeFilter: ["Arguments", "Args", "Parameters"]
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
    const frameId = getCurrentTopFrameId();
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
  locationKey(loc) {
    try {
      return `${vscode6.Uri.file(loc.path).toString()}:${loc.line}`;
    } catch {
      return `${loc.path}:${loc.line}`;
    }
  }
};
var debugController = new DebugController();

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
var vscode8 = __toESM(require("vscode"));
var fs4 = __toESM(require("fs"));
var path4 = __toESM(require("path"));
init_logging();
var LOG9 = "CommandHandler";
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
    logger.info(LOG9, `Executing command: ${command}`);
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
    logger.info(LOG9, `Spawning agent creator for: ${args.name}`);
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
    if (!vscode8.workspace.workspaceFolders || vscode8.workspace.workspaceFolders.length === 0) {
      throw new Error("No workspace folders found to initialize");
    }
    const root = vscode8.workspace.workspaceFolders[0].uri.fsPath;
    const contextFilePath = path4.join(root, "PROJECT_CONTEXT.md");
    logger.info(LOG9, `Running /init on ${root}`);
    let content = `# Project Context

Generated by AI Debug Proxy \`/init\` command.

`;
    content += `## Workspace Root
\`${root}\`

`;
    try {
      const files = fs4.readdirSync(root);
      content += `## Top Level Files
`;
      files.forEach((f) => {
        content += `- ${f}
`;
      });
      fs4.writeFileSync(contextFilePath, content, "utf-8");
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
var vscode9 = __toESM(require("vscode"));
init_logging();
var LOG10 = "LspService";
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
    logger.debug(LOG10, `Getting document symbols for: ${fsPath}`);
    try {
      const uri = vscode9.Uri.file(fsPath);
      const symbols = await vscode9.commands.executeCommand("vscode.executeDocumentSymbolProvider", uri);
      return symbols || [];
    } catch (e) {
      logger.error(LOG10, `Failed to get symbols: ${e.message}`);
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
    logger.debug(LOG10, `Getting references for: ${fsPath}:${line}:${character}`);
    try {
      const uri = vscode9.Uri.file(fsPath);
      const position = new vscode9.Position(line, character);
      const references = await vscode9.commands.executeCommand("vscode.executeReferenceProvider", uri, position);
      return references || [];
    } catch (e) {
      logger.error(LOG10, `Failed to get references: ${e.message}`);
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
      LOG10,
      `Getting incoming calls for: ${fsPath}:${line}:${character}`
    );
    try {
      const uri = vscode9.Uri.file(fsPath);
      const position = new vscode9.Position(line, character);
      const items = await vscode9.commands.executeCommand("vscode.prepareCallHierarchy", uri, position);
      if (!items || items.length === 0) {
        return [];
      }
      const incomingCalls = await vscode9.commands.executeCommand("vscode.provideIncomingCalls", items[0]);
      return incomingCalls || [];
    } catch (e) {
      logger.error(LOG10, `Failed to get call hierarchy: ${e.message}`);
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
      LOG10,
      `Getting outgoing calls for: ${fsPath}:${line}:${character}`
    );
    try {
      const uri = vscode9.Uri.file(fsPath);
      const position = new vscode9.Position(line, character);
      const items = await vscode9.commands.executeCommand("vscode.prepareCallHierarchy", uri, position);
      if (!items || items.length === 0) {
        return [];
      }
      const outgoingCalls = await vscode9.commands.executeCommand("vscode.provideOutgoingCalls", items[0]);
      return outgoingCalls || [];
    } catch (e) {
      logger.error(LOG10, `Failed to get outgoing call hierarchy: ${e.message}`);
      throw e;
    }
  }
};
var lspService = new LspService();

// src/server/router.ts
init_logging();
var PKG_VERSION = (() => {
  try {
    const pkgPath = path5.join(__dirname, "..", "package.json");
    return JSON.parse(fs5.readFileSync(pkgPath, "utf8")).version;
  } catch {
    return "unknown";
  }
})();
var LOG11 = "Router";
async function handleRequest(method, url, body, _req) {
  const parsedUrl = new URL(url, "http://localhost");
  const pathname = parsedUrl.pathname;
  logger.debug(LOG11, "Routing request", { method, pathname });
  const result = await handleSystemRouting(method, pathname) ?? await handleSubagentRouting(method, pathname, body) ?? await handleCommandRouting(method, pathname, body) ?? await handleLspRouting(method, pathname, parsedUrl) ?? await handleDebugRouting(method, pathname, body);
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
async function handleSystemRouting(method, pathname) {
  if (method !== "GET")
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
    logger.warn(LOG11, "validation.failed", { operation, message: validation.message });
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
    logger.error(LOG11, "operation.failed", { operation, error: error.message });
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
    logger.error(LOG11, "batch.failed", { error: error.message });
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
var LOG12 = "HttpServer";
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
      logger.warn(LOG12, "server.already_running");
      return;
    }
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.onRequest(req, res);
      });
      this.server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          logger.error(LOG12, "port.in_use", { port: this.port });
          reject(new Error(`Port ${this.port} in use`));
        } else {
          logger.error(LOG12, "server.error", { error: err.message });
          reject(err);
        }
      });
      this.server.listen(this.port, "127.0.0.1", () => {
        logger.info(LOG12, "server.listening", { url: `http://127.0.0.1:${this.port}` });
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
        logger.info(LOG12, "server.stopped");
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
      logger.info(LOG12, "request.handled", { method, url, status, elapsed });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error(LOG12, "request.failed", { method, url, elapsed, error: error.message });
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
          logger.warn(LOG12, "error_response.failed", { error: writeErr.message });
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
init_logging();
var LOG13 = "Extension";
var server = null;
function activate(context) {
  logger.info(LOG13, "AI Debug Proxy activating...");
  const config = vscode10.workspace.getConfiguration("aiDebugProxy");
  const port = config.get("port", 9999);
  const autoStart = config.get("autoStart", true);
  const logLevel = config.get("logLevel", "info");
  setLogLevel(logLevel);
  registerDebugEventListeners(context);
  server = new HttpServer(port);
  context.subscriptions.push(
    vscode10.commands.registerCommand("ai-debug-proxy.start", async () => {
      if (server?.isRunning()) {
        vscode10.window.showInformationMessage(
          `AI Debug Proxy already running on port ${server.getPort()}`
        );
        return;
      }
      try {
        const currentConfig = vscode10.workspace.getConfiguration("aiDebugProxy");
        const currentPort = currentConfig.get("port", 9999);
        if (!server || server.getPort() !== currentPort) {
          server = new HttpServer(currentPort);
        }
        await server.start();
        vscode10.window.showInformationMessage(
          `AI Debug Proxy started on port ${currentPort}`
        );
      } catch (e) {
        vscode10.window.showErrorMessage(
          `Failed to start AI Debug Proxy: ${e.message}`
        );
      }
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("ai-debug-proxy.stop", async () => {
      if (!server?.isRunning()) {
        vscode10.window.showInformationMessage("AI Debug Proxy is not running");
        return;
      }
      await server.stop();
      vscode10.window.showInformationMessage("AI Debug Proxy stopped");
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("ai-debug-proxy.showLog", () => {
      outputChannel.show();
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("ai-debug-proxy.installCLI", async () => {
      const src = path6.join(context.extensionPath, "resources", "ai-debug.sh");
      const installDir = path6.join(os.homedir(), ".local", "lib", "ai-debug-proxy");
      const target = path6.join(installDir, "ai-debug.sh");
      const sourceLine = `
# AI Debug Proxy CLI
source "${target}"
`;
      try {
        fs6.mkdirSync(installDir, { recursive: true });
        fs6.copyFileSync(src, target);
        fs6.chmodSync(target, 493);
        const rcFiles = [
          path6.join(os.homedir(), ".bashrc"),
          path6.join(os.homedir(), ".zshrc")
        ];
        const sourceCheck = `source "${target}"`;
        const appended = [];
        for (const rc of rcFiles) {
          try {
            const content = fs6.existsSync(rc) ? fs6.readFileSync(rc, "utf8") : "";
            if (!content.includes(sourceCheck)) {
              fs6.appendFileSync(rc, sourceLine);
              appended.push(path6.basename(rc));
            }
          } catch {
          }
        }
        const rcMsg = appended.length > 0 ? ` Source line added to: ${appended.join(", ")}.` : " Source line already present in shell rc files.";
        const open = await vscode10.window.showInformationMessage(
          `AI Debug CLI installed to ${target}.${rcMsg} Open a new terminal to use ai_launch, ai_bp, etc.`,
          "Open file"
        );
        if (open) {
          vscode10.window.showTextDocument(vscode10.Uri.file(target));
        }
      } catch (e) {
        vscode10.window.showErrorMessage(
          `AI Debug Proxy: Failed to install CLI \u2014 ${e.message}`
        );
      }
    })
  );
  context.subscriptions.push(
    vscode10.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("aiDebugProxy.logLevel")) {
        const newLevel = vscode10.workspace.getConfiguration("aiDebugProxy").get("logLevel", "info");
        setLogLevel(newLevel);
        logger.info(LOG13, `Log level changed to: ${newLevel}`);
      }
    })
  );
  if (autoStart) {
    server.start().then(
      () => logger.info(LOG13, `Auto-started on port ${port}`),
      (err) => logger.error(LOG13, `Auto-start failed: ${err.message}`)
    );
  }
  logger.info(LOG13, "AI Debug Proxy activated");
}
function deactivate() {
  logger.info(LOG13, "AI Debug Proxy deactivating...");
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
