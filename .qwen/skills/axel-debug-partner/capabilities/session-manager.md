# Capability: Session Manager

**Purpose:** Track and restore debug session state

**Type:** Internal Capability
**Implementation:** State tracking + CLI operations

---

## 🎯 Overview

Session Manager is responsible for:
- Tracking current debug session state
- Saving user position (file:line)
- Restoring session after restart
- Managing breakpoint state across restarts

**Why Needed:**
- Debug sessions can end unexpectedly
- User might need to restart and return to same position
- Breakpoints need to be restored after restart
- Session continuity for better UX

---

## 📊 State Structure

### SessionState Interface

```typescript
interface SessionState {
    // Current position
    currentPosition: FilePosition | null;
    
    // Session info
    sessionId: string | null;
    sessionActive: boolean;
    lastStopReason: string | null;
    
    // Breakpoints
    breakpoints: Breakpoint[];
    
    // History
    positionHistory: FilePosition[];
    variableHistory: VariableSnapshot[];
    
    // Timestamps
    lastUpdated: number;
}

interface FilePosition {
    file: string;        // Absolute path or relative to workspace
    line: number;        // 1-based line number
    column?: number;     // Optional column
    function?: string;   // Current function name
}

interface Breakpoint {
    id?: string;
    file: string;
    line: number;
    condition?: string;
    enabled: boolean;
    hitCount?: number;
}

interface VariableSnapshot {
    timestamp: number;
    position: FilePosition;
    variables: Variable[];
}

interface Variable {
    name: string;
    value: string;
    type: string;
}
```

---

## 🔧 Operations

### Save Current Position

**Purpose:** Store current debug position

**Algorithm:**
```typescript
async saveCurrentPosition(): Promise<void> {
    // 1. Get current frame
    const frame = await this.cliClient.getFrame();
    
    // 2. Create position object
    const position: FilePosition = {
        file: frame.path,
        line: frame.line,
        function: frame.function
    };
    
    // 3. Save to state
    this.state.currentPosition = position;
    this.state.lastUpdated = Date.now();
    
    // 4. Add to history
    this.state.positionHistory.push(position);
    if (this.state.positionHistory.length > 50) {
        this.state.positionHistory.shift(); // Keep last 50 positions
    }
    
    // 5. Log for debugging
    logger.info(`Position saved: ${position.file}:${position.line}`);
}
```

**Usage:**
```typescript
// Auto-save on every stop
axel.on('debug_stop', async () => {
    await sessionManager.saveCurrentPosition();
});
```

---

### Restore Session

**Purpose:** Restart debug session and return to saved position

**Algorithm:**
```typescript
async restoreSession(targetPosition?: FilePosition): Promise<void> {
    // 1. Get target position (use saved if not provided)
    const target = targetPosition || this.state.currentPosition;
    if (!target) {
        throw new Error('No saved position to restore');
    }
    
    // 2. Save current breakpoints
    const breakpoints = await this.cliClient.getBreakpoints();
    
    // 3. Restart session
    logger.info('Restarting debug session...');
    await this.cliClient.restart();
    
    // Wait for session to be ready
    await this.waitForSessionReady();
    
    // 4. Restore breakpoints
    logger.info(`Restoring ${breakpoints.length} breakpoints...`);
    for (const bp of breakpoints) {
        await this.cliClient.setBreakpoint(bp.file, bp.line, bp.condition);
    }
    
    // 5. Set temporary breakpoint at target position
    logger.info(`Setting temp BP at ${target.file}:${target.line}`);
    await this.cliClient.setTempBreakpoint(target.file, target.line);
    
    // 6. Continue execution
    logger.info('Continuing to target position...');
    await this.cliClient.continue();
    
    // 7. Verify position
    const currentFrame = await this.cliClient.getFrame();
    if (currentFrame.line === target.line && 
        currentFrame.path.endsWith(target.file)) {
        logger.info(`✓ Session restored to ${target.file}:${target.line}`);
    } else {
        logger.warn(`⚠ Position mismatch: expected ${target.file}:${target.line}, got ${currentFrame.file}:${currentFrame.line}`);
    }
}
```

