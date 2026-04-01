/******************************************************************************
 * @file        errors.ts
 *
 * @brief       Error codes and custom error classes for AI Debug Proxy.
 *
 * @details
 * This module defines a comprehensive error hierarchy for precise failure
 * reporting. Each error includes a machine-readable code, human-readable
 * message, and optional suggestion for resolution.
 *
 * @project     AI Debug Proxy
 * @component   Utils
 *
 * @author      Antigravity
 * @date        2026-03-13
 *
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-ERR-1     Error Code Enum
 * DD-ERR-2     DebugError Class
 *
 * Architecture Requirements:
 * ARCH-2       Debug Controller Pattern [Satisfies $SW SW-2]
 *
 * Software Requirements:
 * REQ-ERR-001  DebugError shall carry code and message
 * REQ-ERR-002  SessionNotActiveError shall have code SESSION_NOT_ACTIVE
 * REQ-ERR-003  InvalidOperationError shall have code INVALID_OPERATION
 ******************************************************************************/

/******************************************************************************
 * Error Code Enum
 ******************************************************************************/

/**
 * @brief Standard error codes for debug operations.
 */
export enum DebugErrorCode {
  // File system errors
  BINARY_NOT_FOUND = "BINARY_NOT_FOUND",
  GDB_NOT_FOUND = "GDB_NOT_FOUND",
  WORKSPACE_NOT_FOUND = "WORKSPACE_NOT_FOUND",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",

  // Configuration errors
  INVALID_CONFIG = "INVALID_CONFIG",
  MISSING_PARAMETER = "MISSING_PARAMETER",
  INVALID_PARAMETER = "INVALID_PARAMETER",

  // Session errors
  SESSION_ALREADY_ACTIVE = "SESSION_ALREADY_ACTIVE",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  SESSION_TERMINATED = "SESSION_TERMINATED",

  // Operation errors
  OPERATION_FAILED = "OPERATION_FAILED",
  OPERATION_NOT_SUPPORTED = "OPERATION_NOT_SUPPORTED",
  OPERATION_TIMEOUT = "OPERATION_TIMEOUT",

  // Breakpoint errors
  BREAKPOINT_NOT_FOUND = "BREAKPOINT_NOT_FOUND",
  BREAKPOINT_VERIFICATION_FAILED = "BREAKPOINT_VERIFICATION_FAILED",

  // Hardware errors
  REGISTER_NOT_FOUND = "REGISTER_NOT_FOUND",
  MEMORY_READ_FAILED = "MEMORY_READ_FAILED",
  DISASSEMBLY_FAILED = "DISASSEMBLY_FAILED",

  // LSP errors
  SYMBOL_NOT_FOUND = "SYMBOL_NOT_FOUND",
  REFERENCE_NOT_FOUND = "REFERENCE_NOT_FOUND",

  // Internal errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/******************************************************************************
 * DebugError Class
 ******************************************************************************/

/**
 * @brief Custom error class with error code, suggestion, and details.
 *
 * Provides structured error information for API responses.
 */
export class DebugError extends Error { /* $REQ REQ-ERR-001 */
  /**
   * @brief Create a DebugError.
   *
   * @param [in] code       Machine-readable error code.
   * @param [in] message    Human-readable error message.
   * @param [in] suggestion Optional suggestion for resolving the error.
   * @param [in] details    Optional additional context/details.
   */
  constructor(
    public code: DebugErrorCode,
    message: string,
    public suggestion?: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "DebugError";

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DebugError.prototype);

    // Capture stack trace (excluding constructor from stack)
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * @brief Convert error to JSON for API response.
   *
   * @return JSON-serializable error object.
   */
  toJSON(): Record<string, any> {
    return {
      code: this.code,
      message: this.message,
      suggestion: this.suggestion,
      details: this.details,
    };
  }

  /**
   * @brief Create a BINARY_NOT_FOUND error.
   *
   * @param [in] path Path to the missing binary.
   * @return DebugError instance.
   */
  static binaryNotFound(path: string): DebugError {
    return new DebugError(
      DebugErrorCode.BINARY_NOT_FOUND,
      `Binary not found: ${path}`,
      `Have you built the project? Check your build configuration and output path.`,
      { path, exists: false },
    );
  }

  /**
   * @brief Create a GDB_NOT_FOUND error.
   *
   * @param [in] path Path to the missing GDB executable.
   * @return DebugError instance.
   */
  static gdbNotFound(path: string): DebugError {
    return new DebugError(
      DebugErrorCode.GDB_NOT_FOUND,
      `GDB debugger not found: ${path}`,
      `Install GDB: sudo apt-get install gdb (or configure miDebuggerPath correctly)`,
      { path, exists: false },
    );
  }

  /**
   * @brief Create a WORKSPACE_NOT_FOUND error.
   *
   * @param [in] path Path to the missing workspace.
   * @return DebugError instance.
   */
  static workspaceNotFound(path: string): DebugError {
    return new DebugError(
      DebugErrorCode.WORKSPACE_NOT_FOUND,
      `Workspace not found: ${path}`,
      `Ensure the workspace path is correct and the folder is open in VS Code.`,
      { path, exists: false },
    );
  }

  /**
   * @brief Create a MISSING_PARAMETER error.
   *
   * @param [in] paramName Name of the missing parameter.
   * @return DebugError instance.
   */
  static missingParameter(paramName: string): DebugError {
    return new DebugError(
      DebugErrorCode.MISSING_PARAMETER,
      `Missing required parameter: ${paramName}`,
      `Add '${paramName}' field to params object.`,
      { missingField: paramName },
    );
  }

  /**
   * @brief Create an INVALID_PARAMETER error.
   *
   * @param [in] paramName Name of the invalid parameter.
   * @param [in] reason    Reason why the parameter is invalid.
   * @return DebugError instance.
   */
  static invalidParameter(paramName: string, reason: string): DebugError {
    return new DebugError(
      DebugErrorCode.INVALID_PARAMETER,
      `Invalid parameter '${paramName}': ${reason}`,
      `Check the parameter value and try again.`,
      { paramName, reason },
    );
  }

  /**
   * @brief Create an INTERNAL_ERROR.
   *
   * @param [in] message Error message.
   * @param [in] details Optional additional details.
   * @return DebugError instance.
   */
  static internal(message: string, details?: Record<string, any>): DebugError {
    return new DebugError(
      DebugErrorCode.INTERNAL_ERROR,
      `Internal error: ${message}`,
      `This is likely a bug in the extension. Please check the logs.`,
      details,
    );
  }
}

/******************************************************************************
 * Legacy OperationError (for backward compatibility)
 ******************************************************************************/

/**
 * @brief Legacy error class for operation failures.
 *
 * @deprecated Use DebugError instead.
 */
export class OperationError extends Error {
  public operation: string;
  public cause?: Error;

  constructor(operation: string, message: string, cause?: Error) {
    super(message);
    this.operation = operation;
    this.cause = cause;
    this.name = "OperationError";

    Object.setPrototypeOf(this, OperationError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
