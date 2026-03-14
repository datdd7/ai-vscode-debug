/**
 * Unit tests for router.ts
 */
import * as http from "http";
import { handleRequest } from "../router";
import { debugController } from "../../debug/DebugController";
import { getActiveSession } from "../../debug/session";
import { subagentOrchestrator } from "../../agent/SubagentOrchestrator";
import { commandHandler } from "../../commands/CommandHandler";
import { lspService } from "../../lsp/LspService";
import { validateOperationArgs } from "../../utils/validation";

// Mock all dependencies
jest.mock("../../debug/DebugController", () => ({
  debugController: {
    executeOperation: jest.fn(),
    getOperations: jest.fn(),
  },
}));

jest.mock("../../debug/session", () => ({
  getActiveSession: jest.fn(),
}));

jest.mock("../../agent/SubagentOrchestrator", () => ({
  subagentOrchestrator: {
    runParallelSubagents: jest.fn(),
  },
}));

jest.mock("../../commands/CommandHandler", () => ({
  commandHandler: {
    handleCommand: jest.fn(),
  },
}));

jest.mock("../../lsp/LspService", () => ({
  lspService: {
    getDocumentSymbols: jest.fn(),
    getReferences: jest.fn(),
    getCallHierarchyIncoming: jest.fn(),
    getCallHierarchyOutgoing: jest.fn(),
  },
}));

jest.mock("../../utils/validation", () => ({
  validateOperationArgs: jest.fn(),
}));

jest.mock("../../utils/logging", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  stringifySafe: jest.fn((obj) => JSON.stringify(obj)),
}));

// Mock fs to return version from package.json
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readFileSync: jest.fn((path: string) => {
    if (path.endsWith("package.json")) {
      return JSON.stringify({ version: "0.1.6" });
    }
    return "";
  }),
}));

// Mock http.IncomingMessage
const createMockRequest = (
  method: string,
  url: string,
): http.IncomingMessage => {
  return {
    method,
    url,
  } as http.IncomingMessage;
};

