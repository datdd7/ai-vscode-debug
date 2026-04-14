# LLM Integration Examples

**Document ID:** `DOC-INTEGRATION-001`  
**Version:** 1.0.0  
**Last Updated:** 2026-03-12  
**Owner:** Tech Writer Agent (`AGENT-TW-001`)

---

## Overview

This document provides integration examples for popular LLM frameworks and AI coding assistants to use the AI VSCode Debug Proxy.

[Satisfies $ARCH-AGT-001, $ARCH-HTTP-001]

---

## Table of Contents

1. [Claude Code Integration](#claude-code-integration)
2. [Cursor IDE Integration](#cursor-ide-integration)
3. [Cline Integration](#cline-integration)
4. [Custom Python Agent](#custom-python-agent)
5. [LangChain Integration](#langchain-integration)
6. [LlamaIndex Integration](#llamaindex-integration)

---

## Claude Code Integration

### Setup

Create custom debug commands in `~/.claude/commands/`:

```bash
mkdir -p ~/.claude/commands
```

### Debug Command

```bash
# ~/.claude/commands/debug.sh
#!/bin/bash

BASE_URL="http://localhost:9999"

case "$1" in
  launch)
    curl -s -X POST "$BASE_URL/api/debug" \
      -H "Content-Type: application/json" \
      -d "{\"operation\":\"launch\",\"params\":{\"program\":\"$2\",\"stopOnEntry\":true}}" | jq .
    ;;
  bp)
    curl -s -X POST "$BASE_URL/api/debug" \
      -d "{\"operation\":\"set_breakpoint\",\"params\":{\"location\":{\"path\":\"$2\",\"line\":$3}}}" | jq .
    ;;
  continue)
    curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"continue"}' | jq .
    ;;
  next)
    curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"next"}' | jq .
    ;;
  step)
    curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"step_in"}' | jq .
    ;;
  stack)
    curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"stack_trace"}' | jq .data.frames
    ;;
  vars)
    curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"get_stack_frame_variables"}' | jq .data.variables
    ;;
  eval)
    curl -s -X POST "$BASE_URL/api/debug" \
      -d "{\"operation\":\"evaluate\",\"params\":{\"expression\":\"$2\"}}" | jq .data.result
    ;;
  source)
    curl -s -X POST "$BASE_URL/api/debug" \
      -d "{\"operation\":\"list_source\",\"params\":{\"linesAround\":${2:-5}}}" | jq .data.sourceCode
    ;;
  quit)
    curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"quit"}' | jq .
    ;;
  *)
    echo "Debug commands:"
    echo "  /debug launch <binary>"
    echo "  /debug bp <file> <line>"
    echo "  /debug continue"
    echo "  /debug next"
    echo "  /debug step"
    echo "  /debug stack"
    echo "  /debug vars"
    echo "  /debug eval <expression>"
    echo "  /debug source [lines]"
    echo "  /debug quit"
    ;;
esac
```

### Usage in Claude

```
Let me debug the segmentation fault in main.c

/debug launch ./build/cooling_ecu
/debug bp ./src/main.c 42
/debug bp ./src/utils.c 25
/debug continue
```

### Advanced Debug Script

```bash
# ~/.claude/commands/debug-auto.sh
#!/bin/bash

# Automated debugging helper for Claude

BINARY="$1"
SYMPTOM="$2"

cat << EOF
I'll help debug: $SYMPTOM

Starting automated debugging session...

EOF

# Launch
echo "🚀 Launching debug session..."
curl -s -X POST "http://localhost:9999/api/debug" \
  -H "Content-Type: application/json" \
  -d "{\"operation\":\"launch\",\"params\":{\"program\":\"$BINARY\",\"stopOnEntry\":true}}" | jq -r '.data.sessionId'

echo "✅ Session started"

# Get symbols for main file
echo "📍 Analyzing code structure..."
MAIN_FILE=$(find . -name "main.c" | head -1)
curl -s "http://localhost:9999/api/symbols?fsPath=$(realpath $MAIN_FILE)" | jq '.data.symbols[] | select(.kind=="Function") | .name'

cat << EOF

Ready to debug. What would you like me to do?

Options:
1. Set breakpoints at all functions
2. Run to crash point
3. Step through from main()
4. Check specific variable: <name>
EOF
```

---

## Cursor IDE Integration

### Custom Rules

Create `.cursor/rules/debugging.json` in your project:

```json
{
  "rules": [
    {
      "name": "debug-session",
      "description": "Start a debug session",
      "pattern": "debug.*launch|start.*debug",
      "command": "curl -s -X POST http://localhost:9999/api/debug -H 'Content-Type: application/json' -d '{\"operation\":\"launch\",\"params\":{\"program\":\"${workspaceFolder}/build/app\",\"stopOnEntry\":true}}' | jq ."
    },
    {
      "name": "set-breakpoint",
      "description": "Set a breakpoint",
      "pattern": "breakpoint.*set|set.*bp",
      "command": "curl -s -X POST http://localhost:9999/api/debug -d '{\"operation\":\"set_breakpoint\",\"params\":{\"location\":{\"path\":\"${file}\",\"line\":${line}}}}' | jq ."
    },
    {
      "name": "continue-debug",
      "description": "Continue execution",
      "pattern": "continue|resume|next breakpoint",
      "command": "curl -s -X POST http://localhost:9999/api/debug -d '{\"operation\":\"continue\"}' | jq ."
    },
    {
      "name": "inspect-state",
      "description": "Inspect debug state",
      "pattern": "inspect|stack|variables|state",
      "command": "curl -s -X POST http://localhost:9999/api/debug -d '{\"operation\":\"stack_trace\"}' | jq .data.frames"
    }
  ]
}
```

### Custom Prompts

Create `.cursor/prompts/debug-bug.json`:

```json
{
  "name": "Debug Bug",
  "description": "Interactive bug debugging session",
  "prompt": "You are an expert debugger helping me find and fix a bug.\n\nBinary: ${workspaceFolder}/build/app\nFile: ${file}\nLine: ${line}\n\nDebugging workflow:\n1. Launch debug session with stopOnEntry\n2. Set breakpoints at suspected locations\n3. Continue to breakpoint\n4. Inspect stack trace and variables\n5. Evaluate expressions to understand state\n6. Step through code to trace execution\n7. Identify root cause\n8. Suggest fix\n\nStart by launching the debug session.",
  "scope": "editor"
}
```

### Usage in Cursor

1. Press `Cmd+K` (or `Ctrl+K`)
2. Type "Debug this bug"
3. Cursor will follow the debugging workflow

---

## Cline Integration

### Custom Commands

Create `.vscode/cline-commands.json`:

```json
{
  "commands": {
    "debug": {
      "description": "Debug a binary using AI Debug Proxy",
      "steps": [
        {
          "action": "shell",
          "command": "curl -s http://localhost:9999/api/ping | jq -r '.data.message'"
        },
        {
          "action": "ask",
          "question": "Which binary would you like to debug?",
          "variable": "binary"
        },
        {
          "action": "shell",
          "command": "curl -s -X POST http://localhost:9999/api/debug -H 'Content-Type: application/json' -d '{\"operation\":\"launch\",\"params\":{\"program\":\"${binary}\",\"stopOnEntry\":true}}' | jq ."
        }
      ]
    },
    "breakpoint": {
      "description": "Set a breakpoint",
      "steps": [
        {
          "action": "ask",
          "question": "File path?",
          "variable": "file"
        },
        {
          "action": "ask",
          "question": "Line number?",
          "variable": "line"
        },
        {
          "action": "shell",
          "command": "curl -s -X POST http://localhost:9999/api/debug -d '{\"operation\":\"set_breakpoint\",\"params\":{\"location\":{\"path\":\"${file}\",\"line\":${line}}}}' | jq ."
        }
      ]
    }
  }
}
```

---

## Custom Python Agent

### Full-Featured Debug Agent

```python
#!/usr/bin/env python3
"""
AI Debug Agent for LLM integration.
Provides a high-level interface for debugging via the AI Debug Proxy.
"""

import requests
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict


@dataclass
class BreakpointInfo:
    file: str
    line: int
    condition: Optional[str] = None
    enabled: bool = True


@dataclass
class DebugState:
    stopped: bool
    file: Optional[str]
    line: Optional[int]
    function: Optional[str]
    reason: Optional[str]
    stack_depth: int


class AIDebugAgent:
    """High-level debug agent for LLM integration."""
    
    def __init__(self, base_url: str = "http://localhost:9999"):
        self.base_url = base_url
        self.session = requests.Session()
        self.breakpoints: List[BreakpointInfo] = []
        self.state: Optional[DebugState] = None
    
    def _post(self, operation: str, params: Optional[Dict] = None) -> Dict:
        """Execute debug operation."""
        payload = {"operation": operation}
        if params:
            payload["params"] = params
        
        try:
            resp = self.session.post(
                f"{self.base_url}/api/debug",
                json=payload,
                timeout=30
            )
            resp.raise_for_status()
            return resp.json()
        except requests.Timeout:
            return {"success": False, "error": "Operation timed out"}
        except requests.RequestException as e:
            return {"success": False, "error": str(e)}
    
    def ping(self) -> bool:
        """Check if proxy is running."""
        try:
            resp = requests.get(f"{self.base_url}/api/ping", timeout=5)
            return resp.status_code == 200
        except:
            return False
    
    def launch(self, program: str, stop_on_entry: bool = True) -> Dict:
        """Launch debug session."""
        result = self._post("launch", {
            "program": program,
            "stopOnEntry": stop_on_entry
        })
        
        if result.get("success"):
            self.state = DebugState(
                stopped=True,
                file=None,
                line=None,
                function=None,
                reason="entry",
                stack_depth=0
            )
        
        return result
    
    def set_breakpoint(self, file: str, line: int, condition: Optional[str] = None) -> Dict:
        """Set breakpoint."""
        params = {
            "location": {"path": file, "line": line}
        }
        if condition:
            params["condition"] = condition
        
        result = self._post("set_breakpoint", params)
        
        if result.get("success"):
            self.breakpoints.append(BreakpointInfo(file, line, condition))
        
        return result
    
    def clear_breakpoints(self) -> None:
        """Clear all breakpoints."""
        for bp in self.breakpoints:
            self._post("remove_breakpoint", {
                "location": {"path": bp.file, "line": bp.line}
            })
        self.breakpoints.clear()
    
    def continue_exec(self) -> Dict:
        """Continue execution."""
        result = self._post("continue")
        
        if result.get("success"):
            self.state.stopped = True
            self.state.reason = result.get("data", {}).get("stopReason", "unknown")
        
        return result
    
    def next_step(self) -> Dict:
        """Step over."""
        return self._post("next")
    
    def step_in(self) -> Dict:
        """Step into."""
        return self._post("step_in")
    
    def step_out(self) -> Dict:
        """Step out."""
        return self._post("step_out")
    
    def get_stack(self) -> List[Dict]:
        """Get stack trace."""
        result = self._post("stack_trace")
        return result.get("data", {}).get("frames", [])
    
    def get_variables(self) -> List[Dict]:
        """Get variables in current frame."""
        result = self._post("get_stack_frame_variables")
        return result.get("data", {}).get("variables", [])
    
    def evaluate(self, expression: str) -> str:
        """Evaluate expression."""
        result = self._post("evaluate", {"expression": expression})
        return result.get("data", {}).get("result", "Error: " + result.get("error", "Unknown"))
    
    def list_source(self, lines_around: int = 5) -> str:
        """List source code around current line."""
        result = self._post("list_source", {"linesAround": lines_around})
        return result.get("data", {}).get("sourceCode", "")
    
    def get_state(self) -> DebugState:
        """Get current debug state."""
        if not self.state:
            return DebugState(False, None, None, None, None, 0)
        
        # Update from actual stack
        stack = self.get_stack()
        if stack:
            top = stack[0]
            self.state.file = top.get("sourcePath")
            self.state.line = top.get("line")
            self.state.function = top.get("name")
            self.state.stack_depth = len(stack)
        
        return self.state
    
    def quit(self) -> Dict:
        """End session."""
        result = self._post("quit")
        self.state = None
        self.breakpoints.clear()
        return result
    
    def debug_print(self, message: str):
        """Print debug message."""
        print(f"🔍 {message}")
    
    def run_debug_session(self, binary: str, suspected_bugs: List[Dict]):
        """Run complete debug session."""
        self.debug_print(f"Starting debug session for: {binary}")
        
        # Check proxy
        if not self.ping():
            self.debug_print("❌ Proxy not running at " + self.base_url)
            return
        
        self.debug_print("✅ Proxy is running")
        
        # Launch
        self.debug_print("🚀 Launching debug session...")
        result = self.launch(binary)
        
        if not result.get("success"):
            self.debug_print(f"❌ Launch failed: {result.get('error')}")
            return
        
        self.debug_print("✅ Session launched")
        
        # Set breakpoints
        self.debug_print(f"📍 Setting {len(suspected_bugs)} breakpoints...")
        for bug in suspected_bugs:
            self.set_breakpoint(bug["file"], bug["line"], bug.get("condition"))
            self.debug_print(f"   Set breakpoint at {bug['file']}:{bug['line']}")
        
        # Debug loop
        iteration = 0
        max_iterations = 50
        
        while iteration < max_iterations:
            iteration += 1
            
            self.debug_print(f"\n▶️  Iteration {iteration}")
            
            # Continue
            result = self.continue_exec()
            
            if not result.get("success"):
                self.debug_print(f"❌ Continue failed: {result.get('error')}")
                break
            
            # Check stop reason
            stop_reason = result.get("data", {}).get("stopReason", "unknown")
            
            if stop_reason == "exit":
                self.debug_print("✅ Program exited normally")
                break
            
            self.debug_print(f"🛑 Stopped: {stop_reason}")
            
            # Get state
            state = self.get_state()
            self.debug_print(f"   Location: {state.file}:{state.line} in {state.function}")
            
            # Get variables
            variables = self.get_variables()
            self.debug_print("   Variables:")
            for var in variables[:5]:  # Show first 5
                self.debug_print(f"      {var['name']} = {var['value']}")
            
            # Get source
            source = self.list_source(3)
            if source:
                self.debug_print("   Source:")
                for line in source.split('\n'):
                    self.debug_print(f"      {line}")
            
            # Here you could add AI analysis logic
            # For now, just continue
            if iteration >= max_iterations:
                self.debug_print("⚠️ Max iterations reached")
        
        # Cleanup
        self.debug_print("\n👋 Ending session...")
        self.quit()
        self.debug_print("✅ Session complete")


# Example usage
if __name__ == "__main__":
    agent = AIDebugAgent()
    
    suspected_bugs = [
        {"file": "/path/to/main.c", "line": 42},
        {"file": "/path/to/utils.c", "line": 25, "condition": "x > 100"},
    ]
    
    agent.run_debug_session("/path/to/binary", suspected_bugs)
```

### LLM Tool Integration

```python
# Integration with LLM tool calling
from openai import OpenAI

client = OpenAI()

def create_debug_tools():
    """Create OpenAI function definitions for debug operations."""
    return [
        {
            "type": "function",
            "function": {
                "name": "launch_debug",
                "description": "Launch a debug session",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "binary": {"type": "string", "description": "Path to binary"}
                    },
                    "required": ["binary"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "set_breakpoint",
                "description": "Set a breakpoint",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file": {"type": "string"},
                        "line": {"type": "integer"},
                        "condition": {"type": "string"}
                    },
                    "required": ["file", "line"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "continue_debug",
                "description": "Continue execution",
                "parameters": {"type": "object", "properties": {}}
            }
        },
        {
            "type": "function",
            "function": {
                "name": "inspect_state",
                "description": "Get current debug state",
                "parameters": {"type": "object", "properties": {}}
            }
        }
    ]


def handle_llm_debug_request(user_message: str):
    """Handle debugging request from LLM."""
    agent = AIDebugAgent()
    
    messages = [
        {"role": "system", "content": "You are a debugging assistant."},
        {"role": "user", "content": user_message}
    ]
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        tools=create_debug_tools()
    )
    
    # Process tool calls
    for tool_call in response.choices[0].message.tool_calls:
        func_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        
        if func_name == "launch_debug":
            result = agent.launch(args["binary"])
        elif func_name == "set_breakpoint":
            result = agent.set_breakpoint(args["file"], args["line"], args.get("condition"))
        elif func_name == "continue_debug":
            result = agent.continue_exec()
        elif func_name == "inspect_state":
            state = agent.get_state()
            result = {"state": state.__dict__}
        
        # Add result to conversation
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(result)
        })
    
    # Get final response
    final_response = client.chat.completions.create(
        model="gpt-4",
        messages=messages
    )
    
    return final_response.choices[0].message.content
```

---

## LangChain Integration

### Debug Tool

```python
from langchain.tools import BaseTool
from langchain.agents import initialize_agent, AgentType
from langchain.llms import OpenAI


class DebugLaunchTool(BaseTool):
    name = "debug_launch"
    description = "Launch a debug session for a binary"
    
    def _run(self, binary_path: str) -> str:
        agent = AIDebugAgent()
        result = agent.launch(binary_path)
        return json.dumps(result)


class DebugBreakpointTool(BaseTool):
    name = "debug_breakpoint"
    description = "Set a breakpoint at file:line"
    
    def _run(self, file: str, line: int, condition: str = None) -> str:
        agent = AIDebugAgent()
        result = agent.set_breakpoint(file, line, condition)
        return json.dumps(result)


class DebugContinueTool(BaseTool):
    name = "debug_continue"
    description = "Continue execution to next breakpoint"
    
    def _run(self) -> str:
        agent = AIDebugAgent()
        result = agent.continue_exec()
        return json.dumps(result)


class DebugInspectTool(BaseTool):
    name = "debug_inspect"
    description = "Inspect current debug state (stack, variables)"
    
    def _run(self) -> str:
        agent = AIDebugAgent()
        state = agent.get_state()
        stack = agent.get_stack()
        variables = agent.get_variables()
        
        return json.dumps({
            "state": state.__dict__,
            "stack": stack,
            "variables": variables
        })


def create_debug_agent(llm=None):
    """Create LangChain agent for debugging."""
    if llm is None:
        llm = OpenAI(temperature=0)
    
    tools = [
        DebugLaunchTool(),
        DebugBreakpointTool(),
        DebugContinueTool(),
        DebugInspectTool()
    ]
    
    agent = initialize_agent(
        tools,
        llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True
    )
    
    return agent


# Usage
if __name__ == "__main__":
    agent = create_debug_agent()
    
    agent.run("""
    Debug the binary at ./build/cooling_ecu.
    
    1. Launch the debug session
    2. Set breakpoints at main.c:42 and utils.c:25
    3. Continue to the first breakpoint
    4. Inspect the state and tell me what variables are visible
    """)
```

---

## LlamaIndex Integration

### Debug Query Engine

```python
from llama_index.core import VectorStoreIndex, Document
from llama_index.core.tools import FunctionTool
from llama_index.core.agent import ReActAgent
from llama_index.llms.openai import OpenAI


def debug_launch(binary_path: str) -> str:
    """Launch a debug session."""
    agent = AIDebugAgent()
    result = agent.launch(binary_path)
    return f"Debug session launched: {json.dumps(result)}"


def debug_breakpoint(file: str, line: int, condition: str = None) -> str:
    """Set a breakpoint."""
    agent = AIDebugAgent()
    result = agent.set_breakpoint(file, line, condition)
    return f"Breakpoint set: {json.dumps(result)}"


def debug_continue() -> str:
    """Continue execution."""
    agent = AIDebugAgent()
    result = agent.continue_exec()
    return f"Continued: {json.dumps(result)}"


def debug_inspect() -> str:
    """Inspect debug state."""
    agent = AIDebugAgent()
    state = agent.get_state()
    stack = agent.get_stack()
    variables = agent.get_variables()
    
    return f"""
State: {json.dumps(state.__dict__)}
Stack: {json.dumps(stack, indent=2)}
Variables: {json.dumps(variables, indent=2)}
"""


def create_debug_query_engine():
    """Create LlamaIndex debug agent."""
    llm = OpenAI(model="gpt-4", temperature=0)
    
    tools = [
        FunctionTool.from_defaults(fn=debug_launch),
        FunctionTool.from_defaults(fn=debug_breakpoint),
        FunctionTool.from_defaults(fn=debug_continue),
        FunctionTool.from_defaults(fn=debug_inspect)
    ]
    
    agent = ReActAgent.from_tools(tools, llm=llm, verbose=True)
    
    return agent


# Usage
if __name__ == "__main__":
    agent = create_debug_query_engine()
    
    response = agent.chat("""
    I need to debug a segmentation fault.
    
    1. Launch ./build/app
    2. Set breakpoint at main.c:100
    3. Continue execution
    4. Tell me what you see in the stack trace
    """)
    
    print(response)
```

---

## Related Documents

- [AI Agent Technical Guide](./ai-agent-technical-guide.md)
- [Prompt Templates](./prompt-templates.md)
- [CLI Debug Guide](./cli-debug-guide.md)

---

*This document follows the coding guidelines in DOC-CG-001.*
