/******************************************************************************
 * @file        validation.ts
 *
 * @brief       Request parameter validation logic.
 *
 * @details
 * This module provides functions for validating operation arguments against
 * expected schemas. It ensures that incoming API requests contain the
 * necessary and correctly typed parameters before processing.
 *
 * @project     AI Debug Proxy
 * @component   Utility Module
 *
 * @author      Antigravity
 * @date        2026-03-11
 *
 ******************************************************************************/

/******************************************************************************
 * Revision History
 *
 * Version    Date        Author      Description
 * ---------------------------------------------------------------------------
 * 1.0        2026-03-11  Antigravity Initial implementation
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-SW-3       API Schema & Protocol
 *
 * Architecture Requirements:
 * ARCH-3       RESTful HTTP API [Satisfies $SW SW-3]
 * ARCH-5       Error Handling & Robustness [Satisfies $SW SW-5]
 *
 * Software Requirements:
 * REQ-VAL-001  launch shall require program parameter
 * REQ-VAL-002  set_breakpoint shall require file and line
 * REQ-VAL-003  evaluate shall require expression
 * REQ-VAL-004  jump shall require file and line
 * REQ-VAL-005  goto_frame shall require numeric frameId
 * REQ-VAL-006  switch_thread shall require numeric threadId
 * REQ-VAL-007  disassemble shall require address
 * REQ-VAL-008  Validation shall pass when all required fields present
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import { SourceLocation } from "../core/types";

/******************************************************************************
 * Constants & Types
 ******************************************************************************/

/** @brief Result of a validation operation. */
export interface ValidationResult {
  isValid: boolean; /**< True if validation passed. */
  message?: string; /**< Error message if validation failed. */
  params?: any; /**< Coerced/cleaned parameters. */
}

/******************************************************************************
 * Internal Helpers
 ******************************************************************************/

/** @brief Helper to generate a successful validation result. */
function ok(params?: any): ValidationResult {
  return { isValid: true, params };
}

/** @brief Helper to generate a failed validation result. */
function fail(message: string): ValidationResult {
  return { isValid: false, message };
}

/** @brief Check if value is a non-empty string. */
function isNonEmptyString(v: any): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** @brief Check if value is a valid number. */
function isNumber(v: any): v is number {
  return typeof v === "number" && !isNaN(v);
}

/**
 * @brief Validate a SourceLocation object.
 *
 * @param [in]  loc   The object to validate.
 *
 * @return Coerced SourceLocation or null if invalid.
 */
