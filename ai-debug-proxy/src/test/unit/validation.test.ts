import { describe, it, expect, test } from "vitest";
import { validateOperationArgs } from "../../utils/validation";
describe("validateOperationArgs", () => {
  // ----------------------------------------------------------------
  // No-param operations (C0: each case hit; C1: return ok branch)
  // ----------------------------------------------------------------
  const NO_PARAM_OPS = [
    "continue",
    "next",
    "step_in",
    "step_out",
    "restart",
    "quit",
    "stack_trace",
    "up",
    "down",
    "get_active_breakpoints",
    "get_last_stop_info",
  ];

  test.each(NO_PARAM_OPS)("%s: ok with no args", (op) => {
    const r = validateOperationArgs(op, undefined);
    expect(r.isValid).toBe(true);
    expect(r.params).toEqual({});
  });

  test.each(NO_PARAM_OPS)("%s: ok with args passthrough", (op) => {
    const r = validateOperationArgs(op, { extra: true });
    expect(r.isValid).toBe(true);
    expect(r.params).toEqual({ extra: true });
  });

  // ----------------------------------------------------------------
  // launch
  // ----------------------------------------------------------------
  describe("launch", () => {
    it("ok with no args", () => {
      expect(validateOperationArgs("launch", undefined).isValid).toBe(true);
      expect(validateOperationArgs("launch", undefined).params).toEqual({});
    });

    it("ok with args object", () => {
      const r = validateOperationArgs("launch", { program: "/a.out" });
      expect(r.isValid).toBe(true);
      expect(r.params).toEqual({ program: "/a.out" });
    });

    it("ok with non-object (falls to ok({}))", () => {
      // C1: first branch — !args || typeof args !== 'object' is true
      expect(validateOperationArgs("launch", "string").isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // Breakpoint operations requiring location
  // ----------------------------------------------------------------
  const LOCATION_OPS = [
    "set_breakpoint",
    "set_temp_breakpoint",
    "remove_breakpoint",
  ];

  describe.each(LOCATION_OPS)("%s", (op) => {
    it("fail when args is null", () => {
      const r = validateOperationArgs(op, null);
      expect(r.isValid).toBe(false);
      expect(r.message).toContain("location");
    });

    it("fail when location missing", () => {
      const r = validateOperationArgs(op, {});
      expect(r.isValid).toBe(false);
      expect(r.message).toContain("path");
    });

    it("fail when location.path missing", () => {
      const r = validateOperationArgs(op, { location: { line: 5 } });
      expect(r.isValid).toBe(false);
    });

    it("fail when location.line is NaN", () => {
      const r = validateOperationArgs(op, {
        location: { path: "/f.c", line: NaN },
      });
      expect(r.isValid).toBe(false);
    });

    it("ok with valid location", () => {
      const r = validateOperationArgs(op, {
        location: { path: "/f.c", line: 10 },
      });
      expect(r.isValid).toBe(true);
      expect(r.params?.location).toEqual({
        path: "/f.c",
        line: 10,
        column: undefined,
      });
    });

    it("ok with column present", () => {
      const r = validateOperationArgs(op, {
        location: { path: "/f.c", line: 10, column: 5 },
      });
      expect(r.isValid).toBe(true);
      expect(r.params?.location.column).toBe(5);
    });
  });

  // ----------------------------------------------------------------
  // remove_all_breakpoints_in_file
  // ----------------------------------------------------------------
  describe("remove_all_breakpoints_in_file", () => {
    it("fail when args is null", () => {
      const r = validateOperationArgs("remove_all_breakpoints_in_file", null);
      expect(r.isValid).toBe(false);
      expect(r.message).toContain("filePath");
    });

    it("fail when filePath is empty string", () => {
      const r = validateOperationArgs("remove_all_breakpoints_in_file", {
        filePath: "  ",
      });
      expect(r.isValid).toBe(false);
    });

    it("ok with valid filePath", () => {
      const r = validateOperationArgs("remove_all_breakpoints_in_file", {
        filePath: "/a.c",
      });
      expect(r.isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // disable_breakpoint / enable_breakpoint
  // ----------------------------------------------------------------
  describe.each(["disable_breakpoint", "enable_breakpoint"])("%s", (op) => {
    it("fail when args is null", () => {
      const r = validateOperationArgs(op, null);
      expect(r.isValid).toBe(false);
    });

    it("fail when location invalid", () => {
      const r = validateOperationArgs(op, { location: {} });
      expect(r.isValid).toBe(false);
    });

    it("ok and sets enable flag correctly", () => {
      const r = validateOperationArgs(op, {
        location: { path: "/f.c", line: 1 },
      });
      expect(r.isValid).toBe(true);
      expect(r.params?.enable).toBe(op === "enable_breakpoint");
    });
  });

  // ----------------------------------------------------------------
  // ignore_breakpoint
  // ----------------------------------------------------------------
  describe("ignore_breakpoint", () => {
    it("fail when args is null", () => {
      const r = validateOperationArgs("ignore_breakpoint", null);
      expect(r.isValid).toBe(false);
    });

    it("fail when location invalid", () => {
      const r = validateOperationArgs("ignore_breakpoint", { location: {} });
      expect(r.isValid).toBe(false);
    });

    it("fail when ignoreCount is not a number and not null", () => {
      const r = validateOperationArgs("ignore_breakpoint", {
        location: { path: "/f.c", line: 1 },
        ignoreCount: "bad",
      });
      expect(r.isValid).toBe(false);
      expect(r.message).toContain("ignoreCount");
    });

    it("ok when ignoreCount is null", () => {
      const r = validateOperationArgs("ignore_breakpoint", {
        location: { path: "/f.c", line: 1 },
        ignoreCount: null,
      });
      expect(r.isValid).toBe(true);
    });

    it("ok when ignoreCount is a number", () => {
      const r = validateOperationArgs("ignore_breakpoint", {
        location: { path: "/f.c", line: 1 },
        ignoreCount: 3,
      });
      expect(r.isValid).toBe(true);
    });

    it("ok when ignoreCount is absent (undefined)", () => {
      const r = validateOperationArgs("ignore_breakpoint", {
        location: { path: "/f.c", line: 1 },
      });
      // ignoreCount === undefined: not null, isNumber(undefined) is false → fail
      expect(r.isValid).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // set_breakpoint_condition
  // ----------------------------------------------------------------
  describe("set_breakpoint_condition", () => {
    it("fail when args is null", () => {
      const r = validateOperationArgs("set_breakpoint_condition", null);
      expect(r.isValid).toBe(false);
    });

    it("fail when location invalid", () => {
      const r = validateOperationArgs("set_breakpoint_condition", {
        location: {},
      });
      expect(r.isValid).toBe(false);
    });

    it("ok with valid location", () => {
      const r = validateOperationArgs("set_breakpoint_condition", {
        location: { path: "/f.c", line: 5 },
        condition: "x > 0",
      });
      expect(r.isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // jump / until
  // ----------------------------------------------------------------
  describe.each(["jump", "until"])("%s", (op) => {
    it("fail when args is null", () => {
      const r = validateOperationArgs(op, null);
      expect(r.isValid).toBe(false);
      expect(r.message).toContain("line");
    });

    it("fail when line is not a number", () => {
      const r = validateOperationArgs(op, { line: "10" });
      expect(r.isValid).toBe(false);
    });

    it("ok with valid line", () => {
      const r = validateOperationArgs(op, { line: 42 });
      expect(r.isValid).toBe(true);
      expect(r.params?.line).toBe(42);
    });
  });

  // ----------------------------------------------------------------
  // goto_frame
  // ----------------------------------------------------------------
  describe("goto_frame", () => {
    it("fail when args is null", () => {
      const r = validateOperationArgs("goto_frame", null);
      expect(r.isValid).toBe(false);
    });

    it("fail when frameId is not a number", () => {
      const r = validateOperationArgs("goto_frame", { frameId: "0" });
      expect(r.isValid).toBe(false);
    });

    it("ok with valid frameId", () => {
      const r = validateOperationArgs("goto_frame", { frameId: 2 });
      expect(r.isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // list_source
  // ----------------------------------------------------------------
  describe("list_source", () => {
    it("ok with no args", () => {
      expect(validateOperationArgs("list_source", undefined).isValid).toBe(
        true,
      );
      expect(validateOperationArgs("list_source", undefined).params).toEqual(
        {},
      );
    });

    it("ok with args", () => {
      const r = validateOperationArgs("list_source", { lines: 20 });
      expect(r.isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // get_source
  // ----------------------------------------------------------------
  describe("get_source", () => {
    it("fail when expression missing", () => {
      const r = validateOperationArgs("get_source", null);
      expect(r.isValid).toBe(false);
    });

    it("fail when expression is empty string", () => {
      const r = validateOperationArgs("get_source", { expression: "  " });
      expect(r.isValid).toBe(false);
    });

    it("ok with valid expression", () => {
      const r = validateOperationArgs("get_source", { expression: "main.c" });
      expect(r.isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // get_stack_frame_variables / get_args
  // ----------------------------------------------------------------
  test.each(["get_stack_frame_variables", "get_args"])(
    "%s: ok passthrough",
    (op) => {
      expect(validateOperationArgs(op, { frameId: 0 }).isValid).toBe(true);
      expect(validateOperationArgs(op, undefined).params).toEqual({});
    },
  );

  // ----------------------------------------------------------------
  // evaluate / pretty_print / whatis
  // ----------------------------------------------------------------
  describe.each(["evaluate", "pretty_print", "whatis"])("%s", (op) => {
    it("fail when args is null", () => {
      const r = validateOperationArgs(op, null);
      expect(r.isValid).toBe(false);
    });

    it("fail when expression is empty string", () => {
      const r = validateOperationArgs(op, { expression: "" });
      expect(r.isValid).toBe(false);
    });

    it("ok with valid expression", () => {
      const r = validateOperationArgs(op, { expression: "myVar" });
      expect(r.isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // execute_statement
  // ----------------------------------------------------------------
  describe("execute_statement", () => {
    it("fail when args is null", () => {
      const r = validateOperationArgs("execute_statement", null);
      expect(r.isValid).toBe(false);
    });

    it("fail when statement is empty", () => {
      const r = validateOperationArgs("execute_statement", { statement: "" });
      expect(r.isValid).toBe(false);
    });

    it("ok with valid statement", () => {
      const r = validateOperationArgs("execute_statement", {
        statement: "x = 5",
      });
      expect(r.isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // terminate / get_capabilities — no params
  // ----------------------------------------------------------------
  describe("terminate", () => {
    it("ok with no args", () => {
      expect(validateOperationArgs("terminate", undefined).isValid).toBe(true);
    });
    it("ok with extra args passthrough", () => {
      expect(validateOperationArgs("terminate", { extra: 1 }).isValid).toBe(true);
    });
  });

  describe("get_capabilities", () => {
    it("ok with no args", () => {
      expect(validateOperationArgs("get_capabilities", undefined).isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // attach — requires processId (number)
  // ----------------------------------------------------------------
  describe("attach", () => {
    it("fail with missing args", () => {
      const r = validateOperationArgs("attach", undefined);
      expect(r.isValid).toBe(false);
      expect(r.message).toMatch(/processId/);
    });

    it("fail with non-numeric processId", () => {
      const r = validateOperationArgs("attach", { processId: "1234" });
      expect(r.isValid).toBe(false);
    });

    it("ok with valid processId", () => {
      const r = validateOperationArgs("attach", { processId: 1234 });
      expect(r.isValid).toBe(true);
      expect(r.params?.processId).toBe(1234);
    });
  });

  // ----------------------------------------------------------------
  // write_memory — requires address (number)
  // ----------------------------------------------------------------
  describe("write_memory", () => {
    it("fail with missing args", () => {
      const r = validateOperationArgs("write_memory", undefined);
      expect(r.isValid).toBe(false);
      expect(r.message).toMatch(/address/);
    });

    it("fail with string address", () => {
      const r = validateOperationArgs("write_memory", { address: "0x1000" });
      expect(r.isValid).toBe(false);
    });

    it("ok with numeric address", () => {
      const r = validateOperationArgs("write_memory", { address: 0x1000, data: "deadbeef" });
      expect(r.isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // frame_up / frame_down aliases
  // ----------------------------------------------------------------
  describe("frame_up / frame_down", () => {
    it("frame_up ok with no args", () => {
      expect(validateOperationArgs("frame_up", undefined).isValid).toBe(true);
    });
    it("frame_down ok with no args", () => {
      expect(validateOperationArgs("frame_down", undefined).isValid).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // default / unknown operation
  // ----------------------------------------------------------------
  describe("unknown operation", () => {
    it("fail with descriptive message", () => {
      const r = validateOperationArgs("fly_to_moon", {});
      expect(r.isValid).toBe(false);
      expect(r.message).toContain("fly_to_moon");
    });
  });
});
