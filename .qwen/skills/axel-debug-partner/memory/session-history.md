# Memory: Session History

**Purpose:** Persistent storage for debug session history

**Type:** Memory System Component
**Storage:** JSON file + in-memory cache

---

## 🎯 Overview

Session History memory stores:
- Last debug session position
- Breakpoint history
- Variable inspection history
- Debug workflow state
- User interaction history

**Retention:**
- In-memory: Current VS Code session
- File-based: Across sessions (configurable)

---

## 📊 Data Structure

### SessionHistory Schema

```json
{
  "version": "1.0",
  "lastUpdated": "2026-03-17T10:30:00.000Z",
  "sessions": [
    {
      "sessionId": "abc123",
      "startTime": "2026-03-17T10:00:00.000Z",
      "endTime": "2026-03-17T10:30:00.000Z",
      "binary": "/path/to/build/app",
      "workspace": "/path/to/workspace",
      "finalPosition": {
        "file": "main.c",
        "line": 42,
        "function": "main"
      },
      "breakpoints": [
        {
          "file": "main.c",
          "line": 42,
          "condition": null,
          "hitCount": 3
        }
      ],
      "variablesInspected": [
        {
          "name": "temperature",
          "value": "95",
          "type": "int",
          "timestamp": "2026-03-17T10:15:00.000Z"
        }
      ],
      "hypotheses": [
        {
          "description": "Ring buffer overflow",
          "confidence": 0.85,
          "evidence": ["head >= size", "data corruption"],
          "status": "confirmed"
        }
      ],
      "outcome": {
        "bugFound": true,
        "rootCause": "Missing wrap-around logic in ring_write()",
        "location": "ring_buffer.c:25",
        "fixApplied": false
      }
    }
  ],
  "userPreferences": {
    "workflowStyle": "balanced",
    "communicationStyle": "concise",
    "autoApprovePatterns": ["inspect variables", "get stack trace"]
  }
}
```

---

## 🔧 Operations

### Save Session

**Purpose:** Store session data when debug ends

**Algorithm:**
```typescript
async saveSession(session: DebugSession): Promise<void> {
    const sessionData = {
        sessionId: session.id,
        startTime: session.startTime,
        endTime: new Date().toISOString(),
        binary: session.binaryPath,
        workspace: session.workspacePath,
        finalPosition: await this.getCurrentPosition(),
        breakpoints: await this.getBreakpoints(),
        variablesInspected: this.state.inspectedVariables,
        hypotheses: this.state.hypotheses,
        outcome: this.state.outcome
    };
    
    this.data.sessions.push(sessionData);
    
    // Keep last 100 sessions
    if (this.data.sessions.length > 100) {
        this.data.sessions.shift();
    }
    
    // Save to file
    await this.saveToFile();
}
```

---

### Load Last Session

**Purpose:** Restore context from last debug session

**Algorithm:**
```typescript
async loadLastSession(): Promise<DebugSession | null> {
    // Load from file
    await this.loadFromFile();
    
    // Get most recent session
    if (this.data.sessions.length === 0) {
        return null;
    }
    
    const lastSession = this.data.sessions[this.data.sessions.length - 1];
    
    // Restore state
    this.state.lastSessionPosition = lastSession.finalPosition;
    this.state.lastSessionBreakpoints = lastSession.breakpoints;
    
    return lastSession;
}
```

---

### Get Session History

**Purpose:** Retrieve list of recent sessions

**Implementation:**
```typescript
getSessionHistory(limit: number = 10): DebugSession[] {
    return this.data.sessions
        .slice(-limit)
        .reverse(); // Most recent first
}

searchSessions(query: { binary?: string; bugFound?: boolean }): DebugSession[] {
    return this.data.sessions.filter(session => {
        if (query.binary && !session.binary.includes(query.binary)) {
            return false;
        }
        if (query.bugFound !== undefined && 
            session.outcome?.bugFound !== query.bugFound) {
            return false;
        }
        return true;
    });
}
```

---

### Track Variable Inspection

**Purpose:** Record which variables were inspected

**Implementation:**
```typescript
trackVariableInspection(name: string, value: string, type: string): void {
    this.state.inspectedVariables.push({
        name,
        value,
        type,
        timestamp: new Date().toISOString()
    });
    
    // Keep last 500 variables
    if (this.state.inspectedVariables.length > 500) {
        this.state.inspectedVariables.shift();
    }
}
```