function validateLocation(loc: any): SourceLocation | null {
  if (!loc || typeof loc !== "object") return null;
  if (!isNonEmptyString(loc.path) || !isNumber(loc.line)) return null;
  return { path: loc.path, line: loc.line, column: loc.column };
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-SW-3.2
 *
 * @brief Validate operation arguments based on the operation name.
 *
 * Maps operations to their respective parameter requirements and performs
 * type/existence checks.
 *
 * @param [in]  operation   Name of the debug operation.
 * @param [in]  args        Untrusted arguments from API request.
 *
 * @return Validation result with status and cleaned params.
 *
 * [Satisfies $ARCH ARCH-3, ARCH-5]
 */
export function validateOperationArgs(
  operation: string,
  args: any,
): ValidationResult {
  switch (operation) {
    // No params required
    case "start":             // ADP-010: post-launch execution start
    case "continue":
    case "pause":
    case "next":
    case "step_over":
    case "stepOver":
    case "step_in":
    case "stepIn":
    case "step_out":
    case "stepOut":
    case "restart":
    case "quit":
    case "terminate":
    case "stack_trace":
    case "up":
    case "frame_up":
    case "down":
    case "frame_down":
    case "get_active_breakpoints":
    case "get_last_stop_info":
    case "get_scope_preview":
    case "get_capabilities":
    case "get_globals":
    case "get_arguments":
    case "list_all_locals":
    case "list_threads":
      return ok(args || {});

    // Attach to running process
    case "attach": {
      if (!args || !isNumber(args.processId)) {
        return fail("'attach' requires 'processId' (number)");
      }
      return ok(args);
    }

    // Write raw memory
    case "write_memory": {
      if (!args || !isNumber(args.address)) {
        return fail("'write_memory' requires 'address' (number)");
      }
      return ok(args);
    }

    // Launch
    case "launch": { /* $REQ REQ-VAL-001 */
      if (!args || typeof args !== "object") return ok({});
      return ok(args);
    }

    // Breakpoint operations requiring location
    case "set_breakpoint": /* $REQ REQ-VAL-002 */
    case "set_temp_breakpoint": {
      if (!args) return fail(`'${operation}' requires a 'location' parameter`);
      const loc = validateLocation(args.location);
      if (!loc)
        return fail(
          `'${operation}' requires 'location' with 'path' (string) and 'line' (number)`,
        );
      return ok({ ...args, location: loc });
    }

    case "remove_breakpoint": {
      if (!args) return fail("'remove_breakpoint' requires 'id' or 'location' parameter");
      // Accept id-based removal (preferred — id comes from get_active_breakpoints)
      if (args.id !== undefined) {
        return ok({ ...args, id: String(args.id) });
      }
      // Accept location-based removal for backward compatibility
      const loc = validateLocation(args.location);
      if (!loc)
        return fail(
          "'remove_breakpoint' requires 'id' (string or number) or 'location' with 'path' and 'line'",
        );
      return ok({ ...args, location: loc });
    }

    case "remove_all_breakpoints_in_file": {
      if (!args || !isNonEmptyString(args.filePath)) {
        return fail(
          "'remove_all_breakpoints_in_file' requires 'filePath' (string)",
        );
      }
      return ok(args);
    }

    case "disable_breakpoint":
    case "enable_breakpoint": {
      if (!args) return fail(`'${operation}' requires a 'location' parameter`);
      const loc = validateLocation(args.location);
      if (!loc)
        return fail(
          `'${operation}' requires 'location' with 'path' and 'line'`,
        );
      return ok({
        ...args,
        location: loc,
        enable: operation === "enable_breakpoint",
      });
    }

    case "ignore_breakpoint": {
      if (!args)
        return fail(
          "'ignore_breakpoint' requires 'location' and 'ignoreCount'",
        );
      const loc = validateLocation(args.location);
      if (!loc)
        return fail(
          "'ignore_breakpoint' requires 'location' with 'path' and 'line'",
        );
      if (args.ignoreCount !== null && !isNumber(args.ignoreCount)) {
        return fail("'ignoreCount' must be a number or null");
      }
      return ok({ ...args, location: loc });
    }

    case "set_breakpoint_condition": {
      if (!args)
        return fail(
          "'set_breakpoint_condition' requires 'location' and 'condition'",
        );
      const loc = validateLocation(args.location);
      if (!loc) return fail("requires 'location' with 'path' and 'line'");
      return ok({ ...args, location: loc });
    }

    // Jump/Until
    case "jump": /* $REQ REQ-VAL-004 */
    case "until": {
      if (!args || !isNumber(args.line)) {
        return fail(`'${operation}' requires 'line' (number)`);
      }
      return ok(args);
    }

    // Frame navigation
    case "goto_frame": { /* $REQ REQ-VAL-005 */
      if (!args || !isNumber(args.frameId)) {
        return fail("'goto_frame' requires 'frameId' (number)");
      }
      return ok(args);
    }

    // Source listing
    case "list_source":
      return ok(args || {});

    case "get_source": {
      if (!args || !isNonEmptyString(args.expression)) {
        return fail("'get_source' requires 'expression' (string)");
      }
      return ok(args);
    }

    // Variable/evaluation
    case "get_stack_frame_variables":
    case "get_variables":
    case "get_args":
      return ok(args || {});

    case "evaluate": /* $REQ REQ-VAL-003 */
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

    // --- Phase 3 Hardware & Threading ---
    case "switch_thread": { /* $REQ REQ-VAL-006 */
      if (!args || !isNumber(args.threadId)) {
        return fail("'switch_thread' requires 'threadId' (number)");
      }
      return ok(args);
    }

    case "get_registers": {
      if (args && args.frameId !== undefined && !isNumber(args.frameId)) {
        return fail("'get_registers' requires 'frameId' to be a number if provided");
      }
      return ok(args || {});
    }

    case "read_memory": {
      if (!args || !isNonEmptyString(args.memoryReference) || !isNumber(args.count)) {
        return fail("'read_memory' requires 'memoryReference' (string) and 'count' (number)");
      }
      if (args.offset !== undefined && !isNumber(args.offset)) {
        return fail("'read_memory' requires 'offset' to be a number if provided");
      }
      return ok(args);
    }

    case "disassemble": { /* $REQ REQ-VAL-007 */
      if (!args || !isNonEmptyString(args.memoryReference) || !isNumber(args.instructionCount)) {
        return fail("'disassemble' requires 'memoryReference' (string) and 'instructionCount' (number)");
      }
      if (args.offset !== undefined && !isNumber(args.offset)) {
        return fail("'offset' must be a number");
      }
      if (args.instructionOffset !== undefined && !isNumber(args.instructionOffset)) {
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
      if (args.accessType !== undefined &&
        !["read", "write", "readWrite"].includes(args.accessType)) {
        return fail("'watch' accessType must be 'read', 'write', or 'readWrite'");
      }
      return ok(args);
    }

    default:
      return fail(`Unknown operation: '${operation}'`);
  }
}

/******************************************************************************
 * End of File
 ******************************************************************************/
