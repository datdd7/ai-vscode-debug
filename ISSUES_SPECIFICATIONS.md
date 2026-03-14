# AI VSCode Debug Extension - Issues Specifications

**Date:** March 13, 2026  
**Version:** 0.1.4 (extension), 0.1.2-beta (proxy)  
**Purpose:** Detailed technical specifications for fixing reported issues

---

## 📊 ISSUE PRIORITY MATRIX

| Issue | Severity | Impact | Effort | Priority | Sprint |
|-------|----------|--------|--------|----------|--------|
| **AIVS-006** | 🔴 High | Debug opens wrong window | Medium | **P0** | Sprint 1 |
| **AIVS-002** | 🟡 Medium | Poor error messages | Low | **P1** | Sprint 2 |
| **AIVS-005** | 🟢 Low | Inefficient API | Medium | **P2** | Sprint 3 |

---

## 🔴 Issue AIVS-006: Multi-window Targeting (HIGH PRIORITY)

### Problem Statement
```
Khi có nhiều VSCode windows mở, debug session mở nhầm window thay vì đúng workspace.
```

### Reproduction Steps
```bash
# Step 1: Mở VSCode Window 1 tại /project-A
code /home/datdang/working/common_dev/embedded_hsm

# Step 2: Mở VSCode Window 2 tại /project-B  
code /home/datdang/working/common_dev/ai_vscode_debug

# Step 3: Call API debug cho project-A
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "launch",
    "params": {
      "program": "/home/datdang/working/common_dev/embedded_hsm/build/ehsm_host"
    }
  }'

# Expected: Debug session mở ở Window 1 (embedded_hsm)
# Actual: ❌ Debug session mở ở Window 2 (ai_vscode_debug) - SAI!
```

### Root Cause Analysis
Extension hiện tại **KHÔNG CÓ** mechanism để:
1. ❌ List available VSCode windows
2. ❌ Target specific window by workspace path
3. ❌ Validate window before launching debug session
4. ❌ Store window-session mapping

### Architecture Issue
```
Current Flow:
  API Request → Extension → Find ANY VSCode window → Launch
                                  ❌ Wrong!

Expected Flow:
  API Request → Extension → Find SPECIFIC window → Validate → Launch
                                  ✅ Correct!
```

### Proposed Solution: Option A (RECOMMENDED)

**Add `workspace` parameter**

```json
// NEW API Request Format
{
  "operation": "launch",
  "params": {
    "workspace": "/home/datdang/working/common_dev/embedded_hsm",
    "program": "./build/ehsm_host",
    "cwd": "/home/datdang/working/common_dev/embedded_hsm",
    "MIMode": "gdb",
    "miDebuggerPath": "/usr/bin/gdb",
    "stopOnEntry": true
  }
}
```

**Implementation Code:**
```typescript
// File: src/debug-adapter.ts

async launch(params: LaunchParams) {
  // Step 1: Validate workspace parameter
  if (!params.workspace) {
    throw new Error('WORKSPACE_REQUIRED: workspace parameter is required');
  }
  
  // Step 2: Find VSCode window with matching workspace
  const windows = vscode.workspace.workspaceFolders;
  const targetWindow = windows.find(w => w.uri.fsPath === params.workspace);
  
  if (!targetWindow) {
    throw new Error(
      `WORKSPACE_NOT_FOUND: No window with workspace "${params.workspace}"`
    );
  }
  
  // Step 3: Activate target window
  await vscode.window.showTextDocument(
    vscode.Uri.file(params.program),
    { viewColumn: vscode.ViewColumn.One }
  );
  
  // Step 4: Launch debug session in target window
  await vscode.debug.startDebugging(targetWindow, {
    type: 'cppdbg',
    request: 'launch',
    program: params.program,
    cwd: params.cwd,
    MIMode: 'gdb',
    miDebuggerPath: params.miDebuggerPath,
    stopOnEntry: params.stopOnEntry
  });
  
  return { success: true, windowId: targetWindow.name };
}
```

### Implementation Checklist

- [ ] **Phase 1:** Add `workspace` parameter validation
- [ ] **Phase 2:** Implement window finding logic
- [ ] **Phase 3:** Add window activation
- [ ] **Phase 4:** Update API documentation
- [ ] **Phase 5:** Add test cases for multi-window scenario
- [ ] **Phase 6:** Update error messages for workspace issues

### Workaround (Current)
```bash
# Close all VSCode windows except target
pkill -f code

# Open ONLY the target project window
code /home/datdang/working/common_dev/embedded_hsm

# Now launch debug session
curl -X POST http://localhost:9999/api/debug ...
```