**Usage:**
```typescript
// User requests restore
user: "I overshot the breakpoint, can you go back?"

axel: "Tôi sẽ restart và quay lại vị trí của bạn."
await sessionManager.restoreSession();
```

---

### Get Current Position

**Purpose:** Retrieve current debug position

**Implementation:**
```typescript
async getCurrentPosition(): Promise<FilePosition | null> {
    try {
        const frame = await this.cliClient.getFrame();
        return {
            file: frame.path,
            line: frame.line,
            function: frame.function
        };
    } catch (error) {
        logger.warn('Failed to get current position:', error);
        return null;
    }
}
```

---

### Get Position History

**Purpose:** Get list of recently visited positions

**Implementation:**
```typescript
getPositionHistory(): FilePosition[] {
    return [...this.state.positionHistory].reverse(); // Most recent first
}

getLastNPositions(n: number): FilePosition[] {
    return this.getPositionHistory().slice(0, n);
}
```

**Usage:**
```typescript
// Show recent positions
const recent = sessionManager.getLastNPositions(5);
console.log('Recent positions:');
recent.forEach((pos, i) => {
    console.log(`  ${i + 1}. ${pos.file}:${pos.line} (${pos.function})`);
});
```

---

### Save Variable Snapshot

**Purpose:** Capture variable state at current position

**Algorithm:**
```typescript
async saveVariableSnapshot(): Promise<void> {
    const position = await this.getCurrentPosition();
    if (!position) return;
    
    const variables = await this.cliClient.getVariables();
    
    const snapshot: VariableSnapshot = {
        timestamp: Date.now(),
        position,
        variables: variables.map(v => ({
            name: v.name,
            value: v.value,
            type: v.type
        }))
    };
    
    this.state.variableHistory.push(snapshot);
    
    // Keep last 100 snapshots
    if (this.state.variableHistory.length > 100) {
        this.state.variableHistory.shift();
    }
}
```

---

### Compare Variable Snapshots

**Purpose:** Detect changes between snapshots

**Implementation:**
```typescript
compareSnapshots(before: VariableSnapshot, after: VariableSnapshot): VariableChange[] {
    const changes: VariableChange[] = [];
    
    const beforeMap = new Map(before.variables.map(v => [v.name, v]));
    const afterMap = new Map(after.variables.map(v => [v.name, v]));
    
    // Check for changed variables
    for (const [name, afterVar] of afterMap) {
        const beforeVar = beforeMap.get(name);
        if (!beforeVar) {
            changes.push({ name, change: 'added', after: afterVar.value });
        } else if (beforeVar.value !== afterVar.value) {
            changes.push({
                name,
                change: 'modified',
                before: beforeVar.value,
                after: afterVar.value
            });
        }
    }
    
    // Check for removed variables
    for (const [name, beforeVar] of beforeMap) {
        if (!afterMap.has(name)) {
            changes.push({ name, change: 'removed', before: beforeVar.value });
        }
    }
    
    return changes;
}
```

**Usage:**
```typescript
// Track variable changes during step
await sessionManager.saveVariableSnapshot();
await axel.stepIn();
const newSnapshot = await sessionManager.captureVariableSnapshot();
const changes = sessionManager.compareSnapshots(lastSnapshot, newSnapshot);

console.log('Variable changes:');
changes.forEach(c => {
    if (c.change === 'modified') {
        console.log(`  ${c.name}: ${c.before} → ${c.after}`);
    }
});
```

---

## 🎯 Session Guardian Mode

### Automatic Position Tracking

**Trigger:** Every debug stop event

