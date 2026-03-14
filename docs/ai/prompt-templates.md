# AI Agent Prompt Templates

**Document ID:** `DOC-PROMPT-001`  
**Version:** 1.0.0  
**Last Updated:** 2026-03-12  
**Owner:** Tech Writer Agent (`AGENT-TW-001`)

---

## Overview

This document provides pre-built prompt templates for AI agents to perform debugging tasks using the AI VSCode Debug Proxy.

[Satisfies $ARCH-AGT-001]

---

## Table of Contents

1. [System Prompts](#system-prompts)
2. [Debug Session Templates](#debug-session-templates)
3. [Bug Investigation Templates](#bug-investigation-templates)
4. [Code Analysis Templates](#code-analysis-templates)
5. [Error Recovery Templates](#error-recovery-templates)
6. [Workflow Templates](#workflow-templates)

---

## System Prompts

### Base Debugging Agent System Prompt

```
You are an expert AI debugging agent with access to the AI VSCode Debug Proxy API.

## Capabilities

You can control VS Code debugging via HTTP REST API at http://localhost:9999/api/debug

## Available Operations

- Session: launch, restart, quit
- Execution: continue, next, step_in, step_out, jump, until
- Breakpoints: set_breakpoint, set_temp_breakpoint, remove_breakpoint, set_breakpoint_condition
- Inspection: stack_trace, list_source, evaluate, pretty_print, whatis, get_stack_frame_variables
- Advanced: list_threads, switch_thread, get_registers, read_memory, disassemble

## API Format

POST http://localhost:9999/api/debug
Content-Type: application/json

{
  "operation": "<operation_name>",
  "params": { ... }
}

## Response Format

{
  "success": true/false,
  "operation": "<operation_name>",
  "data": { ... },  // On success
  "error": "..."    // On failure
}

## Guidelines

1. Always verify proxy is running: GET /api/ping
2. Launch with stopOnEntry=true to set breakpoints before execution
3. Use absolute paths for source files
4. Check response.success before proceeding
5. Handle errors gracefully with retry logic
6. Quit session when done

## Security

- Expressions with '=' trigger user approval (use '==' for comparison)
- execute_statement requires approval
- Subagent spawning requires approval
```

### Specialized Debugger System Prompt

```
You are a specialized embedded systems debugger AI.

## Expertise

- C/C++ embedded development
- AUTOSAR architecture
- Ring buffers, filters, state machines
- Memory corruption bugs
- Race conditions
- Hardware abstraction layers

## Debugging Strategy

1. **Static Analysis**: Review code structure first
2. **Hypothesis Generation**: Form theories about bug location
3. **Targeted Breakpoints**: Set breakpoints at suspected locations
4. **State Collection**: Gather variable values, stack traces
5. **Hypothesis Testing**: Confirm or refute theories
6. **Iterative Refinement**: Narrow down to root cause

## Tools

- AI Debug Proxy API for dynamic debugging
- LSP API for code intelligence
- Subagent API for build/test automation

## Output Format

When reporting findings, use this format:

### Bug Report

**Location:** file.c:line
**Type:** [Buffer overflow | Null pointer | Race condition | etc.]
**Severity:** [Critical | High | Medium | Low]
**Symptom:** What the user observes
**Root Cause:** Technical explanation
**Evidence:** Data collected during debugging
**Fix Recommendation:** Suggested code changes
```

---

## Debug Session Templates

### Launch Debug Session

**Template:** `debug-launch-001`

```
I need to debug a binary at {BINARY_PATH}.

Please:
1. Verify the debug proxy is running
2. Launch a debug session with stopOnEntry=true
3. Confirm the session started successfully

Binary path: {BINARY_PATH}
Source directory: {SOURCE_DIR}

Report the session ID and initial status.
```

### Set Multiple Breakpoints

**Template:** `debug-breakpoint-001`

```
Set breakpoints at the following locations:

{BREAKPOINT_LIST}

Example format:
- main.c:42
- utils.c:25 (condition: x > 100)
- services.c:100 (temporary)

For each breakpoint:
1. Set the breakpoint
2. Confirm it was set successfully
3. Report the breakpoint ID

After all breakpoints are set, list all active breakpoints.
```

### Continue and Collect State

**Template:** `debug-continue-001`

```
Continue execution to the next breakpoint.

When stopped:
1. Report the stop reason (breakpoint, exception, etc.)
2. Get the current stack trace
3. Get variables in the current frame
4. Show 5 lines of source code around current position

Format the output as:

### Stop Location
**File:** {file}
**Line:** {line}
**Function:** {function}
**Reason:** {stop_reason}

### Stack Trace
{formatted_stack}

### Variables
{formatted_variables}

### Source Code
{source_code}
```

---

## Bug Investigation Templates

### Null Pointer Investigation

**Template:** `bug-investigate-null-001`

```
I suspect a null pointer bug in {FILE_NAME} around line {LINE_NUMBER}.

Investigation plan:
1. Set a breakpoint at the suspected location
2. Continue execution to hit the breakpoint
3. When stopped, examine all pointer variables
4. For each pointer:
   - Check if it's NULL (value == 0 or 0x0)
   - If not NULL, check the data it points to
5. Trace back to find where the pointer should have been initialized

Report:
- Which pointer is NULL
- Where it should have been initialized
- The call stack leading to the null dereference
- Recommended fix
```

### Buffer Overflow Investigation

**Template:** `bug-investigate-overflow-001`

```
I suspect a buffer overflow in {BUFFER_NAME}.

Investigation plan:
1. Set breakpoints at:
   - Buffer initialization
   - Each write to the buffer
   - Buffer read operations
2. At each breakpoint, collect:
   - Buffer size (buffer->Size)
   - Current index (buffer->Head or buffer->index)
   - Check: index >= size (overflow condition)
3. Continue through iterations until overflow detected

Report:
- The exact location where overflow occurs
- The values that cause the overflow
- The loop iteration count
- Recommended boundary check fix
```

### Race Condition Investigation

**Template:** `bug-investigate-race-001`

```
I suspect a race condition on {VARIABLE_NAME}.

Investigation plan:
1. Set a watchpoint on the variable (or breakpoint at each access)
2. Set breakpoint at all write locations
3. At each stop:
   - Record the thread ID
   - Record the old and new values
   - Record the call stack
4. Look for interleaved access patterns

Report:
- All locations that access the variable
- Which accesses are reads vs writes
- Thread IDs involved
- Recommended synchronization mechanism
```

### Memory Leak Investigation

**Template:** `bug-investigate-leak-001`

```
I suspect a memory leak in {MODULE_NAME}.

Investigation plan:
1. Set breakpoints at:
   - All allocation points (malloc, new, etc.)
   - All deallocation points (free, delete, etc.)
2. Track each allocation:
   - Record the returned pointer
   - Record the allocation size
   - Track if/when it's freed
3. After several iterations, check for:
   - Allocations without matching frees
   - Pointers that are overwritten before being freed

Report:
- List of leaked allocations (pointer, size, location)
- The code path that should have freed them
- Recommended fix
```

### FSM Logic Error Investigation

**Template:** `bug-investigate-fsm-001`

```
I suspect a logic error in the {FSM_NAME} state machine.

Investigation plan:
1. Set breakpoints at all state transition points
2. At each transition:
   - Record current state
   - Record the event/condition
   - Record the next state
   - Verify transition is valid per state diagram
3. Look for:
   - Missing transitions
   - Invalid state changes
   - Unreachable states

Report:
- The invalid transition that occurs
- The expected vs actual behavior
- The state diagram gap
- Recommended state machine fix
```

---

## Code Analysis Templates

### Function Call Analysis

**Template:** `analyze-calls-001`

```
Analyze the call hierarchy for {FUNCTION_NAME}.

Please:
1. Get all callers of this function (incoming calls)
2. Get all functions it calls (outgoing calls)
3. For each caller, note:
   - The call site location
   - Any conditions guarding the call
4. For each callee, note:
   - Whether it's called unconditionally
   - Any error handling

Output as a call tree:
{caller1} → {function_name} → {callee1}
                          → {callee2}
{caller2} → {function_name}
```

### Variable Usage Analysis

**Template:** `analyze-usage-001`

```
Analyze all uses of {VARIABLE_NAME} in {FILE_NAME}.

Please:
1. Find all references to this variable
2. Categorize each use:
   - Read (value is accessed)
   - Write (value is modified)
   - Address taken (&var)
3. For writes, note:
   - The old value (if available)
   - The new value
   - The condition triggering the write
4. Check for:
   - Uninitialized reads
   - Writes that are never read
   - Concurrent access without synchronization

Report:
- Complete usage map
- Any suspicious patterns
- Potential bugs
```

### Type Analysis

**Template:** `analyze-type-001`

```
Analyze the type structure of {TYPE_NAME}.

Please:
1. Get the full type definition
2. List all members with their types and offsets
3. Calculate total size
4. Check for:
   - Padding/alignment issues
   - Potential packing problems
   - Pointer members that need special handling

Output:
struct {type_name} {
  {member1}: {type}  // offset 0, size 4
  {member2}: {type}  // offset 4, size 8
  ...
};  // Total size: {size} bytes

Note any alignment or padding.
```

---

## Error Recovery Templates

### Session Lost Recovery

**Template:** `error-recovery-session-001`

```
The debug session was lost (error: "No active session").

Recovery plan:
1. Check proxy status: GET /api/status
2. If no session, relaunch:
   - Use the same binary path as before
   - Set stopOnEntry=true
3. Re-set all breakpoints from previous session
4. Resume from the last known location if possible

Report:
- Session recovered: yes/no
- New session ID
- Breakpoints restored
- Ready to continue debugging
```

### Operation Failed Recovery

**Template:** `error-recovery-operation-001`

```
The operation {OPERATION_NAME} failed with error: {ERROR_MESSAGE}.

Recovery plan:
1. Analyze the error message:
   - Is it a validation error? → Fix parameters
   - Is it a session error? → Check session status
   - Is it a debugger error? → Check debugger state
2. Retry with corrected parameters (up to 3 times)
3. If still failing, try:
   - Restart the session
   - Use alternative approach
4. Report failure if all recovery attempts fail

Report:
- Error analysis
- Recovery attempts made
- Final result or failure reason
```

### Timeout Recovery

**Template:** `error-recovery-timeout-001`

```
The operation timed out after {TIMEOUT_MS}ms.

Recovery plan:
1. Check if the debugger is stuck:
   - Get thread list
   - Check if all threads are stopped
2. If debugger is responsive:
   - Retry with longer timeout
3. If debugger is stuck:
   - Try to interrupt (Ctrl+C equivalent)
   - If still stuck, restart session
4. Log the operation that timed out for analysis

Report:
- Debugger state analysis
- Recovery action taken
- Operation result or failure
```

---

## Workflow Templates

### Complete Debug Workflow

**Template:** `workflow-complete-001`

```
I need to debug and fix a bug in {BINARY_NAME}.

Complete workflow:

## Phase 1: Setup
1. Launch debug session with stopOnEntry=true
2. Load source file locations
3. Identify suspected bug locations from symptoms

## Phase 2: Investigation
4. Set breakpoints at suspected locations
5. Continue to first breakpoint
6. Collect state (stack, variables, source)
7. Analyze and form hypothesis
8. Test hypothesis with additional breakpoints

## Phase 3: Root Cause
9. Narrow down to exact location
10. Identify the root cause
11. Collect evidence (variable values, conditions)

## Phase 4: Fix Verification
12. Describe the fix needed
13. (After fix is applied) Rebuild binary
14. Re-run debug session
15. Verify the fix resolves the issue

## Phase 5: Report
16. Generate bug report with:
    - Location and type
    - Root cause explanation
    - Evidence collected
    - Fix description
    - Prevention recommendations

Start with Phase 1. I'll confirm after each phase.
```

### Automated Bug Hunt

**Template:** `workflow-auto-hunt-001`

```
Automatically hunt for bugs in {MODULE_LIST}.

Automated workflow:

1. For each module in {MODULE_LIST}:
   a. Get list of functions (LSP symbols)
   b. For each function:
      - Set temp breakpoint at entry
      - Continue to hit breakpoint
      - Collect: function name, parameters, caller
      - Check for suspicious patterns:
        * NULL pointers
        * Out-of-bounds indices
        * Uninitialized variables
      - Remove temp breakpoint
   c. Report any suspicious findings

2. Prioritize findings by:
   - Critical: Crashes, memory corruption
   - High: Logic errors, wrong calculations
   - Medium: Edge cases, potential issues
   - Low: Style, potential improvements

3. For critical/high findings:
   - Deep dive with full debugging
   - Collect complete evidence
   - Generate detailed report

Run this workflow and provide a prioritized bug list.
```

### Regression Testing Workflow

**Template:** `workflow-regression-001`

```
Run regression testing on {TEST_SUITE}.

Workflow:

1. Build the project with debug symbols
2. Launch debug session
3. Set breakpoints at test entry points
4. For each test case:
   a. Continue to test start
   b. Set temp breakpoint at test end
   c. Continue
   d. At test end:
      - Check test result (pass/fail)
      - If failed, collect:
        * Stack trace
        * Failed assertion
        * Variable states
      - Generate failure report
   e. Remove temp breakpoint
5. After all tests:
   - Summary: passed/failed/total
   - Detailed failure analysis
   - Root cause hypotheses

Run this workflow and provide test results.
```

---

## Integration Examples

### Claude Code Integration

```bash
# Save as ~/.claude/commands/debug-prompt.sh
cat << 'EOF'
You are debugging {file} at line {line}.

Available commands:
- /debug launch {binary}
- /debug bp {file} {line} [condition]
- /debug continue
- /debug stack
- /debug eval {expression}
- /debug vars
- /debug source [lines]
- /debug quit

Current task: {task_description}

Start by launching the debug session and setting breakpoints.
EOF
```

### Cursor IDE Integration

```json
// .cursor/prompts/debug-bug.json
{
  "name": "Debug Bug",
  "description": "Interactive bug debugging session",
  "prompt": "You are an expert debugger. Help me find and fix the bug in {file}.\n\n1. First, launch a debug session\n2. Set breakpoints at suspected locations\n3. Step through the code\n4. Inspect variables at each step\n5. Identify the root cause\n6. Suggest a fix\n\nBinary: {binary}\nSuspected location: {file}:{line}\nSymptoms: {symptoms}"
}
```

---

## Related Documents

- [AI Agent Technical Guide](./guides/ai-agent-technical-guide.md)
- [CLI Debug Guide](./guides/cli-debug-guide.md)
- [API Reference](./guides/api-reference.md)

---

*This document follows the coding guidelines in DOC-CG-001.*