---

## 🟡 Issue AIVS-002: Unclear Error Messages (MEDIUM PRIORITY)

### Problem Statement
```
Error message "Failed to start debug session" quá chung chung, không giúp user resolve issue.
```

### Current Behavior
```json
// Case 1: Binary not found
{
  "success": false,
  "errorMessage": "Failed to start debug session"  // ❌ TOO GENERIC
}

// Case 2: GDB not found
{
  "success": false,
  "errorMessage": "Failed to start debug session"  // ❌ SAME MESSAGE
}

// Case 3: Invalid config
{
  "success": false,
  "errorMessage": "Failed to start debug session"  // ❌ NO HINT
}
```

### Expected Behavior
```json
// Case 1: Binary not found
{
  "success": false,
  "error": {
    "code": "BINARY_NOT_FOUND",
    "message": "Binary not found: ./build/ehsm_host",
    "suggestion": "Have you built the project? Run: cmake --build build",
    "details": {
      "path": "/home/datdang/working/common_dev/embedded_hsm/build/ehsm_host",
      "exists": false
    }
  }
}

// Case 2: GDB not found
{
  "success": false,
  "error": {
    "code": "GDB_NOT_FOUND",
    "message": "GDB debugger not found: /usr/bin/gdb",
    "suggestion": "Install GDB: sudo apt-get install gdb",
    "details": {
      "path": "/usr/bin/gdb",
      "exists": false
    }
  }
}
```

### Implementation Steps

**Step 1: Define Error Codes**
```typescript
// File: src/types/errors.ts

export enum DebugErrorCode {
  // File system errors
  BINARY_NOT_FOUND = 'BINARY_NOT_FOUND',
  GDB_NOT_FOUND = 'GDB_NOT_FOUND',
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  
  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  
  // Session errors
  SESSION_ALREADY_ACTIVE = 'SESSION_ALREADY_ACTIVE',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  
  // Operation errors
  OPERATION_FAILED = 'OPERATION_FAILED',
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED'
}

export class DebugError extends Error {
  constructor(
    public code: DebugErrorCode,
    message: string,
    public suggestion?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'DebugError';
  }
}
```

**Step 2: Add Validation Layer**
```typescript
// File: src/debug-adapter.ts

async launch(params: LaunchParams) {
  // Validate binary exists
  if (!fs.existsSync(params.program)) {
    throw new DebugError(
      DebugErrorCode.BINARY_NOT_FOUND,
      `Binary not found: ${params.program}`,
      `Have you built the project? Run: cmake --build build`,
      { path: params.program, exists: false }
    );
  }
  
  // Validate GDB exists
  if (params.miDebuggerPath && !fs.existsSync(params.miDebuggerPath)) {
    throw new DebugError(
      DebugErrorCode.GDB_NOT_FOUND,
      `GDB debugger not found: ${params.miDebuggerPath}`,
      `Install GDB: sudo apt-get install gdb`,
      { path: params.miDebuggerPath, exists: false }
    );
  }
  
  // Validate workspace exists
  if (params.cwd && !fs.existsSync(params.cwd)) {
    throw new DebugError(
      DebugErrorCode.WORKSPACE_NOT_FOUND,
      `Workspace not found: ${params.cwd}`,
      `Check that the path is correct`,
      { path: params.cwd, exists: false }
    );
  }
  
  // Validate required parameters
  if (!params.program) {
    throw new DebugError(
      DebugErrorCode.MISSING_PARAMETER,
      `Missing required parameter: program`,
      `Add 'program' field to params object`,
      { missingField: 'program' }
    );
  }
  
  // ... proceed with launch
}
```

**Step 3: Update Error Response Format**
```typescript
// File: src/api-server.ts

app.post('/api/debug', async (req, res) => {
  try {
    const result = await debugAdapter.execute(req.body.operation, req.body.params);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof DebugError) {
      res.status(400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          suggestion: error.suggestion,
          details: error.details
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }
  }
});
```

### Implementation Checklist

- [ ] **Phase 1:** Define DebugErrorCode enum
- [ ] **Phase 2:** Create DebugError class
- [ ] **Phase 3:** Add validation for binary path
- [ ] **Phase 4:** Add validation for GDB path
- [ ] **Phase 5:** Add validation for workspace
- [ ] **Phase 6:** Update error response format
- [ ] **Phase 7:** Update API documentation
- [ ] **Phase 8:** Add test cases for each error code

---

## 🟢 Issue AIVS-005: No Batch Breakpoint API (LOW PRIORITY)

