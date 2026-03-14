/**
 * [Satisfies $DD-04]
 * [Satisfies $SW-4]
 * [Satisfies $ARCH-4]
 *
 * Unit tests for Session Management
 * Coverage: $DD-SW-4 (Session State Management)
 */

import * as vscode from "vscode";
import {
  getActiveSession,
  ensureActiveSession,
  clearLastSession,
  launchSession,
  restartSession,
  quitSession,
} from "../../src/debug/session";

jest.mock("vscode", () => ({
  debug: {
    activeDebugSession: undefined,
    startDebugging: jest.fn(),
  },
  workspace: {
    workspaceFolders: [],
  },
  commands: {
    executeCommand: jest.fn(),
  },
}));

jest.mock("../../src/utils/logging", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("../../src/debug/events", () => ({
  waitForStopEvent: jest.fn().mockResolvedValue(true),
}));

describe("SessionManager [Satisfies $DD-04]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearLastSession();
  });

  describe("getActiveSession() [Satisfies $DD-04.1]", () => {
    it("returns undefined when no active session", () => {
      (vscode.debug as any).activeDebugSession = undefined;
      const session = getActiveSession();
      expect(session).toBeUndefined();
    });

    it("returns active debug session when present", () => {
      const mockSession = { id: "session-123", name: "Test" };
      (vscode.debug as any).activeDebugSession = mockSession;
      const session = getActiveSession();
      expect(session).toBe(mockSession);
    });
  });

  describe("ensureActiveSession() [Satisfies $DD-04.2]", () => {
    it("throws error when no session available", () => {
      (vscode.debug as any).activeDebugSession = undefined;
      expect(() => ensureActiveSession("test-op")).toThrow(
        "No active debug session for 'test-op'",
      );
    });

    it("returns session when available", () => {
      const mockSession = { id: "session-123", name: "Test" };
      (vscode.debug as any).activeDebugSession = mockSession;
      const session = ensureActiveSession("test-op");
      expect(session).toBe(mockSession);
    });
  });

  describe("clearLastSession() [Satisfies $DD-04.3]", () => {
    it("clears the retained session reference", () => {
      clearLastSession();
      const session = getActiveSession();
      expect(session).toBeUndefined();
    });
  });

  describe("launchSession() [Satisfies $DD-04.4]", () => {
    it("returns failure when startDebugging fails", async () => {
      (vscode.debug as any).startDebugging = jest.fn().mockResolvedValue(false);

      const result = await launchSession({
        type: "cppdbg",
        request: "launch",
        program: "/test/app",
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("not found");
    });

    it("launches session with dynamic config", async () => {
      const mockSession = { id: "session-456", name: "AI Debug Proxy" };
      (vscode.debug as any).startDebugging = jest
        .fn()
        .mockResolvedValue(true);
      (vscode.debug as any).activeDebugSession = mockSession;

      const result = await launchSession({
        type: "cppdbg",
        request: "launch",
        program: "/test/app",
        stopOnEntry: true,
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("session-456");
    });

    it("launches session with named config", async () => {
      const mockSession = { id: "session-789", name: "Test Config" };
      (vscode.debug as any).startDebugging = jest
        .fn()
        .mockResolvedValue(true);
      (vscode.debug as any).activeDebugSession = mockSession;

      const result = await launchSession({
        configName: "C++ Launch",
      });

      expect(result.success).toBe(true);
      expect(vscode.debug.startDebugging).toHaveBeenCalled();
    });
  });

  describe("restartSession() [Satisfies $DD-04.5]", () => {
    it("returns failure when no active session", async () => {
      (vscode.debug as any).activeDebugSession = undefined;

      const result = await restartSession();

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("No active debug session");
    });

    it("executes restart command when session exists", async () => {
      const mockSession = { id: "session-123", name: "Test" };
      (vscode.debug as any).activeDebugSession = mockSession;
      (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

      const result = await restartSession();

      expect(result.success).toBe(true);
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "workbench.action.debug.restart",
      );
    });

    it("returns failure when restart command fails", async () => {
      const mockSession = { id: "session-123", name: "Test" };
      (vscode.debug as any).activeDebugSession = mockSession;
      (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error("Command failed"),
      );

      const result = await restartSession();

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("Restart failed");
    });
  });

  describe("quitSession() [Satisfies $DD-04.6]", () => {
    it("returns failure when no active session", async () => {
      (vscode.debug as any).activeDebugSession = undefined;

      const result = await quitSession();

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("No active debug session");
    });

    it("executes stop command when session exists", async () => {
      const mockSession = { id: "session-123", name: "Test" };
      (vscode.debug as any).activeDebugSession = mockSession;
      (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

      const result = await quitSession();

      expect(result.success).toBe(true);
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "workbench.action.debug.stop",
      );
    });

    it("returns failure when stop command fails", async () => {
      const mockSession = { id: "session-123", name: "Test" };
      (vscode.debug as any).activeDebugSession = mockSession;
      (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error("Command failed"),
      );

      const result = await quitSession();

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("Quit failed");
    });
  });
});
