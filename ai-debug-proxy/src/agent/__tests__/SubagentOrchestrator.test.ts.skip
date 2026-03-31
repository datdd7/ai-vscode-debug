jest.mock("fs", () => ({ appendFileSync: jest.fn() }));
jest.mock(
  "vscode",
  () => ({
    window: { createOutputChannel: jest.fn(() => ({ appendLine: jest.fn() })) },
    workspace: {
      getConfiguration: jest.fn(() => ({
        get: jest.fn((key: string) => {
          if (key === "subagents.allowedCommands") {
            return ["echo", "cat", "bash", "sleep", "true"];
          }
          return [];
        })
      }))
    }
  }),
  { virtual: true },
);

import { SubagentOrchestrator } from "../SubagentOrchestrator";

describe("SubagentOrchestrator", () => {
  let orchestrator: SubagentOrchestrator;

  beforeEach(() => {
    orchestrator = new SubagentOrchestrator();
  });

  // ---------------------------------------------------------------
  // MAX_TASKS guard
  // ---------------------------------------------------------------
  it("throws when task count exceeds MAX_TASKS (50)", async () => {
    const tasks = Array.from({ length: 51 }, (_, i) => ({
      id: `t${i}`,
      command: "echo",
      args: ["hi"],
    }));
    await expect(orchestrator.runParallelSubagents(tasks)).rejects.toThrow(
      "Too many tasks",
    );
  });

  it("accepts exactly MAX_TASKS tasks (50)", async () => {
    // Use 'true' command (always exits 0) — fast no-output command
    const tasks = Array.from({ length: 50 }, (_, i) => ({
      id: `t${i}`,
      command: "true",
      args: [],
    }));
    const results = await orchestrator.runParallelSubagents(tasks, 5000);
    expect(results).toHaveLength(50);
    for (const r of results) {
      expect(r.success).toBe(true);
    }
  }, 15000);

  // ---------------------------------------------------------------
  // Single successful task
  // ---------------------------------------------------------------
  it("runs a single echo task successfully", async () => {
    const results = await orchestrator.runParallelSubagents([
      { id: "echo-1", command: "echo", args: ["hello world"] },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("echo-1");
    expect(results[0].success).toBe(true);
    expect(results[0].exitCode).toBe(0);
    expect(results[0].stdout).toContain("hello world");
  });

  // ---------------------------------------------------------------
  // Task with stdin input
  // ---------------------------------------------------------------
  it("passes stdin input to the process", async () => {
    const results = await orchestrator.runParallelSubagents([
      { id: "cat-1", command: "cat", args: [], input: "from stdin" },
    ]);
    expect(results[0].success).toBe(true);
    expect(results[0].stdout).toContain("from stdin");
  });

  // ---------------------------------------------------------------
  // Non-zero exit code
  // ---------------------------------------------------------------
  it("marks task as failed on non-zero exit", async () => {
    const results = await orchestrator.runParallelSubagents([
      { id: "fail-1", command: "bash", args: ["-c", "exit 1"] },
    ]);
    expect(results[0].success).toBe(false);
    expect(results[0].exitCode).toBe(1);
  });

  // ---------------------------------------------------------------
  // Spawn error (unknown command)
  // ---------------------------------------------------------------
  it("handles spawn error for non-existent command", async () => {
    const results = await orchestrator.runParallelSubagents([
      { id: "bad-cmd", command: "/nonexistent_binary_xyz", args: [] },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].exitCode).toBe(-3);
    expect(results[0].stderr).toBeTruthy();
  });

  // ---------------------------------------------------------------
  // Timeout
  // ---------------------------------------------------------------
  it("kills process and returns exitCode=-1 on timeout", async () => {
    const results = await orchestrator.runParallelSubagents(
      [{ id: "sleep-1", command: "sleep", args: ["60"] }],
      200, // 200ms timeout
    );
    expect(results[0].success).toBe(false);
    expect(results[0].exitCode).toBe(-1);
    expect(results[0].stderr).toContain("[Timeout after 200ms]");
  }, 5000);

  // ---------------------------------------------------------------
  // Output truncation
  // ---------------------------------------------------------------
  it("truncates stdout at 1MB and appends truncation marker", async () => {
    // Generate > 1MB of output via yes | head -c 1100000
    const results = await orchestrator.runParallelSubagents(
      [
        {
          id: "big-output",
          command: "bash",
          args: ["-c", "head -c 1100000 /dev/zero | tr '\\0' 'A'"],
        },
      ],
      10000,
    );
    expect(results[0].stdout).toContain("[Output truncated]");
    expect(results[0].stdout.length).toBeLessThanOrEqual(1024 * 1024 + 50);
  }, 15000);

  // ---------------------------------------------------------------
  // Concurrency limit — verify all tasks complete
  // ---------------------------------------------------------------
  it("runs 10 tasks with concurrency=2 — all complete", async () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      id: `t${i}`,
      command: "echo",
      args: [`task-${i}`],
    }));
    const results = await orchestrator.runParallelSubagents(tasks, 5000, 2);
    expect(results).toHaveLength(10);
    for (const r of results) {
      expect(r.success).toBe(true);
    }
  }, 15000);

  // ---------------------------------------------------------------
  // Empty task list
  // ---------------------------------------------------------------
  it("handles empty task list gracefully", async () => {
    const results = await orchestrator.runParallelSubagents([]);
    expect(results).toEqual([]);
  });

  // ---------------------------------------------------------------
  // stderr captured
  // ---------------------------------------------------------------
  it("captures stderr output", async () => {
    const results = await orchestrator.runParallelSubagents([
      {
        id: "stderr-1",
        command: "bash",
        args: ["-c", "echo error >&2; exit 0"],
      },
    ]);
    expect(results[0].stderr).toContain("error");
    expect(results[0].success).toBe(true);
  });
});