describe("router", () => {
  const mockReq = createMockRequest("GET", "/");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health check endpoint", () => {
    it("should return pong for GET /api/ping", async () => {
      const mockOperations = ["launch", "continue", "next"];
      (debugController.getOperations as jest.Mock).mockReturnValue(
        mockOperations,
      );

      const result = await handleRequest("GET", "/api/ping", null, mockReq);

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data.message).toBe("pong");
      // Version is read dynamically from package.json (0.1.6 in v0.1.b6 release)
      expect(result.body.data.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(result.body.data.operations).toEqual(mockOperations);
      expect(result.body.timestamp).toBeDefined();
    });
  });

  describe("Status endpoint", () => {
    it("should return status with no active session", async () => {
      (getActiveSession as jest.Mock).mockReturnValue(undefined);

      const result = await handleRequest("GET", "/api/status", null, mockReq);

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data.hasActiveSession).toBe(false);
      expect(result.body.data.sessionId).toBe(null);
      expect(result.body.data.sessionName).toBe(null);
    });

    it("should return status with active session", async () => {
      const mockSession = {
        id: "session-123",
        name: "Test Session",
      };
      (getActiveSession as jest.Mock).mockReturnValue(mockSession);

      const result = await handleRequest("GET", "/api/status", null, mockReq);

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data.hasActiveSession).toBe(true);
      expect(result.body.data.sessionId).toBe("session-123");
      expect(result.body.data.sessionName).toBe("Test Session");
    });
  });

  describe("Subagent Orchestrator endpoint", () => {
    it("should reject non-array body for POST /api/subagents", async () => {
      const result = await handleRequest(
        "POST",
        "/api/subagents",
        { not: "array" },
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe(
        "Body must be an array of SubagentTask objects",
      );
    });

    it("should reject empty body for POST /api/subagents", async () => {
      const result = await handleRequest(
        "POST",
        "/api/subagents",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
    });

    it("should execute subagents successfully", async () => {
      const mockTasks = [{ id: "task1", command: "echo", args: ["hello"] }];
      const mockResults = [
        {
          id: "task1",
          success: true,
          stdout: "hello",
          stderr: "",
          exitCode: 0,
        },
      ];
      (
        subagentOrchestrator.runParallelSubagents as jest.Mock
      ).mockResolvedValue(mockResults);

      const result = await handleRequest(
        "POST",
        "/api/subagents",
        mockTasks,
        mockReq,
      );

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data).toEqual(mockResults);
    });

    it("should handle subagent execution error", async () => {
      const mockTasks = [{ id: "task1", command: "invalid", args: [] }];
      (
        subagentOrchestrator.runParallelSubagents as jest.Mock
      ).mockRejectedValue(new Error("Agent failed"));

      const result = await handleRequest(
        "POST",
        "/api/subagents",
        mockTasks,
        mockReq,
      );

      expect(result.statusCode).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Agent failed");
    });
  });

  describe("Macro Commands endpoint", () => {
    it("should reject missing command for POST /api/commands", async () => {
      const result = await handleRequest(
        "POST",
        "/api/commands",
        { args: {} },
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Missing 'command' field");
    });

    it("should reject empty body for POST /api/commands", async () => {
      const result = await handleRequest(
        "POST",
        "/api/commands",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
    });

    it("should execute command successfully", async () => {
      const mockCommand = { command: "/init", args: {} };
      const mockResult = { message: "Initialization complete" };
      (commandHandler.handleCommand as jest.Mock).mockResolvedValue(mockResult);

      const result = await handleRequest(
        "POST",
        "/api/commands",
        mockCommand,
        mockReq,
      );

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data).toEqual(mockResult);
    });

    it("should handle command execution error", async () => {
      const mockCommand = { command: "/unknown", args: {} };
      (commandHandler.handleCommand as jest.Mock).mockRejectedValue(
        new Error("Unknown command"),
      );

      const result = await handleRequest(
        "POST",
        "/api/commands",
        mockCommand,
        mockReq,
      );

      expect(result.statusCode).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Unknown command");
    });
  });

  describe("LSP Symbols endpoint", () => {
    it("should reject missing fsPath for GET /api/symbols", async () => {
      const result = await handleRequest("GET", "/api/symbols", null, mockReq);

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Missing fsPath");
    });

    it("should get document symbols successfully", async () => {
      const mockSymbols = [{ name: "MyClass", kind: 12 }];
      (lspService.getDocumentSymbols as jest.Mock).mockResolvedValue(
        mockSymbols,
      );

      const result = await handleRequest(
        "GET",
        "/api/symbols?fsPath=/path/to/file.ts",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data).toEqual(mockSymbols);
    });

    it("should handle symbol retrieval error", async () => {
      (lspService.getDocumentSymbols as jest.Mock).mockRejectedValue(
        new Error("File not found"),
      );

      const result = await handleRequest(
        "GET",
        "/api/symbols?fsPath=/invalid/path",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("File not found");
    });
  });

  describe("LSP References endpoint", () => {
    it("should reject missing parameters for GET /api/references", async () => {
      const result = await handleRequest(
        "GET",
        "/api/references?fsPath=/path",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
    });

    it("should get references successfully", async () => {
      const mockRefs = [{ uri: "file://test", range: { start: 0, end: 10 } }];
      (lspService.getReferences as jest.Mock).mockResolvedValue(mockRefs);

      const result = await handleRequest(
        "GET",
        "/api/references?fsPath=/path/to/file.ts&line=10&character=5",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data).toEqual(mockRefs);
    });

    it("should handle references error", async () => {
      (lspService.getReferences as jest.Mock).mockRejectedValue(
        new Error("Not found"),
      );

      const result = await handleRequest(
        "GET",
        "/api/references?fsPath=/path&line=1&character=1",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Not found");
    });
  });

  describe("LSP Call Hierarchy endpoint", () => {
    it("should reject missing parameters for GET /api/call-hierarchy", async () => {
      const result = await handleRequest(
        "GET",
        "/api/call-hierarchy?fsPath=/path",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
    });

    it("should get incoming calls by default", async () => {
      const mockCalls = [{ from: "caller1" }];
      (lspService.getCallHierarchyIncoming as jest.Mock).mockResolvedValue(
        mockCalls,
      );

      const result = await handleRequest(
        "GET",
        "/api/call-hierarchy?fsPath=/path&line=1&character=1",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data).toEqual(mockCalls);
      expect(lspService.getCallHierarchyIncoming).toHaveBeenCalled();
    });

    it("should get outgoing calls when direction=outgoing", async () => {
      const mockCalls = [{ to: "callee1" }];
      (lspService.getCallHierarchyOutgoing as jest.Mock).mockResolvedValue(
        mockCalls,
      );

      const result = await handleRequest(
        "GET",
        "/api/call-hierarchy?fsPath=/path&line=1&character=1&direction=outgoing",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data).toEqual(mockCalls);
      expect(lspService.getCallHierarchyOutgoing).toHaveBeenCalled();
    });

    it("should handle call hierarchy error", async () => {
      (lspService.getCallHierarchyIncoming as jest.Mock).mockRejectedValue(
        new Error("Error"),
      );

      const result = await handleRequest(
        "GET",
        "/api/call-hierarchy?fsPath=/path&line=1&character=1",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Error");
    });
  });

  describe("Debug operation endpoint", () => {
    it("should reject non-object body for POST /api/debug", async () => {
      const result = await handleRequest(
        "POST",
        "/api/debug",
        "string",
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toContain("Request body must be a JSON object");
    });

    it("should reject missing operation field", async () => {
      const result = await handleRequest(
        "POST",
        "/api/debug",
        { params: {} },
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toContain(
        "Missing or invalid 'operation' field",
      );
    });

    it("should reject invalid operation type", async () => {
      const result = await handleRequest(
        "POST",
        "/api/debug",
        { operation: 123 },
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
    });

    it("should reject validation failure", async () => {
      (validateOperationArgs as jest.Mock).mockReturnValue({
        isValid: false,
        message: "Invalid params",
      });

      const result = await handleRequest(
        "POST",
        "/api/debug",
        { operation: "launch" },
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Invalid params");
      expect(result.body.operation).toBe("launch");
    });

    it("should execute operation successfully", async () => {
      (validateOperationArgs as jest.Mock).mockReturnValue({
        isValid: true,
        params: {},
      });
      (debugController.executeOperation as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await handleRequest(
        "POST",
        "/api/debug",
        { operation: "launch", params: {} },
        mockReq,
      );

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.operation).toBe("launch");
      expect(result.body.data).toEqual({ success: true });
    });

    it("should handle operation execution error", async () => {
      (validateOperationArgs as jest.Mock).mockReturnValue({
        isValid: true,
        params: {},
      });
      (debugController.executeOperation as jest.Mock).mockRejectedValue(
        new Error("Operation failed"),
      );

      const result = await handleRequest(
        "POST",
        "/api/debug",
        { operation: "continue" },
        mockReq,
      );

      expect(result.statusCode).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Operation failed");
      expect(result.body.operation).toBe("continue");
    });
  });

  describe("404 handling", () => {
    it("should return 404 for unknown route", async () => {
      const result = await handleRequest("GET", "/api/unknown", null, mockReq);

      expect(result.statusCode).toBe(404);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toContain("Not found");
    });

    it("should return 404 for wrong method on known route", async () => {
      const result = await handleRequest("DELETE", "/api/ping", null, mockReq);

      expect(result.statusCode).toBe(404);
      expect(result.body.error).toContain("Not found");
    });

    it("should include timestamp in 404 response", async () => {
      const result = await handleRequest("GET", "/notfound", null, mockReq);

      expect(result.body.timestamp).toBeDefined();
    });
  });

  describe("URL parsing", () => {
    it("should handle URLs with query parameters", async () => {
      (getActiveSession as jest.Mock).mockReturnValue(undefined);

      const result = await handleRequest(
        "GET",
        "/api/status?foo=bar&baz=qux",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(200);
      expect(result.body.data.hasActiveSession).toBe(false);
    });

    it("should handle URLs with fragments", async () => {
      (getActiveSession as jest.Mock).mockReturnValue(undefined);

      const result = await handleRequest(
        "GET",
        "/api/status#fragment",
        null,
        mockReq,
      );

      expect(result.statusCode).toBe(200);
    });
  });
});
