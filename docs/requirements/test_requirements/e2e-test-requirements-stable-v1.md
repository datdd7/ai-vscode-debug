# E2E Test Requirements — AI Debug Proxy v3.0.0 Stable
# (test-electron Automated Suite)

**Document Type:** Automated E2E Test Requirements & Release Gate  
**Version:** 1.0  
**Date:** 2026-04-14  
**Target Release:** `v3.0.0` (Stable)  
**Test Framework:** `@vscode/test-electron` + Mocha TDD  
**Run Command:** `npm run test:e2e` (in `ai-debug-proxy/`)

---

## 1. Purpose & Scope

This document defines the automated E2E test suite requirements for the AI Debug Proxy stable release.
Unlike the companion manual checklist (`test-requirements-stable-v1.md`), every requirement here maps
to a concrete automated test that runs inside a real VS Code Electron instance via `@vscode/test-electron`.

### What this covers

| Item | Detail |
|------|--------|
| **Test framework** | `@vscode/test-electron` spawns real VS Code; tests run in its extension host via Mocha |
| **Transport** | Tests drive the extension through the HTTP REST API (`localhost:9997`) |
| **Target binary** | `playground/build/cooling_ecu` (ELF with debug symbols) |
| **Multi-thread binary** | `playground/build/cooling_ecu_mt` (for Suite J) |
| **Total tests** | 69 existing + 3 new required = **72 target** |
| **Stable gate** | ≥ 71/72 PASS (1 allowed skip with justification) |

### What is NOT in scope

