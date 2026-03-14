jest.mock("fs", () => ({ appendFileSync: jest.fn() }));
jest.mock(
  "vscode",
  () => ({
    debug: {
      onDidTerminateDebugSession: jest.fn(),
      activeDebugSession: null,
      breakpoints: [],
      removeBreakpoints: jest.fn(),
    },
    Uri: {
      file: (p: string) => ({
        toString: () => `file://${p}`,
        fsPath: p,
      }),
    },
    SourceBreakpoint: class { },
  }),
  { virtual: true },
);

// Mock all debug module dependencies
jest.mock("../session", () => ({
  launchSession: jest.fn().mockResolvedValue({
    success: true,
    sessionId: "mock-session",
    stopReason: "entry",
  }),
  restartSession: jest.fn().mockResolvedValue({ success: true }),
  quitSession: jest.fn().mockResolvedValue({ success: true }),
  ensureActiveSession: jest.fn().mockReturnValue({
    id: "mock-session",
    name: "Mock",
    customRequest: jest.fn((cmd: string, args: any) => {
      // Mock scopes request for watch operation
      if (cmd === "scopes") {
        return Promise.resolve({
          scopes: [
            {
              name: "Locals",
              variablesReference: 123,
              expensive: false,
            },
          ],
        });
      }
      // Mock variables request
      if (cmd === "variables") {
        return Promise.resolve({
          variables: [
            { name: "myVar", value: "42", variablesReference: 0 },
          ],
        });
      }
      return Promise.resolve({});
    }),
  }),
}));

jest.mock("../breakpoints", () => ({
  setBreakpoint: jest.fn().mockResolvedValue({ success: true }),
  setTempBreakpoint: jest.fn().mockResolvedValue({ success: true }),
  removeBreakpointByLocation: jest.fn().mockResolvedValue({ success: true }),
  removeAllBreakpointsInFile: jest.fn().mockResolvedValue({ success: true }),
  toggleBreakpoint: jest.fn().mockResolvedValue({ success: true }),
  ignoreBreakpoint: jest.fn().mockResolvedValue({ success: true }),
  setBreakpointCondition: jest.fn().mockResolvedValue({ success: true }),
  getActiveBreakpoints: jest
    .fn()
    .mockResolvedValue({ success: true, breakpoints: [] }),
}));

jest.mock("../execution", () => ({
  continueExecution: jest
    .fn()
    .mockResolvedValue({ success: true, stopReason: "breakpoint" }),
  nextStep: jest.fn().mockResolvedValue({ success: true, stopReason: "step" }),
  stepIn: jest.fn().mockResolvedValue({ success: true }),
  stepOut: jest.fn().mockResolvedValue({ success: true }),
  jumpToLine: jest.fn().mockResolvedValue({ success: true }),
}));

const mockFrames = [
  { id: 1, name: "main()", sourcePath: "/test/main.c", line: 42, column: 1 },
];
jest.mock("../inspection", () => ({
  getStackTrace: jest
    .fn()
    .mockResolvedValue({ success: true, frames: mockFrames, totalFrames: 1 }),
  getStackFrameVariables: jest
    .fn()
    .mockResolvedValue({ success: true, scopes: [] }),
  listSource: jest.fn().mockResolvedValue({
    success: true,
    sourceCode: "42 | int x = 0;",
    currentLine: 42,
  }),
  frameUp: jest.fn().mockResolvedValue({ success: true }),
  frameDown: jest.fn().mockResolvedValue({ success: true }),
  gotoFrame: jest.fn().mockResolvedValue({ success: true }),
  getSource: jest
    .fn()
    .mockResolvedValue({ success: true, sourcePath: "/test/main.c" }),
  evaluate: jest.fn().mockResolvedValue({
    success: true,
    result: "42",
    type: "int",
    variablesReference: 0,
  }),
  prettyPrint: jest.fn().mockResolvedValue({ success: true, result: "42" }),
  whatis: jest.fn().mockResolvedValue({ success: true, result: "int" }),
  executeStatement: jest.fn().mockResolvedValue({ success: true }),
}));

