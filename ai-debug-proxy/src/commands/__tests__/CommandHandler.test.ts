import * as fs from "fs";
import * as path from "path";

let _workspaceFolders: any[] | undefined = [
  { uri: { fsPath: "/tmp/test-workspace" } },
];

jest.mock("fs");
jest.mock(
  "vscode",
  () => ({
    window: {
      createOutputChannel: jest.fn(() => ({ appendLine: jest.fn() })),
    },
    workspace: {
      get workspaceFolders() {
        return _workspaceFolders;
      },
    },
  }),
  { virtual: true },
);

// Stub out SubagentOrchestrator so we don't actually spawn processes
jest.mock("../../agent/SubagentOrchestrator", () => ({
  subagentOrchestrator: {
    runParallelSubagents: jest.fn().mockResolvedValue([
      {
        id: "test-agent",
        success: true,
        stdout: "done",
        stderr: "",
        exitCode: 0,
      },
    ]),
  },
}));

// Stub prompts module
jest.mock("../../agent/prompts", () => ({
  subagentCreatorPrompt: "SYSTEM: create an agent",
}));

import { CommandHandler } from "../CommandHandler";

describe("CommandHandler.handleCommand", () => {
  let handler: CommandHandler;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    handler = new CommandHandler();
    jest.clearAllMocks();
    _workspaceFolders = [{ uri: { fsPath: "/tmp/test-workspace" } }];
  });

  // ---------------------------------------------------------------
  // Unknown command
  // ---------------------------------------------------------------
  it("throws on unknown command", async () => {
    await expect(handler.handleCommand("/unknown", {})).rejects.toThrow(
      "Unknown command: /unknown",
    );
  });

  // ---------------------------------------------------------------
  // /debug-crash
  // ---------------------------------------------------------------
  it("/debug-crash throws not implemented error", async () => {
    await expect(handler.handleCommand("/debug-crash", {})).rejects.toThrow(
      "/debug-crash: not implemented",
    );
  });

  // ---------------------------------------------------------------
  // /create-agent
  // ---------------------------------------------------------------
  it("/create-agent throws when name is missing", async () => {
    await expect(
      handler.handleCommand("/create-agent", { requirements: "do stuff" }),
    ).rejects.toThrow("Missing 'name' or 'requirements'");
  });

  it("/create-agent throws when requirements is missing", async () => {
    await expect(
      handler.handleCommand("/create-agent", { name: "my-agent" }),
    ).rejects.toThrow("Missing 'name' or 'requirements'");
  });

  it("/create-agent throws when args is null", async () => {
    await expect(handler.handleCommand("/create-agent", null)).rejects.toThrow(
      "Missing 'name' or 'requirements'",
    );
  });

  it("/create-agent succeeds with valid args, defaults model to qwen", async () => {
    const {
      subagentOrchestrator,
    } = require("../../agent/SubagentOrchestrator");
    const result = await handler.handleCommand("/create-agent", {
      name: "test-bot",
      requirements: "debug C code",
    });
    expect(result.message).toBe("Agent creation process initiated");
    expect(subagentOrchestrator.runParallelSubagents).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ command: "qwen" })]),
      120000,
    );
  });

  it("/create-agent uses provided model", async () => {
    const {
      subagentOrchestrator,
    } = require("../../agent/SubagentOrchestrator");
    await handler.handleCommand("/create-agent", {
      name: "claude-bot",
      requirements: "analyze code",
      model: "claude",
    });
    expect(subagentOrchestrator.runParallelSubagents).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ command: "claude" })]),
      120000,
    );
  });

  // ---------------------------------------------------------------
  // /init
  // ---------------------------------------------------------------
  it("/init throws when no workspace folders", async () => {
    _workspaceFolders = undefined;
    await expect(handler.handleCommand("/init", {})).rejects.toThrow(
      "No workspace folders found",
    );
  });

  it("/init throws when workspace folders is empty array", async () => {
    _workspaceFolders = [];
    await expect(handler.handleCommand("/init", {})).rejects.toThrow(
      "No workspace folders found",
    );
  });

  it("/init succeeds and writes PROJECT_CONTEXT.md", async () => {
    jest
      .spyOn(mockFs, "readdirSync")
      .mockReturnValue(["main.c", "Makefile"] as any);
    const writeSpy = jest
      .spyOn(mockFs, "writeFileSync")
      .mockImplementation(() => undefined);

    const result = await handler.handleCommand("/init", {});
    expect(result.message).toBe("Initialization complete");
    expect(result.contextFile).toBe(
      path.join("/tmp/test-workspace", "PROJECT_CONTEXT.md"),
    );
    expect(writeSpy).toHaveBeenCalledWith(
      result.contextFile,
      expect.stringContaining("main.c"),
      "utf-8",
    );
  });

  it("/init re-throws fs errors", async () => {
    jest.spyOn(mockFs, "readdirSync").mockImplementation(() => {
      throw new Error("permission denied");
    });

    await expect(handler.handleCommand("/init", {})).rejects.toThrow(
      "Failed to initialize: permission denied",
    );
  });
});
