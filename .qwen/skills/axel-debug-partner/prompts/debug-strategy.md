# Debug Strategy - Decision Logic

**Purpose:** Guide Axel's debug planning and decision-making process

---

## 🎯 Overview

This document defines the decision logic Axel uses to plan and execute debug strategies. It covers:
- When to set breakpoints
- When to step vs continue
- How to form and test hypotheses
- How to prioritize investigation paths

---

## 📊 Decision Flow

### Phase 1: Initial Assessment

**Trigger:** User requests debug assistance

```
INPUT: User request + current context

STEP 1: Context Detection
  ├─ Is there an active debug session?
  │   ├─ YES → Go to Phase 2 (State Analysis)
  │   └─ NO → Go to Phase 1B (Pre-Debug Analysis)
  │
STEP 1B: Pre-Debug Analysis
  ├─ What file is being debugged?
  ├─ What is the suspected issue?
  ├─ Has this been debugged before? (check memory)
  │
  ├─ [Analyze code for bug patterns]
  ├─ [Generate risk map]
  └─ [Propose initial breakpoints]
```

### Phase 2: State Analysis

**Trigger:** Debug session stopped at breakpoint

```
INPUT: Stop event (reason, location, thread info)

STEP 1: Parse Stop Info
  ├─ Stop reason: breakpoint | exception | step | pause
  ├─ Location: file, line, function
  ├─ Thread: which thread stopped
  └─ All threads stopped? yes/no

STEP 2: Quick Assessment
  ├─ Is this an expected stop location?
  │   ├─ YES → Continue to Step 3
  │   └─ NO → Trigger Session Guardian mode
  │
  ├─ Is this a critical location?
  │   ├─ YES → Full state inspection
  │   └─ NO → Lightweight inspection

STEP 3: State Inspection
  ├─ Get stack trace (ai_stack)
  ├─ Get current frame (ai_frame)
  ├─ Get variables (ai_vars)
  └─ Get arguments (ai_args)

STEP 4: Anomaly Detection
  ├─ Check for null pointers
  ├─ Check for out-of-range values
  ├─ Check for uninitialized patterns
  ├─ Check for overflow/underflow
  └─ Generate anomaly report

OUTPUT: State analysis report + hypotheses
```

### Phase 3: Hypothesis Formation

**Trigger:** State analysis complete

```
INPUT: State analysis report

STEP 1: Pattern Matching
  For each anomaly detected:
    ├─ Match against bug patterns knowledge base
    ├─ Calculate confidence score (0.0 - 1.0)
    └─ Rank hypotheses by confidence

STEP 2: Evidence Gathering
  For top hypothesis:
    ├─ What evidence supports this?
    ├─ What evidence contradicts this?
    ├─ What additional data is needed?
    └─ Generate evidence score

STEP 3: Hypothesis Statement
  Format:
    "Hypothesis: [bug type] do [root cause]
     
     Evidence:
       - [supporting evidence 1]
       - [supporting evidence 2]
     
     Confidence: [score]%"

OUTPUT: Ranked hypotheses with evidence
```

### Phase 4: Investigation Planning

**Trigger:** Hypotheses formed

```
INPUT: Top hypothesis + state context

STEP 1: Determine Investigation Path
  
  IF hypothesis involves function logic:
    → Plan: Step into function, inspect internals
  
  IF hypothesis involves data corruption:
    → Plan: Set watchpoints, trace data flow
  
  IF hypothesis involves timing/race condition:
    → Plan: Set breakpoints at critical sections,
            check shared resource access
  
  IF hypothesis involves memory issues:
    → Plan: Inspect memory layout, check bounds,
            track allocations/frees

STEP 2: Generate Step-by-Step Plan
  
  Example Plan:
    1. Step into ring_write() [verify wrap logic]
    2. Inspect 'head' variable [check bounds]
    3. Continue to next iteration [observe pattern]
    4. Set watchpoint on ring->tail [detect corruption]

STEP 3: Request Approval
  
  Output:
    "Next steps:
     1. [Step 1]
     2. [Step 2]
     3. [Step 3]
     
     Execute? (Y/n)"

OUTPUT: Approved investigation plan
```

### Phase 5: Plan Execution

**Trigger:** User approval received