let mockLastStopBody: any = undefined;
let mockLastStopSessionId: string | undefined = undefined;
jest.mock("../events", () => ({
  onDapStopEvent: jest.fn(),
  getLastStopEventBody: jest.fn(() => mockLastStopBody),
  getLastStopSessionId: jest.fn(() => mockLastStopSessionId),
  getCurrentTopFrameId: jest.fn().mockReturnValue(1),
}));

// Mock breakpoints module with setBreakpoints for batch operation (AIVS-005)
jest.mock("../breakpoints", () => ({
  setBreakpoint: jest.fn().mockResolvedValue({ success: true }),
  setTempBreakpoint: jest.fn().mockResolvedValue({ success: true }),
  removeBreakpointByLocation: jest.fn().mockResolvedValue({ success: true }),
  removeAllBreakpointsInFile: jest.fn().mockResolvedValue({ success: true }),
  toggleBreakpoint: jest.fn().mockResolvedValue({ success: true }),
  ignoreBreakpoint: jest.fn().mockResolvedValue({ success: true }),
  setBreakpointCondition: jest.fn().mockResolvedValue({ success: true }),
  getActiveBreakpoints: jest
    .fn()
    .mockResolvedValue({ success: true, breakpoints: [] }),
  setBreakpoints: jest.fn().mockResolvedValue({
    success: true,
    breakpoints: [
      { id: 1, line: 10, verified: true, source: "/test/file.c" },
      { id: 2, line: 20, verified: true, condition: "x > 5", source: "/test/file.c" },
    ],
  }),
  getDataBreakpointInfo: jest.fn().mockResolvedValue({
    success: true,
    dataId: "data_123",
  }),
  setDataBreakpoint: jest.fn().mockResolvedValue({ success: true }),
}));

// Helper to get mock modules for watch tests
const getBreakpointsMock = () => require("../breakpoints");

import { debugController } from "../DebugController";
import * as session from "../session";
import * as breakpoints from "../breakpoints";
import * as execution from "../execution";
import * as inspection from "../inspection";

beforeEach(() => {
  jest.clearAllMocks();
  mockLastStopBody = undefined;
  mockLastStopSessionId = undefined;
  (inspection.getStackTrace as jest.Mock).mockResolvedValue({
    success: true,
    frames: mockFrames,
    totalFrames: 1,
  });
});

// ---------------------------------------------------------------
// getOperations — all 31 operations registered
// ---------------------------------------------------------------
describe("getOperations", () => {
  it("returns all registered operations", () => {
    const ops = debugController.getOperations();
    expect(ops).toContain("launch");
    expect(ops).toContain("quit");
    expect(ops).toContain("continue");
    expect(ops).toContain("next");
    expect(ops).toContain("step_in");
    expect(ops).toContain("step_out");
    expect(ops).toContain("jump");
    expect(ops).toContain("until");
    expect(ops).toContain("set_breakpoint");
    expect(ops).toContain("set_breakpoints");
    expect(ops).toContain("set_temp_breakpoint");
    expect(ops).toContain("remove_breakpoint");
    expect(ops).toContain("remove_all_breakpoints_in_file");
    expect(ops).toContain("disable_breakpoint");
    expect(ops).toContain("enable_breakpoint");
    expect(ops).toContain("ignore_breakpoint");
    expect(ops).toContain("set_breakpoint_condition");
    expect(ops).toContain("get_active_breakpoints");
    expect(ops).toContain("stack_trace");
    expect(ops).toContain("list_source");
    expect(ops).toContain("up");
    expect(ops).toContain("down");
    expect(ops).toContain("goto_frame");
    expect(ops).toContain("get_source");
    expect(ops).toContain("get_stack_frame_variables");
    expect(ops).toContain("get_args");
    expect(ops).toContain("evaluate");
    expect(ops).toContain("pretty_print");
    expect(ops).toContain("whatis");
    expect(ops).toContain("execute_statement");
    expect(ops).toContain("get_last_stop_info");
    expect(ops).toContain("list_threads");
    expect(ops).toContain("switch_thread");
    expect(ops).toContain("get_registers");
    expect(ops).toContain("read_memory");
    expect(ops).toContain("disassemble");
    expect(ops).toContain("get_data_breakpoint_info");
    expect(ops).toContain("set_data_breakpoint");
    expect(ops).toContain("watch");
    expect(ops).toHaveLength(40);
  });
});