### Problem Statement
```
Phải call API nhiều lần để set nhiều breakpoints, gây inefficient và verbose.
```

### Current Behavior
```bash
# Set 3 breakpoints - cần 3 separate API calls
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"set_breakpoint","params":{"file":"main.cpp","line":10}}'

curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"set_breakpoint","params":{"file":"main.cpp","line":20}}'

curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"set_breakpoint","params":{"file":"main.cpp","line":30}}'

# Total: 3 HTTP requests, 3 responses
```

### Expected Behavior
```bash
# Set 3 breakpoints - chỉ cần 1 API call
curl -X POST http://localhost:9999/api/debug \
  -d '{
    "operation": "set_breakpoints",
    "params": {
      "file": "main.cpp",
      "breakpoints": [
        {"line": 10, "condition": null},
        {"line": 20, "condition": "x > 5"},
        {"line": 30, "condition": null}
      ]
    }
  }'

# Response:
{
  "success": true,
  "data": {
    "breakpoints": [
      {"id": 1, "line": 10, "verified": true},
      {"id": 2, "line": 20, "verified": true, "condition": "x > 5"},
      {"id": 3, "line": 30, "verified": true}
    ]
  }
}

# Total: 1 HTTP request, 1 response with all results
```

### Implementation Steps

**Step 1: Define Batch Breakpoint Types**
```typescript
// File: src/types/breakpoints.ts

export interface BreakpointParams {
  line: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}

export interface BreakpointResult {
  id: number;
  line: number;
  verified: boolean;
  condition?: string;
  hitCondition?: string;
  source?: string;
}

export interface SetBreakpointsParams {
  file: string;
  breakpoints: BreakpointParams[];
}

export interface SetBreakpointsResult {
  breakpoints: BreakpointResult[];
}
```

**Step 2: Implement Batch Operation**
```typescript
// File: src/debug-adapter.ts

async setBreakpoints(params: SetBreakpointsParams): Promise<SetBreakpointsResult> {
  const results: BreakpointResult[] = [];
  
  for (const bp of params.breakpoints) {
    const result = await this.setBreakpoint(
      params.file,
      bp.line,
      bp.column,
      bp.condition,
      bp.hitCondition,
      bp.logMessage
    );
    results.push(result);
  }
  
  return { breakpoints: results };
}

// Update operation router
async execute(operation: string, params: any) {
  switch (operation) {
    case 'set_breakpoint':
      return await this.setBreakpoint(params.file, params.line, ...);
    
    case 'set_breakpoints':  // NEW: Batch operation
      return await this.setBreakpoints(params as SetBreakpointsParams);
    
    // ... other operations
  }
}
```

### Implementation Checklist

- [ ] **Phase 1:** Define BreakpointParams and BreakpointResult types
- [ ] **Phase 2:** Implement setBreakpoints() method
- [ ] **Phase 3:** Add operation router case for 'set_breakpoints'
- [ ] **Phase 4:** Update API documentation
- [ ] **Phase 5:** Add test cases for batch operations
- [ ] **Phase 6:** Add performance benchmarks

---

## 📅 IMPLEMENTATION SCHEDULE

### Sprint 1: Fix AIVS-006 (Multi-window) - 2-3 days
- [ ] Add `workspace` parameter validation
- [ ] Implement window finding logic
- [ ] Add window activation
- [ ] Test with multiple windows
- **Deliverable:** Multi-window targeting works correctly

### Sprint 2: Fix AIVS-002 (Error Messages) - 1-2 days
- [ ] Define DebugErrorCode enum
- [ ] Create DebugError class
- [ ] Add validation layer
- [ ] Update error response format
- **Deliverable:** Clear, actionable error messages

### Sprint 3: Implement AIVS-005 (Batch API) - 2-3 days
- [ ] Define breakpoint types
- [ ] Implement batch operation
- [ ] Update documentation
- [ ] Add test cases
- **Deliverable:** Efficient batch breakpoint API

---

## 📝 NOTES FOR DEVELOPERS

### Code Style
- ✅ Use TypeScript strict mode
- ✅ Follow existing code conventions
- ✅ Add JSDoc comments for all public APIs
- ✅ Write unit tests for all new functions

### Testing Requirements
- ✅ All new features must have unit tests
- ✅ Integration tests for multi-window scenarios
- ✅ Manual testing checklist for each issue

### Documentation Updates
- ✅ Update API reference docs
- ✅ Add examples to all new endpoints
- ✅ Update troubleshooting guide
- ✅ Add migration guide for breaking changes

---

**Last Updated:** March 13, 2026  
**Next Review:** After Sprint 1 completion