- Unit tests (`npm test` / vitest) — separate CI job, already at 100% coverage
- Manual verification steps from `test-requirements-stable-v1.md` — human-executed separately
- Performance benchmarks
- Attach to live process (positive path) — requires external process setup, deferred post-stable

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  xvfb-run -a  (virtual display for headless WSL/CI)      │
│  └─ node out/test/runTest.js                             │
│     └─ @vscode/test-electron                             │
│        ├─ spawns: VSCode-linux-x64/code                  │
│        │   ├─ loads extension: ai-debug-proxy            │
│        │   │   └─ starts HTTP proxy on port 9997         │
│        │   └─ opens workspace: playground/               │
│        └─ injects: out/test/suite/index.js (Mocha)       │
│           ├─ Suite A … Suite L (alphabet suites)         │
│           └─ extension.test.ts (UC7/UC8/UC9)            │
└──────────────────────────────────────────────────────────┘
```

### Key design decisions

| Decision | Reason |
|----------|--------|
| Port **9997** (not 9999) | Isolates E2E run from any production extension on 9999 |
| `delete process.env.ELECTRON_RUN_AS_NODE` in `runTest.ts` | VS Code extension host sets this; would cause Electron binary to reject VS Code flags |
| `xvfb-run -a` in `package.json` test:e2e script | Provides virtual display for Electron in headless WSL/CI |
| `stopOnEntry: true` for all launches | Deterministic stop point; tests use `waitForStop()` not fixed `setTimeout` |
| `waitForStop()` polling helper | Avoids flaky race conditions; polls `/api/status` every 200 ms up to 8 s |

### File layout

```
ai-debug-proxy/src/test/
├── runTest.ts              ← @vscode/test-electron entry point
├── suite/
│   ├── index.ts            ← Mocha runner (TDD ui, 20 s timeout)
│   ├── constants.ts        ← Centralized line numbers for playground/main.c
│   ├── helpers.ts          ← Shared: proxyPost, launchAndWaitForStop, waitForStop, …
│   ├── extension.test.ts   ← UC7/UC8/UC9 (legacy; raw axios)
│   ├── a-session-lifecycle.test.ts
│   ├── b-breakpoint-management.test.ts
│   ├── c-execution-control.test.ts
│   ├── d-stack-frame-navigation.test.ts
│   ├── e-variable-inspection.test.ts
│   ├── f-source-navigation.test.ts
│   ├── g-memory-registers.test.ts
│   ├── h-validation-errors.test.ts
│   ├── i-agent-workflow.test.ts
│   ├── j-multithread.test.ts
│   ├── k-extended-operations.test.ts
│   └── l-remaining-operations.test.ts
```

---

## 3. Test Environment Requirements

### 3.1 Prerequisites

| Requirement | Value | Verification |
|-------------|-------|--------------|
| OS | Linux (WSL2 or native) | `uname -a` |
| VS Code Electron | Pre-downloaded at `ai-debug-proxy/.vscode-test/VSCode-linux-x64/code` | `runTest.ts` uses it if present; otherwise auto-downloads |
| GDB | `gdb` on `$PATH`, version ≥ 9.x | `gdb --version` |
| Xvfb | `xvfb-run` available | `which xvfb-run` |
| Node.js | ≥ 18.x | `node --version` |
| Extension built | `out/extension.js` exists | `npm run compile` |
| Test suite compiled | `out/test/suite/*.js` exist | `npm run compile` (esbuild handles both) |
| Playground binary | `playground/build/cooling_ecu` (ELF, debug symbols) | `file playground/build/cooling_ecu` |
| MT binary (Suite J) | `playground/build/cooling_ecu_mt` | `file playground/build/cooling_ecu_mt` |

### 3.2 Build before run

```bash
cd ai-debug-proxy
npm run compile        # esbuild → out/extension.js + out/test/**/*.js
npm run test:e2e       # xvfb-run -a node ./out/test/runTest.js
```

If `cooling_ecu` is missing, rebuild:
```bash
cd playground && make clean && make
```

### 3.3 Port isolation

The E2E suite runs exclusively on port **9997**.  
`runTest.ts` writes `{"aiDebugProxy.port": 9997, "aiDebugProxy.autoStart": true}` into
an isolated `--user-data-dir` so the production extension on 9999 is never touched.

### 3.4 Environment variables

| Variable | Set by | Purpose |
|----------|--------|---------|
| `AI_DEBUG_PROXY_PORT` | `runTest.ts` → `extensionTestsEnv` | Tells test helpers which port to use |
| `MOCHA_GREP` | Optional CLI `--grep` arg | Runs only matching test names |
| `ELECTRON_RUN_AS_NODE` | **Deleted** by `runTest.ts` | Prevents Electron from running as Node.js |

### 3.5 Timeout budget

| Scope | Value | Location |
|-------|-------|----------|
| Global Mocha timeout | 20 000 ms | `suite/index.ts` |
| Per-test override | 12 000–35 000 ms | `this.timeout(N)` in each test |
| `waitForStop` max | 8 000 ms | `TIMEOUTS.STOP_POLL_TIMEOUT` |
| Launch settle | 5 000 ms | `TIMEOUTS.LAUNCH_SETTLE` |
| Session cleanup | 800 ms | `TIMEOUTS.SESSION_CLEANUP` |

---

## 4. Test Inventory (Existing — 69 Tests)

Status key: ✅ PASS (last run 2026-04-13) | ⚠️ KNOWN-FAIL | 🔶 CONDITIONAL

### 4.1 extension.test.ts — Legacy UC Tests (3)

Corresponds to manual TCs: A1, C5 (pause), E4 (variable mutation)

| ID | Name | Manual TC | Status | Notes |
|----|------|-----------|--------|-------|
| UC7 | Jump to line stays PAUSED at target | C7 | ✅ | Uses raw `setTimeout(3000)` — fragile |
| UC8 | Async interrupt while running loop | C5 | ✅ | Uses raw `setTimeout(1000)` — fragile |
| UC9 | Variable mutation persists after step | E4 | ✅ | Uses raw `setTimeout(3000)` — fragile |

> These three tests predate the helpers.ts pattern. They work but are susceptible to timing
> on slow CI. **Stable requirement:** either pass or be migrated to use `waitForStop`.

---

### 4.2 Suite A — Session Lifecycle (5)

`src/test/suite/a-session-lifecycle.test.ts`  
Setup: none. Teardown: `terminateSession()`.

| ID | Name | Manual TC | Status | Notes |
|----|------|-----------|--------|-------|
| A1 | Launch with stopOnEntry — session active and stopped | TC-A1 | ✅ | |
| A2 | Terminate active session — cleanup confirmed | TC-A3 | ✅ | |
| A3 | Restart mid-session — re-stopped at main | TC-A4 | ⚠️ KNOWN-FAIL | `GDBBackend.restart()` sends `-exec-run` without re-setting stopOnEntry BP → program exits → VS Code session terminates |
| A4 | Sequential terminate + re-launch — second session works | TC-A1×2 | ✅ | |
| A5 | Operations after session terminated — return error | TC-H3 | ✅ | |

**A3 action required:** Fix `GDBBackend.restart()` or add `.skip()` with issue ref before stable.

---

### 4.3 Suite B — Breakpoint Management (7)

`src/test/suite/b-breakpoint-management.test.ts`  
Setup: `launchAndWaitForStop`. Teardown: `terminateSession`.

| ID | Name | Manual TC | Status |
|----|------|-----------|--------|
| B1 | Set breakpoint — ID and verified returned | TC-B1 | ✅ |
| B2 | Continue to breakpoint — stop reason is breakpoint | TC-B2+C1 | ✅ |
| B3 | Remove breakpoint — no longer in active list | TC-B4 | ✅ |
| B4 | Multiple breakpoints — all tracked | TC-B3 | ✅ |
| B5 | Breakpoint at invalid line — error or verified=false | TC-B6 | ✅ |
| B6 | Temporary breakpoint — auto-removed after hit | TC-B2 | ✅ |
| B7 | remove_all_breakpoints_in_file — bulk cleanup | TC-B5 | ✅ |

---

### 4.4 Suite C — Execution Control (6)

`src/test/suite/c-execution-control.test.ts`  
Setup: `launchAndWaitForStop`. Teardown: `terminateSession`.

| ID | Name | Manual TC | Status |
|----|------|-----------|--------|
| C1 | step_over — advances line, stays in main | TC-C2 | ✅ |
| C2 | step_in — enters function | TC-C3 | ✅ |
| C3 | step_out — returns to caller | TC-C4 | ✅ |
| C4 | until — runs to specific line | TC-C6 | ✅ |
| C5 | continue + pause round-trip — consistent state | TC-C1+C5 | ✅ |
| C6 | Operations while program is running — graceful handling | TC-H3 variant | ✅ |

---

### 4.5 Suite D — Stack Frame Navigation (5)

`src/test/suite/d-stack-frame-navigation.test.ts`  
Setup: `launchAndWaitForStop`. Teardown: `terminateSession`.

| ID | Name | Manual TC | Status | Notes |
|----|------|-----------|--------|-------|
| D1 | stack_trace — valid frame structure returned | TC-D1 | ✅ | |
| D2 | up + down — traverse call stack | TC-D2+D3 | ✅ | Happy path only; does not test `down` at frame 0 |
| D3 | goto_frame by ID — succeeds | TC-D5 | ✅ | |
| D4 | Variables differ between frames | TC-D2 ext | ✅ | |
| D5 | stack_trace at main entry — top frame is main | TC-D1 ext | ✅ | |

**Gap:** TC-D4 (`down` at outermost frame returns error) has no automated test. See §5.1.

---

### 4.6 Suite E — Variable Inspection (7)

`src/test/suite/e-variable-inspection.test.ts`  
Setup: `launchAndWaitForStop` + `step_over`. Teardown: `terminateSession`.

| ID | Name | Manual TC | Status |
|----|------|-----------|--------|
| E1 | get_variables — includes `iteration` | TC-E1 | ✅ |
| E2 | evaluate — read variable value | TC-E3 | ✅ |
| E3 | evaluate — arithmetic expression | TC-E3 ext | ✅ |
| E4 | evaluate — write to variable (mutation) | UC9 / TC-E3 | ✅ |
| E5 | whatis — type inspection | TC-E4 | ✅ |
| E6 | list_all_locals — returns multiple locals | TC-E6 | ✅ |
| E7 | evaluate invalid expression — graceful error | TC-H variant | ✅ |

---

### 4.7 Suite F — Source Navigation (3)

`src/test/suite/f-source-navigation.test.ts`  
Setup: `launchAndWaitForStop`. Teardown: `terminateSession`.

| ID | Name | Manual TC | Status | Notes |
|----|------|-----------|--------|-------|
| F1 | list_source — returns source lines | TC-F1 | ✅ | |
| F2 | get_source — returns function source | TC-F2 | ✅ | Also verifies BUG-05 fix: no raw `/home/` paths in output |
| F3 | get_last_stop_info — contains reason and frame | TC-F4 | ✅ | |

---

### 4.8 Suite G — Memory & Registers (3)

`src/test/suite/g-memory-registers.test.ts`  
Setup: `launchAndWaitForStop` + `step_over`. Teardown: `terminateSession`.

| ID | Name | Manual TC | Status | Notes |
|----|------|-----------|--------|-------|
| G1 | get_registers — returns register names | TC-G1 | ✅ | |
| G2 | read_memory — read bytes at variable address | TC-G2 | ✅ | |
| G3 | read_memory excessive count — rejected | TC-G4 | ✅ | |

**Gap:** No read-back verification after `write_memory` (write is in L1). See §5.2.

---

### 4.9 Suite H — Validation & Error Resilience (12)

`src/test/suite/h-validation-errors.test.ts`  
No session setup required.

| ID | Name | Manual TC | Status |
|----|------|-----------|--------|
| H1 | Missing operation field returns error | TC-H1 | ✅ |
| H2 | Unknown operation name returns 400 | TC-H2 | ✅ |
| H3 | set_breakpoint without params returns 400 | TC-B7 | ✅ |
| H4 | Path traversal in expression — no /etc/passwd leak | TC-F3 | ✅ |
| H5 | Error responses do not contain server file paths (ADP-024) | TC-H10 | ✅ |
| H6 | Operations without active session return error | TC-H3 | ✅ |
| H7 | jump without line param returns 400 | TC-H4 | ✅ |
| H8 | goto_frame with non-numeric frameId returns 400 | TC-H5 | ✅ |
| H9 | remove_all_breakpoints_in_file without filePath returns 400 | TC-H12 | ✅ |
| H10 | evaluate without expression returns 400 | — | ✅ |
| H11 | switch_thread without threadId returns 400 | TC-H6 | ✅ |
| H12 | whatis without expression returns 400 | — | ✅ |

**Gap:** TC-H9 (prototype pollution) not automated. See §5.3.

---

### 4.10 Suite I — AI Agent Workflow (3)

`src/test/suite/i-agent-workflow.test.ts`  
Setup: `launchAndWaitForStop`. Teardown: `terminateSession`.

| ID | Name | Manual TC | Status |
|----|------|-----------|--------|
| I1 | Bug investigation workflow — full step-by-step | Suite R partial | ✅ |
| I2 | Multi-function debugging — step_in, navigate, step_out | — | ✅ |
| I3 | Rapid sequential operations — no MI2 corruption | — | ✅ |

---

### 4.11 Suite J — Multi-Thread Debugging (6)

`src/test/suite/j-multithread.test.ts`  
Binary: `playground/build/cooling_ecu_mt` (C++ pthread).

| ID | Name | Manual TC | Status | Notes |
|----|------|-----------|--------|-------|
| J1 | list_threads — at least 1 thread at entry | TC-J1 | ✅ | |
| J2 | list_threads after thread creation | TC-J1 ext | 🔶 CONDITIONAL | Requires `cooling_ecu_mt`; skip if binary absent |
| J3 | switch_thread — changes debugger context | TC-J2 | 🔶 CONDITIONAL | Requires multi-thread |
| J4 | Per-thread stack trace via threadId param | TC-D1 ext | 🔶 CONDITIONAL | Requires multi-thread |
| J5 | Per-thread variables differ after switch | TC-J2 ext | 🔶 CONDITIONAL | Requires multi-thread |
| J6 | switch_thread to invalid ID — error | — | ✅ | |

---

### 4.12 Suite K — Extended Operations (6)

`src/test/suite/k-extended-operations.test.ts`  
Setup: `launchAndWaitForStop` + `step_over`. Teardown: `terminateSession`.

| ID | Name | Manual TC | Status | Notes |
|----|------|-----------|--------|-------|
| K1 | get_arguments — returns arguments scope at main() | TC-E2 | ✅ | |
| K2 | get_globals — returns global variables list | TC-K1 | ✅ | |
| K3 | pretty_print — returns value + type | TC-E5 | ✅ | |
| K4 | execute_statement — runs GDB command | TC-K2 | ✅ | |
| K5 | get_scope_preview — combined locals + args | TC-E7 | ✅ | |
| K6 | get_capabilities — returns capability flags | TC-K3 | ✅ | Tests WITH session only |

**Gap:** TC-K4 (`get_capabilities` without active session) not automated. See §5.4.

---

### 4.13 Suite L — Remaining Operations (3)

`src/test/suite/l-remaining-operations.test.ts`  
Setup: per-test. Teardown: `terminateSession`.

| ID | Name | Manual TC | Status | Notes |
|----|------|-----------|--------|-------|
| L1 | write_memory — write bytes to iteration variable address | TC-G3 | ✅ | Writes but does NOT read back to verify bytes |
| L2 | terminate via API — session ends cleanly | TC-A3 | ✅ | |
| L3 | attach to non-existent PID — returns error gracefully | TC-H11 | ✅ | |

---

## 5. Gap Analysis — Stable Release

Comparing existing 69 tests against `test-requirements-stable-v1.md` (75 manual TCs).

### 5.1 GAP-D4: `down` at outermost frame — no error test

**Severity:** HIGH  
**Manual TC:** TC-D4  
**Current coverage:** D2 tests `up` then `down` on a 2-frame stack (happy path). No test exercises `down` when `currentFrameId === 0`.  
**Why it matters:** The fix for this was added to `GDBBackend.frameDown()` (throws `DebugError` instead of silent no-op). Without an automated test, a regression would go undetected.  
**New test required:** `D6` — see §6.1.

---

### 5.2 GAP-G3: `write_memory` — no read-back verification

**Severity:** MEDIUM  
**Manual TC:** TC-G3  
**Current coverage:** L1 calls `write_memory` and asserts `success !== false`. Does not call `read_memory` afterward to verify the bytes were actually written.  
**Why it matters:** The write could silently succeed at the API layer but not reach GDB. Read-back closes the loop.  
**New test required:** `L4` or update `L1` — see §6.2.

---

### 5.3 GAP-K4: `get_capabilities` without active session

**Severity:** MEDIUM  
**Manual TC:** TC-K4  
**Current coverage:** K6 calls `get_capabilities` while a session is active (inside `setup` block). The no-session path in `handleDebugOperation` (router line 266–278) is not exercised by any E2E test.  
**Why it matters:** AI agents call `get_capabilities` before launching to discover supported operations. This path must work without a session.  
**New test required:** `K7` — see §6.3.

---

### 5.4 GAP-A3: Restart — pre-existing failure

**Severity:** HIGH  
**Manual TC:** TC-A4  
**Current coverage:** A3 exists but fails. `GDBBackend.restart()` sends `-exec-run` without re-setting the `stopOnEntry` breakpoint. Program runs to completion, VS Code session terminates, `waitForStop` times out.  
**Root cause:** `restart()` in `GDBBackend.ts` needs to re-issue the entry breakpoint before `-exec-run`.  
**Action required (one of):**
1. Fix `GDBBackend.restart()` — preferred for stable
2. Mark A3 as `test.skip('A3: …')` with a linked issue — acceptable if fix deferred

---

### 5.5 GAP-H9: Prototype pollution — not automated

**Severity:** LOW  
**Manual TC:** TC-H9  
**Current coverage:** None. The body parser in `HttpServer.ts` uses `JSON.parse()` which does not protect against `__proto__` injection.  
**Action required:** Add H13 validation test — see §6.4. Does not block stable if manually verified.

---

### 5.6 GAP-UC: Legacy tests use `setTimeout` instead of `waitForStop`

**Severity:** LOW  
**Affected tests:** UC7, UC8, UC9 (`extension.test.ts`)  
**Issue:** `await new Promise(resolve => setTimeout(resolve, 3000))` is a fixed delay — flaky on slow CI.  
**Action required:** Migrate to `launchAndWaitForStop` + `waitForStop` from helpers.ts. Not a blocker if these 3 pass consistently.

---

### 5.7 Coverage summary

| Gap | Severity | Blocker? | New test |
|-----|----------|----------|----------|
| GAP-D4: `down` at frame 0 error | HIGH | YES | D6 |
| GAP-A3: restart failure | HIGH | YES | fix or skip A3 |
| GAP-G3: write_memory no read-back | MEDIUM | NO | L4 (recommended) |
| GAP-K4: capabilities without session | MEDIUM | NO | K7 (recommended) |
| GAP-H9: prototype pollution | LOW | NO | H13 (optional) |
| GAP-UC: legacy setTimeout | LOW | NO | migrate UC7/8/9 (optional) |

---

## 6. New Tests Required for Stable

### 6.1 D6: `down` at outermost frame returns error (BLOCKING)

**File:** `src/test/suite/d-stack-frame-navigation.test.ts`  
**Covers:** GAP-D4, manual TC-D4, `GDBBackend.frameDown()` error path  
**Setup:** `launchAndWaitForStop` (already in suite setup)

```typescript
test('D6: down at outermost frame — returns error', async function() {
    this.timeout(12000);
    // At entry point, currentFrameId is 0 (already at outermost frame).
    // Calling 'down' must return an error — NOT a silent no-op.
    const res = await proxyPost('down');

    // Acceptable: success=false with error message, OR HTTP 500 with error body
    const isError =
        res.success === false ||
        res.error ||
        (res.data && typeof res.data === 'object' && res.data.success === false);

    assert.ok(
        isError,
        `Expected error when calling down at outermost frame, got: ${JSON.stringify(res)}`
    );

    const errMsg = (res.error || res.data?.error || res.message || '').toLowerCase();
    assert.ok(
        errMsg.includes('outermost') || errMsg.includes('frame') || errMsg.includes('already'),
        `Error message should indicate outermost frame: "${errMsg}"`
    );
});
```

**Pass criteria:**
- `success === false` (or HTTP 4xx/5xx)
- Error message contains `outermost`, `frame`, or `already`
- No proxy crash, no silent no-op

---

### 6.2 L4: `write_memory` round-trip — read-back verification (RECOMMENDED)

**File:** `src/test/suite/l-remaining-operations.test.ts`  
**Covers:** GAP-G3, manual TC-G3  
**Setup:** `launchAndWaitForStop` + `step_over` (iteration in scope)

```typescript
test('L4: write_memory round-trip — read-back verifies written bytes', async function() {
    this.timeout(30000);
    await launchAndWaitForStop('SuiteL-L4');
    await proxyPost('step_over');
    await waitForStepComplete(5000);

    // Get address of iteration
    const addrRes = await proxyPost('evaluate', { expression: '&iteration' });
    assert.ok(addrRes.success !== false, `evaluate &iteration failed: ${JSON.stringify(addrRes)}`);
    const addrVal = String((addrRes.data ?? addrRes)?.value ?? '0');
    const hexMatch = addrVal.match(/0x[0-9a-fA-F]+/);
    assert.ok(hexMatch, `Expected hex address, got: ${addrVal}`);
    const address = hexMatch![0];
    const addrNum = parseInt(address, 16);

    // Write known pattern: 0xDE, 0xAD, 0xBE, 0xEF
    const writeRes = await proxyPost('write_memory', {
        address: addrNum,
        data: 'deadbeef'
    });
    assert.ok(writeRes.success !== false, `write_memory failed: ${JSON.stringify(writeRes)}`);

    // Read back 4 bytes and verify
    const readRes = await proxyPost('read_memory', {
        memoryReference: address,
        count: 4
    });
    assert.ok(readRes.success !== false, `read_memory failed: ${JSON.stringify(readRes)}`);

    const hexData: string = (readRes.data?.data || '').toLowerCase();
    assert.ok(
        hexData.includes('de') && hexData.includes('ad'),
        `Read-back should contain written bytes (deadbeef), got: ${hexData}`
    );
});
```

**Pass criteria:**
- Write succeeds
- Read-back returns hex string containing written bytes
- No proxy crash

---

### 6.3 K7: `get_capabilities` without active session (RECOMMENDED)

**File:** `src/test/suite/k-extended-operations.test.ts`  
**Covers:** GAP-K4, manual TC-K4  
**Setup:** none — explicitly requires no active session

```typescript
test('K7: get_capabilities — works without active session', async function() {
    this.timeout(10000);
    // Ensure no session is active
    await terminateSession();

    const res = await proxyPost('get_capabilities');
    assert.ok(
        res.success !== false,
        `get_capabilities should succeed without active session, got: ${JSON.stringify(res)}`
    );
    const data = res.data !== undefined ? res.data : res;
    assert.ok(
        typeof data === 'object' && data !== null,
        `get_capabilities should return capability object, got: ${JSON.stringify(data)}`
    );
    assert.ok(
        'supportsLaunch' in data,
        `Capabilities should include supportsLaunch: ${JSON.stringify(data)}`
    );
});
```

**Pass criteria:**
- `success !== false` with no active session
- Returns capability object with `supportsLaunch` field
- Does NOT return "No debug backend initialized" error

---

### 6.4 H13: Prototype pollution — body ignored (OPTIONAL)

**File:** `src/test/suite/h-validation-errors.test.ts`  
**Covers:** GAP-H9, manual TC-H9

```typescript
test('H13: Prototype pollution attempt — body fields ignored', async function() {
    this.timeout(10000);
    // Send __proto__ in the body — must not crash or pollute Object.prototype
    const res = await proxyPostRaw({
        operation: 'get_capabilities',
        '__proto__': { polluted: true }
    });

    // Must not crash
    assert.ok(
        res.status === 200 || res.status === 400 || res.status === 500,
        `Proxy should return a valid HTTP status, got: ${res.status}`
    );

    // Object.prototype must NOT be polluted
    assert.strictEqual(
        (Object.prototype as any).polluted,
        undefined,
        'Object.prototype.polluted should remain undefined'
    );
});
```

**Pass criteria:**
- Proxy returns a valid HTTP response (not a crash/hang)
- `Object.prototype.polluted` is `undefined` after the call

---

### 6.5 A3 fix strategy (BLOCKING)

**Option A — Fix (preferred):**  
Update `GDBBackend.restart()` in `src/backend/GDBBackend.ts` to:
1. Look up the current `stopOnEntry` breakpoint (or `main` symbol)
2. Re-issue `-break-insert -t main` (temp BP at main) before sending `-exec-run`
3. Wait for `*stopped` event before resolving

Expected result: A3 passes, `waitForStop` completes within timeout.

**Option B — Skip with issue ref (acceptable for initial stable):**
```typescript
test.skip('A3: Restart mid-session — SKIP: GDB restart missing stopOnEntry BP (issue #42)', async function() {
    // ...
});
```

The stable gate accepts 1 skip; A3 is the designated allowed skip if Option A is not ready.

---

### 6.6 Summary of new tests

| ID | File | Blocking? | TC covered |
|----|------|-----------|------------|
| D6 | d-stack-frame-navigation.test.ts | YES | TC-D4 |
| A3 fix/skip | a-session-lifecycle.test.ts | YES | TC-A4 |
| K7 | k-extended-operations.test.ts | NO (recommended) | TC-K4 |
| L4 | l-remaining-operations.test.ts | NO (recommended) | TC-G3 |
| H13 | h-validation-errors.test.ts | NO (optional) | TC-H9 |

---

## 7. Stable Release Gate

### 7.1 Target test count

| Scenario | Tests | Gate |
|----------|-------|------|
| Blocking new tests implemented (D6, A3 fix) | 71 | ≥ 71/71 PASS |
| A3 skipped + blocking new tests (D6, K7, L4) | 73 | ≥ 72/73 PASS (1 skip allowed) |
| Minimum acceptable (blockers only) | 70 | ≥ 69/70 PASS (1 skip = A3) |

### 7.2 Pass/fail/skip rules

| Result | Definition | Counts toward gate? |
|--------|-----------|---------------------|
| PASS | Test exits with no assertion failure | Yes — positive |
| FAIL | Test exits with assertion error or uncaught throw | BLOCKS release |
| SKIP (`test.skip`) | Test skipped with documented justification | Allowed: max 1 |
| TIMEOUT | Test exceeds `this.timeout(N)` — treated as FAIL | BLOCKS release |
| CONDITIONAL | J2-J5 skip if `cooling_ecu_mt` absent | Allowed: up to 4 |

### 7.3 Per-suite thresholds

| Suite | Tests | Required PASS | Notes |
|-------|-------|--------------|-------|
| UC (extension.test.ts) | 3 | 3/3 | Legacy; must all pass |
| A — Session Lifecycle | 5 | 4/5 | A3 may be 1 allowed skip |
| B — Breakpoints | 7 | 7/7 | |
| C — Execution Control | 6 | 6/6 | |
| D — Stack Navigation | 6 | 6/6 | Includes new D6 |
| E — Variable Inspection | 7 | 7/7 | |
| F — Source Navigation | 3 | 3/3 | |
| G — Memory & Registers | 3 | 3/3 | |
| H — Validation | 12 | 12/12 | H13 optional |
| I — Agent Workflow | 3 | 3/3 | |
| J — Multi-thread | 6 | 2/6 | J2-J5 conditional on mt binary |
| K — Extended Ops | 7 | 7/7 | Includes new K7 |
| L — Remaining | 4 | 4/4 | Includes new L4 |

### 7.4 Regression criteria (non-negotiable)

The following tests represent the core API contract and must pass with **zero tolerance**:

```
A1  — launch + stopOnEntry works
B1  — set_breakpoint returns id + verified
B3  — remove_breakpoint actually removes from tracking (BUG-01b fix)
B7  — remove_all_breakpoints_in_file removes all (BUG-01a fix)
C1  — step_over advances line
D1  — stack_trace returns valid frames
E1  — get_variables returns locals
F2  — get_source does NOT leak /home/ paths (BUG-05 fix)
H1  — missing operation returns error, not crash
H5  — error responses do not contain server paths (ADP-024)
I1  — full AI agent workflow completes without error
```

Any failure in the above 11 tests is a **CRITICAL BLOCK** — no release, no exception.

### 7.5 Run command

```bash
cd /home/ddn6hc/working/ai-vscode-debug/ai-debug-proxy

