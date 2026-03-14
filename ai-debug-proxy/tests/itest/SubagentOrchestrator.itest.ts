/**
 * [Satisfies $ARCH-05]
 * [Satisfies $SW-5]
 * [Satisfies $SW-6]
 *
 * Integration tests for SubagentOrchestrator
 * Coverage: $DD-SW-5 (Subagent Orchestrator), $DD-SW-6 (Parallel Execution)
 */

import { SubagentOrchestrator, SubagentTask, SubagentResult } from "../../src/agent/SubagentOrchestrator";
import { spawn } from "child_process";

jest.mock("child_process");

describe("SubagentOrchestrator [Satisfies $ARCH-05]", () => {
  let orchestrator: SubagentOrchestrator;

  beforeEach(() => {
    orchestrator = new SubagentOrchestrator();
    jest.clearAllMocks();
  });

  describe("runParallelSubagents() [Satisfies $ARCH-05.1]", () => {
    it("executes a single subagent task successfully", async () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn((event, cb) => cb(Buffer.from("test output"))) },
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as any);

      const tasks: SubagentTask[] = [
        { id: "task-1", command: "echo", args: ["hello"] },
      ];

      const results = await orchestrator.runParallelSubagents(tasks, 5000, 1);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("task-1");
      expect(results[0].success).toBe(true);
    });

    it("handles multiple tasks in parallel", async () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      const createMockProcess = () => ({
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn((event, cb) => cb(Buffer.from("output"))) },
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
        kill: jest.fn(),
      });

      mockSpawn
        .mockImplementation(() => createMockProcess() as any)
        .mockImplementationOnce(() => createMockProcess() as any)
        .mockImplementationOnce(() => createMockProcess() as any);

      const tasks: SubagentTask[] = [
        { id: "task-1", command: "echo", args: ["1"] },
        { id: "task-2", command: "echo", args: ["2"] },
      ];

      const results = await orchestrator.runParallelSubagents(tasks, 5000, 2);

      expect(results).toHaveLength(2);
      expect(mockSpawn).toHaveBeenCalledTimes(2);
    });

    it("respects max concurrency limit", async () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const createMockProcess = () => ({
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: {
          on: jest.fn((event, cb) => {
            if (event === "data") {
              setTimeout(() => cb(Buffer.from("output")), 10);
            }
          }),
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => {
          if (event === "close") {
            concurrentCount--;
            cb(0);
          }
        }),
        kill: jest.fn(),
      });

      mockSpawn.mockImplementation(() => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        return createMockProcess() as any;
      });

      const tasks: SubagentTask[] = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        command: "echo",
        args: [String(i)],
      }));

      await orchestrator.runParallelSubagents(tasks, 5000, 2);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it("throws error when task count exceeds MAX_TASKS", async () => {
      const tasks: SubagentTask[] = Array.from({ length: 51 }, (_, i) => ({
        id: `task-${i}`,
        command: "echo",
        args: [String(i)],
      }));

      await expect(
        orchestrator.runParallelSubagents(tasks),
      ).rejects.toThrow(/Too many tasks/);
    });

    it("handles task failure gracefully", async () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn((event, cb) => cb(Buffer.from("error"))) },
        on: jest.fn((event, cb) => {
          if (event === "close") cb(1);
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as any);

      const tasks: SubagentTask[] = [
        { id: "task-fail", command: "failing-cmd", args: [] },
      ];

      const results = await orchestrator.runParallelSubagents(tasks, 5000, 1);

      expect(results[0].success).toBe(false);
      expect(results[0].exitCode).toBe(1);
    });

    it("handles task timeout", async () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as any);

      const tasks: SubagentTask[] = [
        { id: "task-slow", command: "slow-cmd", args: [] },
      ];

      const results = await orchestrator.runParallelSubagents(tasks, 10, 1);

      expect(mockProcess.kill).toHaveBeenCalled();
      expect(results[0].success).toBe(false);
      expect(results[0].stderr).toContain("Timeout");
    });

    it("handles process spawn error", async () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => {
          if (event === "error") cb(new Error("Spawn failed"));
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as any);

      const tasks: SubagentTask[] = [
        { id: "task-error", command: "nonexistent", args: [] },
      ];

      const results = await orchestrator.runParallelSubagents(tasks, 5000, 1);

      expect(results[0].success).toBe(false);
      expect(results[0].exitCode).toBe(-2);
    });

    it("truncates output exceeding MAX_OUTPUT_BYTES", async () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      const largeOutput = "x".repeat(1024 * 1024 + 100);
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: {
          on: jest.fn((event, cb) => {
            if (event === "data") cb(Buffer.from(largeOutput));
          }),
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as any);

      const tasks: SubagentTask[] = [
        { id: "task-large", command: "echo", args: [] },
      ];

      const results = await orchestrator.runParallelSubagents(tasks, 5000, 1);

      expect(results[0].stdout.length).toBeLessThanOrEqual(1024 * 1024 + 20);
      expect(results[0].stdout).toContain("[Output truncated]");
    });
  });
});