```
INPUT: Approved plan

STEP 1: Execute Step 1
  ├─ Perform operation (CLI call)
  ├─ Check result
  └─ If failed → Report error, request new direction

STEP 2: Observe Result
  ├─ Did execution stop as expected?
  ├─ What changed in state?
  └─ Any new anomalies?

STEP 3: Update Hypothesis
  ├─ Does new evidence support hypothesis?
  │   ├─ YES → Increase confidence
  │   └─ NO → Decrease confidence
  │
  ├─ Confidence > 90%?
  │   ├─ YES → Go to Phase 6 (Conclusion)
  │   └─ NO → Continue to next step

STEP 4: Next Step?
  ├─ More steps in plan?
  │   ├─ YES → Execute Step N+1
  │   └─ NO → Generate new hypothesis, go to Phase 4

OUTPUT: Updated hypothesis + evidence
```

### Phase 6: Conclusion

**Trigger:** Hypothesis confidence > 90%

```
INPUT: Confirmed hypothesis

STEP 1: Root Cause Statement
  
  Format:
    "Root Cause: [clear statement]
     
     Location: [file:line]
     
     Evidence:
       - [evidence 1]
       - [evidence 2]
     
     Impact: [what does this affect]"

STEP 2: Suggest Fix (Optional)
  
  Format:
    "Suggested Fix:
     [code change description]
     
     Example:
     [code snippet]"

STEP 3: Offer Next Actions
  
  Options:
    - Continue debugging (find more bugs)
    - Apply fix and retest
    - Document findings
    - End session

OUTPUT: Bug report + suggestions
```

---

## 🎯 Decision Rules

### When to Set Breakpoints

**ALWAYS Set Breakpoint:**
- At function entry where crash occurs
- Before suspicious pointer operations
- At shared resource access in concurrent code
- At loop boundaries in complex iterations

**CONDITIONALLY Set Breakpoint:**
- After state changes (if state machine debugging)
- Before/after memory allocations (if leak hunting)
- At error handling paths (if error propagation unclear)

**DON'T Set Breakpoint:**
- In already-verified correct code
- In library code (unless bug is suspected there)
- At every line (inefficient)

### When to Step

**Step INTO:**
- Functions you wrote (might have bugs)
- Functions called with suspicious arguments
- Functions that modify corrupted data

**Step OVER:**
- Library functions (printf, memcpy, etc.)
- Functions already verified correct
- Inline functions (you see the code anyway)

**Step OUT:**
- When you're in code known to be correct
- After stepping into wrong function
- To quickly return to caller

### When to Continue

**Continue:**
- When you want to reach next breakpoint fast
- When testing if bug reproduces
- When you've set up all observation points

**Don't Continue:**
- When you haven't finished inspecting current state
- When you're unsure about current location
- When you need to understand the flow first

### When to Inspect Variables

**ALWAYS Inspect:**
- Function arguments at entry
- Return values before use
- Loop counters and conditions
- Pointers before dereference

**INSPECT When Relevant:**
- Variables involved in bug hypothesis
- Shared variables in concurrent code
- State variables in state machines
- Accumulators in loops

**DON'T Inspect:**
- Every variable (waste of time)
- Variables unrelated to current investigation
- Constants and literals

---

## 🔍 Bug Pattern Decision Trees

### Ring Buffer Overflow

```
Symptoms:
  - Data corruption in buffer
  - head/tail indices look wrong
  - Buffer overwrites old data incorrectly

Decision Tree:
  1. Check head index value
     ├─ head >= buffer_size?
     │   ├─ YES → Missing wrap-around logic
     │   └─ NO → Continue
     │
  2. Check tail index value
     ├─ tail >= buffer_size?
     │   ├─ YES → Missing wrap-around logic
     │   └─ NO → Continue
     │
  3. Check head-tail relationship
     ├─ head == tail but buffer not empty?
     │   ├─ YES → Wrap-around detection bug
     │   └─ NO → Continue
     │
  4. Check write operation
     ├─ Is bounds check performed before write?
     │   ├─ NO → Missing bounds check
     │   └─ YES → Check read operation

Investigation Steps:
  1. Set BP at ring_write() entry
  2. Inspect head, tail, size
  3. Step through write logic
  4. Check wrap-around calculation
```

### Race Condition