# Full suite
npm run compile && npm run test:e2e

# Single suite (grep)
npm run compile && MOCHA_GREP="Suite B" npm run test:e2e

# Single test
npm run compile && MOCHA_GREP="B3:" npm run test:e2e
```

### 7.6 CI configuration (`.github/workflows/ci.yml`)

```yaml
e2e-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Install system deps
      run: sudo apt-get install -y xvfb gdb

    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: ai-debug-proxy/package-lock.json

    - name: Install dependencies
      working-directory: ai-debug-proxy
      run: npm ci

    - name: Build playground binary
      working-directory: playground
      run: make

    - name: Compile extension + tests
      working-directory: ai-debug-proxy
      run: npm run compile

    - name: Run E2E tests
      working-directory: ai-debug-proxy
      run: npm run test:e2e
      env:
        DISPLAY: ':99'
      timeout-minutes: 15
```

> Note: `xvfb-run -a` in the `test:e2e` script handles the virtual display.
> The `DISPLAY: ':99'` env var is a fallback for environments where xvfb starts separately.

### 7.7 Known limitations (do not block release)

| Item | Details | Accepted deviation |
|------|---------|-------------------|
| A3 restart | Pre-existing restart bug — program runs to exit | 1 allowed skip |
| J2-J5 conditional | Require `cooling_ecu_mt` binary | Up to 4 allowed skips |
| UC7/8/9 fragility | Use `setTimeout` instead of `waitForStop` | Pass = acceptable; migration optional |
| Attach positive path | Requires external running process | Only negative path (L3) required |

---

## 8. Checklist: Before Tagging v3.0.0

- [ ] `npm run lint` passes (0 TypeScript errors)
- [ ] `npm test` passes (100% unit coverage — vitest)
- [ ] D6 test implemented and passing
- [ ] A3 fixed **OR** skipped with issue reference
- [ ] K7 test implemented and passing (recommended)
- [ ] L4 test implemented and passing (recommended)
- [ ] `npm run test:e2e` result: ≥ 69/70 PASS (or better per §7.1)
- [ ] All 11 regression-critical tests PASS (§7.4)
- [ ] `npm audit --audit-level=moderate` — 0 moderate+ vulnerabilities
- [ ] Release tag `v3.0.0` created
- [ ] Evidence archived to `docs/release/v3/evidence/`

---

*End of Document*

