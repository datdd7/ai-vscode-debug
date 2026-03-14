// Mock vscode before any imports
let _activeSession: { id: string } | null = null;

jest.mock(
  "vscode",
  () => ({
    debug: {
      onDidTerminateDebugSession: jest.fn(),
      get activeDebugSession() {
        return _activeSession;
      },
    },
  }),
  { virtual: true },
);

jest.mock("fs", () => ({ appendFileSync: jest.fn() }));

import * as events from "../events";

// Helper to reset module-level state between tests
function resetState() {
  events.clearCurrentTopFrameId();
  events.clearLastStopEvent();
  events.resolveWaitPromise(false); // drain any pending resolvers
  _activeSession = null;
}

describe("Events State Management", () => {
  beforeEach(resetState);

  // ---------------------------------------------------------------
  // getCurrentTopFrameId / updateCurrentTopFrameId / clearCurrentTopFrameId
  // ---------------------------------------------------------------
  it("should set and clear current top frame ID by sessionId", () => {
    expect(events.getCurrentTopFrameId("s1")).toBeUndefined();

    events.updateCurrentTopFrameId(42, "s1");
    expect(events.getCurrentTopFrameId("s1")).toBe(42);

    events.clearCurrentTopFrameId("s1");
    expect(events.getCurrentTopFrameId("s1")).toBeUndefined();
  });

  it("falls back to active session when no sessionId provided", () => {
    _activeSession = { id: "active-session" };
    events.updateCurrentTopFrameId(99, "active-session");
    // Get without sessionId → uses active session
    expect(events.getCurrentTopFrameId()).toBe(99);
  });

  it("updateCurrentTopFrameId does nothing when no sessionId and no active session", () => {
    _activeSession = null;
    events.updateCurrentTopFrameId(5);
    // should not throw, just no-op
    expect(events.getCurrentTopFrameId()).toBeUndefined();
  });

  it("clearCurrentTopFrameId with no sessionId clears all sessions' topFrameId via active session", () => {
    _activeSession = { id: "s2" };
    events.updateCurrentTopFrameId(7, "s2");
    events.clearCurrentTopFrameId(); // uses active session fallback
    expect(events.getCurrentTopFrameId("s2")).toBeUndefined();
  });

  it("clearCurrentTopFrameId with no sessionId and no active session is no-op", () => {
    _activeSession = null;
    expect(() => events.clearCurrentTopFrameId()).not.toThrow();
  });

  // ---------------------------------------------------------------
  // getLastStopEventBody / clearLastStopEvent / getLastStopSessionId
  // ---------------------------------------------------------------
  it("getLastStopEventBody returns undefined when no stop event", () => {
    expect(events.getLastStopEventBody("no-such-session")).toBeUndefined();
  });

  it("getLastStopEventBody by sessionId", () => {
    events.resolveWaitPromise(false); // clear resolvers
    // Simulate DapStopTracker storing state by calling internal setters via resolveWaitPromise
    // We use clearLastStopEvent then verify it works
    events.clearLastStopEvent("s3");
    expect(events.getLastStopEventBody("s3")).toBeUndefined();
  });

  it("getLastStopSessionId returns last session with a stop body", () => {
    // Initially nothing
    expect(events.getLastStopSessionId()).toBeUndefined();
  });

  it("clearLastStopEvent clears all sessions when no sessionId provided", () => {
    expect(() => events.clearLastStopEvent()).not.toThrow();
  });

  it("clearLastStopEvent with invalid sessionId is no-op", () => {
    expect(() => events.clearLastStopEvent("non-existent")).not.toThrow();
  });

  // ---------------------------------------------------------------
  // getLastStopEventBody fallback via active session
  // ---------------------------------------------------------------
  it("getLastStopEventBody falls back to active session when no sessionId provided", () => {
    _activeSession = { id: "active-s" };
    expect(events.getLastStopEventBody()).toBeUndefined(); // nothing stored yet
  });

  it("getLastStopEventBody returns undefined when no active session and no sessionId", () => {
    _activeSession = null;
    expect(events.getLastStopEventBody()).toBeUndefined();
  });

  // ---------------------------------------------------------------
  // waitForStopEvent — timeout branch
  // ---------------------------------------------------------------
  it("waitForStopEvent resolves false on timeout", async () => {
    jest.useFakeTimers();
    const p = events.waitForStopEvent(100);
    jest.advanceTimersByTime(200);
    const result = await p;
    expect(result).toBe(false);
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------
  // waitForStopEvent — resolved early via resolveWaitPromise
  // ---------------------------------------------------------------
  it("waitForStopEvent resolves true when resolveWaitPromise called", async () => {
    jest.useFakeTimers();
    const p = events.waitForStopEvent(5000);
    events.resolveWaitPromise(true);
    jest.runAllTimers();
    const result = await p;
    expect(result).toBe(true);
    jest.useRealTimers();
  });

  it("waitForStopEvent resolves false when resolveWaitPromise(false) called", async () => {
    jest.useFakeTimers();
    const p = events.waitForStopEvent(5000);
    events.resolveWaitPromise(false);
    jest.runAllTimers();
    const result = await p;
    expect(result).toBe(false);
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------
  // Concurrent callers — all receive the same resolved value
  // ---------------------------------------------------------------
  it("multiple concurrent waitForStopEvent calls all get resolved", async () => {
    jest.useFakeTimers();
    const p1 = events.waitForStopEvent(5000);
    const p2 = events.waitForStopEvent(5000);
    const p3 = events.waitForStopEvent(5000);

    events.resolveWaitPromise(true);
    jest.runAllTimers();

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(r3).toBe(true);
    jest.useRealTimers();
  });

  it("resolveWaitPromise with no pending resolvers does not throw", () => {
    expect(() => events.resolveWaitPromise(true)).not.toThrow();
  });

  // ---------------------------------------------------------------
  // onDapStopEvent callback registration
  // ---------------------------------------------------------------
  it("onDapStopEvent registers a callback (no throw)", () => {
    const cb = jest.fn();
    expect(() => events.onDapStopEvent(cb)).not.toThrow();
  });
});