**Behavior:**
```typescript
class SessionGuardian {
    private sessionManager: SessionManager;
    
    async onDebugStop(): Promise<void> {
        // 1. Save position
        await this.sessionManager.saveCurrentPosition();
        
        // 2. Check if this is expected position
        const expectedPos = this.getLastExpectedPosition();
        const currentPos = await this.sessionManager.getCurrentPosition();
        
        if (expectedPos && !this.isExpectedPosition(currentPos, expectedPos)) {
            // 3. Unexpected position - offer to restore
            console.log(`⚠ Stopped at ${currentPos.file}:${currentPos.line}`);
            console.log(`  Expected: ${expectedPos.file}:${expectedPos.line}`);
            console.log(`  Restore to expected position? (y/n)`);
        }
    }
    
    private isExpectedPosition(current: FilePosition, expected: FilePosition): boolean {
        return current.line === expected.line && 
               current.file.endsWith(expected.file);
    }
}
```

---

### Automatic Breakpoint Lố Detection

**Trigger:** After continue/step operation

**Logic:**
```typescript
async detectOvershoot(): Promise<boolean> {
    const expectedPos = this.state.expectedPosition;
    if (!expectedPos) return false;
    
    const currentPos = await this.getCurrentPosition();
    
    // Check if we're at expected position
    if (currentPos.line === expectedPos.line && 
        currentPos.file.endsWith(expectedPos.file)) {
        return false; // Correct position
    }
    
    // Check if we've passed it (simplified heuristic)
    if (currentPos.file.endsWith(expectedPos.file) && 
        currentPos.line > expectedPos.line) {
        return true; // Overshot
    }
    
    return false; // Different location
}
```

**Response:**
```typescript
if (await detectOvershoot()) {
    console.log('⚠ Breakpoint lố rồi.');
    console.log('  Tôi sẽ restart và quay lại vị trí của bạn.');
    await this.restoreSession();
}
```

---

## 📋 Persistence

### Save State to Disk

**Purpose:** Preserve session state across VS Code restarts

**Implementation:**
```typescript
import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.join(__dirname, '..', 'session-state.json');

async saveStateToFile(): Promise<void> {
    const stateJson = JSON.stringify(this.state, null, 2);
    fs.writeFileSync(STATE_FILE, stateJson);
    logger.debug('Session state saved to', STATE_FILE);
}

async loadStateFromFile(): Promise<void> {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const stateJson = fs.readFileSync(STATE_FILE, 'utf-8');
            this.state = JSON.parse(stateJson);
            logger.info('Session state loaded from', STATE_FILE);
        }
    } catch (error) {
        logger.warn('Failed to load session state:', error);
    }
}
```

---

## 🛡️ Error Handling

### Session Not Ready
```typescript
async waitForSessionReady(timeoutMs: number = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const status = await this.cliClient.getSessionStatus();
        if (status.hasActiveSession) {
            return;
        }
        await sleep(100);
    }
    throw new Error('Session not ready after timeout');
}
```

### Restore Failed
```typescript
async restoreSession(targetPosition: FilePosition): Promise<void> {
    try {
        await this._restoreSession(targetPosition);
    } catch (error) {
        logger.error('Session restore failed:', error);
        console.log('⚠ Không thể restore session.');
        console.log('  Vui lòng restart debug thủ công.');
    }
}
```

---

## 🎯 Best Practices

### DO:
- Save position on every stop
- Restore breakpoints after restart
- Verify position after restore
- Keep position history for debugging
- Handle restore failures gracefully

### DON'T:
- Assume session is always ready
- Forget to restore breakpoints
- Restore to invalid positions
- Keep unlimited history (memory leak)

---

## 📊 Performance Notes

- **Save position:** ~50ms (CLI call)
- **Restore session:** ~500ms (restart + continue)
- **State file size:** ~10-50KB (depending on history)
- **Recommendation:** Limit history to 50 positions, 100 snapshots

---

*This capability enables Axel to track and restore debug session state seamlessly*