```
Symptoms:
  - Bug appears intermittently
  - Different behavior with/without debugger
  - Data corruption in shared variables

Decision Tree:
  1. Identify shared resources
     ├─ Which variables are accessed by multiple threads/ISRs?
     │
  2. Check access protection
     ├─ Are accesses protected by mutex/semaphore?
     │   ├─ NO → Potential race condition
     │   └─ YES → Check for deadlock
     │
  3. Check volatile keyword
     ├─ Is shared variable marked volatile?
     │   ├─ NO → Compiler might optimize incorrectly
     │   └─ YES → Continue
     │
  4. Check atomicity
     ├─ Are operations atomic (read-modify-write)?
     │   ├─ NO → Race condition likely
     │   └─ YES → Check for other issues

Investigation Steps:
  1. Set BP at all access points to shared variable
  2. Watch variable value changes
  3. Check which thread/ISR is accessing
  4. Look for unprotected access
```

### Stack Overflow

```
Symptoms:
  - Crash with no clear cause
  - Corrupted local variables
  - Return address overwritten

Decision Tree:
  1. Check call depth
     ├─ How deep is the call stack?
     │   ├─ > 20 frames → Suspicious
     │   └─ Normal → Continue
     │
  2. Check for recursion
     ├─ Does function call itself (directly or indirectly)?
     │   ├─ YES → Check termination condition
     │   └─ NO → Continue
     │
  3. Check local variable sizes
     ├─ Are there large local arrays?
     │   ├─ YES → Stack space exhaustion
     │   └─ NO → Continue
     │
  4. Check stack size configuration
     ├─ Is stack size sufficient for worst case?
     │   ├─ NO → Increase stack size
     │   └─ YES → Look for other causes

Investigation Steps:
  1. Get stack trace (ai_stack)
  2. Count frames and estimate stack usage
  3. Check for recursive patterns
  4. Inspect local variable sizes
```

### Use-After-Free

```
Symptoms:
  - Random crashes
  - Data corruption after free
  - Different behavior in debug vs release

Decision Tree:
  1. Identify pointer usage pattern
     ├─ Where is memory allocated?
     ├─ Where is it freed?
     └─ Where is it accessed after free?
     │
  2. Check pointer lifecycle
     ├─ Is pointer set to NULL after free?
     │   ├─ NO → Dangling pointer risk
     │   └─ YES → Continue
     │
  3. Check all code paths
     ├─ Are there paths where free is called but pointer still used?
     │   ├─ YES → Use-after-free bug
     │   └─ NO → Continue
     │
  4. Check aliasing
     ├─ Are there multiple pointers to same memory?
     │   ├─ YES → One might be used after other frees
     │   └─ NO → Look for other causes

Investigation Steps:
  1. Set watchpoint on pointer variable
  2. Track all assignments
  3. Set BP at free() call
  4. Check for subsequent dereference
```

---

## 📋 Session Restore Logic

### When to Restore

**Trigger Conditions:**
- Breakpoint hit at unexpected location
- User manually stopped at wrong place
- Debug session needs to be re-run from specific point

### Restore Algorithm

```
INPUT: Target position (file, line)

STEP 1: Save Current State
  current_pos = get_current_position()
  current_bps = get_all_breakpoints()

STEP 2: Restart Session
  ai_restart()
  Wait for session to be ready

STEP 3: Restore Breakpoints
  For each bp in current_bps:
    ai_bp(bp.file, bp.line, bp.condition)

STEP 4: Set Temporary Breakpoint
  ai_tbp(target.file, target.line)

STEP 5: Continue Execution
  ai_continue()
  Wait for stop

STEP 6: Verify Position
  new_pos = get_current_position()
  
  IF new_pos == target:
    ✓ Success
  ELSE:
    ✗ Failed to restore
    Report error

OUTPUT: Session restored to target position
```

---

## 🎯 Quality Gates

### Before Setting Breakpoint
- [ ] Is this location relevant to current hypothesis?
- [ ] Will this breakpoint provide useful information?
- [ ] Is there already a breakpoint at this location?

### Before Stepping
- [ ] Do I understand the current state?
- [ ] Is stepping the most efficient action?
- [ ] Do I know what I'm looking for?

### Before Continuing
- [ ] Have I finished inspecting current state?
- [ ] Are the right breakpoints set?
- [ ] Do I know what I expect to happen?

### Before Concluding
- [ ] Is confidence > 90%?
- [ ] Is there contradictory evidence?
- [ ] Have I tested alternative hypotheses?

---

*This document guides Axel's debug decision-making. Follow it systematically.*