// ---------------------------------------------------------------
// executeOperation — unknown operation
// ---------------------------------------------------------------
describe("executeOperation — unknown", () => {
  it("throws for unknown operation", async () => {
    await expect(
      debugController.executeOperation("fly_to_moon"),
    ).rejects.toThrow("Unknown operation: 'fly_to_moon'");
  });
});

// ---------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------
describe("Session Management", () => {
  it("launch delegates to launchSession", async () => {
    const result = await debugController.executeOperation("launch", {
      program: "/a.out",
    });
    expect(session.launchSession).toHaveBeenCalledWith({ program: "/a.out" });
    expect(result.success).toBe(true);
  });

  it("launch passes empty object when no params", async () => {
    await debugController.executeOperation("launch");
    expect(session.launchSession).toHaveBeenCalledWith({});
  });

  it("restart delegates to restartSession", async () => {
    await debugController.executeOperation("restart");
    expect(session.restartSession).toHaveBeenCalled();
  });

  it("quit delegates to quitSession", async () => {
    await debugController.executeOperation("quit");
    expect(session.quitSession).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------
// Execution Control
// ---------------------------------------------------------------
describe("Execution Control", () => {
  it("continue delegates to continueExecution", async () => {
    const result = await debugController.executeOperation("continue");
    expect(execution.continueExecution).toHaveBeenCalled();
    expect(result.stopReason).toBe("breakpoint");
  });

  it("next delegates to nextStep", async () => {
    await debugController.executeOperation("next");
    expect(execution.nextStep).toHaveBeenCalled();
  });

  it("step_in delegates to stepIn", async () => {
    await debugController.executeOperation("step_in");
    expect(execution.stepIn).toHaveBeenCalled();
  });

  it("step_out delegates to stepOut", async () => {
    await debugController.executeOperation("step_out");
    expect(execution.stepOut).toHaveBeenCalled();
  });

  it("jump delegates to jumpToLine with params", async () => {
    await debugController.executeOperation("jump", { line: 55 });
    expect(execution.jumpToLine).toHaveBeenCalledWith(expect.anything(), {
      line: 55,
    });
  });
});

// ---------------------------------------------------------------
// until — internal orchestration
// ---------------------------------------------------------------
describe("until", () => {
  it("success: sets temp breakpoint then continues", async () => {
    const result = await debugController.executeOperation("until", {
      line: 50,
    });
    expect(inspection.getStackTrace).toHaveBeenCalled();
    expect(breakpoints.setTempBreakpoint).toHaveBeenCalledWith(
      expect.objectContaining({ location: { path: "/test/main.c", line: 50 } }),
    );
    expect(execution.continueExecution).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it("fails when getStackTrace returns no frames", async () => {
    (inspection.getStackTrace as jest.Mock).mockResolvedValueOnce({
      success: false,
      frames: [],
    });
    const result = await debugController.executeOperation("until", {
      line: 50,
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("Cannot get current frame");
  });

  it("fails when stack trace frame has no sourcePath", async () => {
    (inspection.getStackTrace as jest.Mock).mockResolvedValueOnce({
      success: true,
      frames: [{ id: 1, name: "main()", sourcePath: "", line: 10 }],
    });
    const result = await debugController.executeOperation("until", {
      line: 50,
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("No source path");
  });

  it("fails when setTempBreakpoint fails", async () => {
    (breakpoints.setTempBreakpoint as jest.Mock).mockResolvedValueOnce({
      success: false,
      errorMessage: "BP error",
    });
    const result = await debugController.executeOperation("until", {
      line: 50,
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("Failed to set temp breakpoint");
  });
});

// ---------------------------------------------------------------
// Breakpoint Management
// ---------------------------------------------------------------
describe("Breakpoint Management", () => {
  const loc = { location: { path: "/test/main.c", line: 10 } };

  it("set_breakpoint", async () => {
    await debugController.executeOperation("set_breakpoint", loc);
    expect(breakpoints.setBreakpoint).toHaveBeenCalledWith(loc);
  });

  it("set_temp_breakpoint", async () => {
    await debugController.executeOperation("set_temp_breakpoint", loc);
    expect(breakpoints.setTempBreakpoint).toHaveBeenCalledWith(loc);
  });

  it("remove_breakpoint", async () => {
    await debugController.executeOperation("remove_breakpoint", loc);
    expect(breakpoints.removeBreakpointByLocation).toHaveBeenCalledWith(loc);
  });

  it("remove_all_breakpoints_in_file", async () => {
    await debugController.executeOperation("remove_all_breakpoints_in_file", {
      filePath: "/test/main.c",
    });
    expect(breakpoints.removeAllBreakpointsInFile).toHaveBeenCalledWith(
      "/test/main.c",
    );
  });

  it("disable_breakpoint passes enable=false", async () => {
    await debugController.executeOperation("disable_breakpoint", loc);
    expect(breakpoints.toggleBreakpoint).toHaveBeenCalledWith({
      ...loc,
      enable: false,
    });
  });

  it("enable_breakpoint passes enable=true", async () => {
    await debugController.executeOperation("enable_breakpoint", loc);
    expect(breakpoints.toggleBreakpoint).toHaveBeenCalledWith({
      ...loc,
      enable: true,
    });
  });

  it("ignore_breakpoint", async () => {
    await debugController.executeOperation("ignore_breakpoint", {
      ...loc,
      ignoreCount: 3,
    });
    expect(breakpoints.ignoreBreakpoint).toHaveBeenCalled();
  });

  it("set_breakpoint_condition", async () => {
    await debugController.executeOperation("set_breakpoint_condition", {
      ...loc,
      condition: "x > 0",
    });
    expect(breakpoints.setBreakpointCondition).toHaveBeenCalled();
  });

  it("get_active_breakpoints", async () => {
    const result = await debugController.executeOperation(
      "get_active_breakpoints",
    );
    expect(breakpoints.getActiveBreakpoints).toHaveBeenCalled();
    expect(result.breakpoints).toEqual([]);
  });

  // v0.1.b6: Batch breakpoint operation (AIVS-005)
  it("set_breakpoints batch operation", async () => {
    const params = {
      file: "/test/file.c",
      breakpoints: [
        { line: 10 },
        { line: 20, condition: "x > 5" },
      ],
    };
    const result = await debugController.executeOperation("set_breakpoints", params);
    expect(breakpoints.setBreakpoints).toHaveBeenCalledWith(params);
    expect(result.success).toBe(true);
    expect(result.breakpoints).toHaveLength(2);
    expect(result.breakpoints[0].line).toBe(10);
    expect(result.breakpoints[1].condition).toBe("x > 5");
  });

  // v0.1.b6: Watch operation
  it("watch operation success", async () => {
    const params = { name: "myVar", accessType: "write" };
    const result = await debugController.executeOperation("watch", params);
    expect(result.success).toBe(true);
    expect(result.dataId).toBe("data_123");
    expect(result.accessType).toBe("write");
  });

  it("watch operation fails without frame", async () => {
    const { getCurrentTopFrameId } = require("../events");
    const originalImpl = getCurrentTopFrameId;
    getCurrentTopFrameId.mockReturnValue(undefined);
    
    const params = { name: "myVar" };
    const result = await debugController.executeOperation("watch", params);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("No frame available");
    
    getCurrentTopFrameId.mockReturnValue(1);
  });

  it("watch operation fails when variable not found", async () => {
    const breakpointsMock = getBreakpointsMock();
    const { getDataBreakpointInfo } = breakpointsMock;
    getDataBreakpointInfo.mockResolvedValue({
      success: false,
      errorMessage: "Variable not found",
    });
    
    const params = { name: "nonExistentVar" };
    const result = await debugController.executeOperation("watch", params);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("not found");
    
    getDataBreakpointInfo.mockResolvedValue({ success: true, dataId: "data_123" });
  });
});

// ---------------------------------------------------------------
// Stack & Code Inspection
// ---------------------------------------------------------------
describe("Stack & Code Inspection", () => {
  it("stack_trace", async () => {
    const result = await debugController.executeOperation("stack_trace");
    expect(inspection.getStackTrace).toHaveBeenCalled();
    expect(result.frames[0].name).toBe("main()");
  });

  it("list_source", async () => {
    const result = await debugController.executeOperation("list_source");
    expect(inspection.listSource).toHaveBeenCalled();
    expect(result.sourceCode).toContain("int x = 0");
  });

  it("up", async () => {
    await debugController.executeOperation("up");
    expect(inspection.frameUp).toHaveBeenCalled();
  });

  it("down", async () => {
    await debugController.executeOperation("down");
    expect(inspection.frameDown).toHaveBeenCalled();
  });

  it("goto_frame", async () => {
    await debugController.executeOperation("goto_frame", { frameId: 2 });
    expect(inspection.gotoFrame).toHaveBeenCalledWith(expect.anything(), {
      frameId: 2,
    });
  });

  it("get_source", async () => {
    await debugController.executeOperation("get_source", {
      expression: "main.c",
    });
    expect(inspection.getSource).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------
// State Inspection & Evaluation
// ---------------------------------------------------------------
describe("State Inspection & Evaluation", () => {
  it("get_stack_frame_variables", async () => {
    const result = await debugController.executeOperation(
      "get_stack_frame_variables",
    );
    expect(inspection.getStackFrameVariables).toHaveBeenCalled();
    expect(result.scopes).toEqual([]);
  });

  // v0.1.b6: get_args with Locals fallback for cppdbg
  it("get_args filters for argument scopes", async () => {
    await debugController.executeOperation("get_args");
    expect(inspection.getStackFrameVariables).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        scopeFilter: expect.arrayContaining(["Arguments"]),
      }),
    );
  });

  it("get_args falls back to Locals when Arguments empty (cppdbg)", async () => {
    const { getStackFrameVariables } = require("../inspection");
    // First call (Arguments) returns empty scopes
    getStackFrameVariables.mockResolvedValueOnce({
      success: true,
      scopes: [{ name: "Arguments", variables: [] }],
    });
    
    const result = await debugController.executeOperation("get_args");
    
    // Should have been called twice: first for Arguments, then for Locals fallback
    expect(getStackFrameVariables).toHaveBeenCalledTimes(2);
    expect(getStackFrameVariables).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        scopeFilter: expect.arrayContaining(["Locals"]),
      }),
    );
    
    // Reset mock
    getStackFrameVariables.mockResolvedValue({ success: true, scopes: [] });
  });

  it("evaluate", async () => {
    const result = await debugController.executeOperation("evaluate", {
      expression: "x",
    });
    expect(inspection.evaluate).toHaveBeenCalledWith(expect.anything(), {
      expression: "x",
    });
    expect(result.result).toBe("42");
  });

  it("pretty_print", async () => {
    await debugController.executeOperation("pretty_print", { expression: "x" });
    expect(inspection.prettyPrint).toHaveBeenCalled();
  });

  it("whatis", async () => {
    await debugController.executeOperation("whatis", { expression: "x" });
    expect(inspection.whatis).toHaveBeenCalled();
  });

  it("execute_statement", async () => {
    await debugController.executeOperation("execute_statement", {
      statement: "x = 5",
    });
    expect(inspection.executeStatement).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------
// get_last_stop_info
// ---------------------------------------------------------------
describe("get_last_stop_info", () => {
  it("returns success with stop info when available", async () => {
    mockLastStopBody = { reason: "breakpoint", threadId: 1 };
    mockLastStopSessionId = "session-abc";
    const result = await debugController.executeOperation("get_last_stop_info");
    expect(result.success).toBe(true);
    expect(result.sessionId).toBe("session-abc");
    expect(result.stopInfo.reason).toBe("breakpoint");
  });

  it("returns failure when no stop event recorded", async () => {
    mockLastStopBody = undefined;
    mockLastStopSessionId = undefined;
    const result = await debugController.executeOperation("get_last_stop_info");
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("No stop event");
  });

  it("returns failure when body present but sessionId missing", async () => {
    mockLastStopBody = { reason: "step" };
    mockLastStopSessionId = undefined;
    const result = await debugController.executeOperation("get_last_stop_info");
    expect(result.success).toBe(false);
  });
});