---

### Track Hypothesis

**Purpose:** Record hypotheses formed during debug

**Implementation:**
```typescript
trackHypothesis(description: string, confidence: number, evidence: string[]): void {
    this.state.hypotheses.push({
        description,
        confidence,
        evidence,
        status: 'investigating',
        timestamp: new Date().toISOString()
    });
}

updateHypothesisStatus(index: number, status: 'confirmed' | 'rejected' | 'investigating'): void {
    if (this.state.hypotheses[index]) {
        this.state.hypotheses[index].status = status;
        this.state.hypotheses[index].updatedAt = new Date().toISOString();
    }
}
```

---

## 📁 File Storage

### Storage Location

```
<workspace>/.axel/session-history.json
```

### Save to File

```typescript
async saveToFile(): Promise<void> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) return;
    
    const axelDir = path.join(workspacePath, '.axel');
    if (!fs.existsSync(axelDir)) {
        fs.mkdirSync(axelDir, { recursive: true });
    }
    
    const filePath = path.join(axelDir, 'session-history.json');
    const dataJson = JSON.stringify(this.data, null, 2);
    
    fs.writeFileSync(filePath, dataJson);
    logger.debug('Session history saved to', filePath);
}
```

### Load from File

```typescript
async loadFromFile(): Promise<void> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) return;
    
    const filePath = path.join(workspacePath, '.axel', 'session-history.json');
    
    if (fs.existsSync(filePath)) {
        const dataJson = fs.readFileSync(filePath, 'utf-8');
        this.data = JSON.parse(dataJson);
        logger.info('Session history loaded from', filePath);
    }
}
```

---

## 🎯 Usage Patterns

### Pattern 1: Restore Last Position

```typescript
// User restarts VS Code
axel.onActivate(async () => {
    const lastSession = await sessionHistory.loadLastSession();
    
    if (lastSession && lastSession.finalPosition) {
        console.log(`Last session ended at ${lastSession.finalPosition.file}:${lastSession.finalPosition.line}`);
        console.log('Want to continue debugging?');
    }
});
```

### Pattern 2: Compare Sessions

```typescript
// Compare current bug with past sessions
const currentBug = { symptoms: ['data corruption', 'overflow'] };
const pastSessions = sessionHistory.searchSessions({ bugFound: true });

const similarSessions = pastSessions.filter(session => {
    return session.outcome?.rootCause?.includes('overflow') ||
           session.outcome?.rootCause?.includes('corruption');
});

if (similarSessions.length > 0) {
    console.log('Found similar bugs from past sessions:');
    similarSessions.forEach(s => {
        console.log(`  - ${s.binary}: ${s.outcome.rootCause}`);
    });
}
```

### Pattern 3: Learn from History

```typescript
// Analyze user's debug patterns
const sessions = sessionHistory.getSessionHistory(50);

const avgBreakpointsPerSession = sessions.reduce((sum, s) => {
    return sum + s.breakpoints.length;
}, 0) / sessions.length;

const commonBugLocations = sessions
    .filter(s => s.outcome?.bugFound)
    .map(s => s.outcome.location)
    .reduce((acc, loc) => {
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
    }, {});

console.log(`Average breakpoints per session: ${avgBreakpointsPerSession}`);
console.log('Common bug locations:', commonBugLocations);
```

---

## 🛡️ Privacy & Cleanup

### Automatic Cleanup

```typescript
// Cleanup old sessions (older than 30 days)
async cleanupOldSessions(daysToKeep: number = 30): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    
    this.data.sessions = this.data.sessions.filter(session => {
        return new Date(session.endTime) > cutoff;
    });
    
    await this.saveToFile();
    logger.info(`Cleaned up sessions older than ${daysToKeep} days`);
}
```

### Manual Clear

```typescript
async clearHistory(): Promise<void> {
    this.data.sessions = [];
    await this.saveToFile();
    logger.info('Session history cleared');
}
```

---

## 📊 Memory Limits

| Data Type | Limit | Action When Exceeded |
|-----------|-------|---------------------|
| Sessions | 100 | Remove oldest |
| Variables per session | 500 | Remove oldest |
| Hypotheses per session | 50 | Remove oldest |
| Position history | 100 | Remove oldest |
| File age | 30 days | Auto-cleanup |

---

*This memory system enables Axel to remember and learn from past debug sessions*
