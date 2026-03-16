#!/usr/bin/env python3
"""
AI Debug Agent - Collaborative Debugging Assistant

This agent collaborates with Human developers to debug software
through the AI Debug Proxy CLI (ai-debug.sh).

Usage:
    python3 ai-debug-agent.py <binary_path>

Example:
    python3 ai-debug-agent.py ./build/ehsm_host
"""

import asyncio
import subprocess
import json
import sys
import re
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

# ============================================================================
# CONFIGURATION
# ============================================================================

AI_DEBUG_SCRIPT = "/home/datdang/working/common_dev/ai_vscode_debug/ai-debug-proxy/resources/ai-debug.sh"
DEFAULT_BINARY = "/home/datdang/working/common_dev/embedded_hsm/build/ehsm_host"

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class DebugEvent:
    type: str
    data: Any = None

@dataclass
class BreakpointInfo:
    file: str
    line: int
    verified: bool
    enabled: bool

@dataclass
class StackFrame:
    id: int
    function: str
    file: str
    line: int

@dataclass
class Variable:
    name: str
    value: str
    type: str

@dataclass
class StopInfo:
    reason: str
    description: str
    thread_id: int
    text: Optional[str] = None

# ============================================================================
# CLI WRAPPER
# ============================================================================

class AIDebugCLI:
    """Wrapper for ai-debug.sh CLI commands"""
    
    def __init__(self, script_path: str):
        self.script_path = script_path
        self.source_cmd = f"source {script_path}"
    
    async def _run(self, command: str) -> str:
        """Run CLI command and return output"""
        full_cmd = f"bash -c '{self.source_cmd} && {command}'"
        try:
            result = await asyncio.create_subprocess_shell(
                full_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            return stdout.decode() + stderr.decode()
        except Exception as e:
            return f"Error: {e}"
    
    def _parse_json(self, output: str) -> Optional[Dict]:
        """Parse JSON from CLI output"""
        try:
            # Find JSON in output
            match = re.search(r'(\{.*\}|\[.*\])', output, re.DOTALL)
            if match:
                return json.loads(match.group(1))
        except:
            pass
        return None
    
    async def ai_launch(self, binary: str, pause: bool = True) -> bool:
        """Launch debug session"""
        output = await self._run(f'ai_launch "{binary}" {"true" if pause else "false"}')
        return "✓" in output or "success" in output.lower()
    
    async def ai_continue(self) -> Dict:
        """Continue execution"""
        output = await self._run("ai_continue")
        return self._parse_json(output) or {"output": output}
    
    async def ai_bp(self, file: str, line: int) -> bool:
        """Set breakpoint"""
        output = await self._run(f'ai_bp {file} {line}')
        return "✓" in output or "Breakpoint set" in output
    
    async def ai_bps(self) -> List[BreakpointInfo]:
        """List breakpoints"""
        output = await self._run("ai_bps")
        data = self._parse_json(output)
        if not data:
            return []
        
        bps = []
        for bp in data:
            bps.append(BreakpointInfo(
                file=bp.get("location", {}).get("path", ""),
                line=bp.get("location", {}).get("line", 0),
                verified=bp.get("verified", False),
                enabled=bp.get("enabled", True)
            ))
        return bps
    
    async def ai_stack(self) -> List[StackFrame]:
        """Get stack trace"""
        output = await self._run("ai_stack")
        data = self._parse_json(output)
        if not data:
            return []
        
        frames = []
        for frame in data.get("frames", []):
            frames.append(StackFrame(
                id=frame.get("id", 0),
                function=frame.get("name", ""),
                file=frame.get("sourcePath", ""),
                line=frame.get("line", 0)
            ))
        return frames
    
    async def ai_vars(self) -> List[Variable]:
        """Get local variables"""
        output = await self._run("ai_vars")
        data = self._parse_json(output)
        if not data:
            return []
        
        vars = []
        for var in data.get("variables", []):
            vars.append(Variable(
                name=var.get("name", ""),
                value=var.get("value", ""),
                type=var.get("type", "")
            ))
        return vars
    
    async def ai_eval(self, expr: str) -> str:
        """Evaluate expression"""
        output = await self._run(f'ai_eval "{expr}"')
        return output.strip()
    
    async def ai_source(self, lines: int = 10) -> str:
        """Show source code"""
        output = await self._run(f'ai_source {lines}')
        return output
    
    async def ai_last_stop(self) -> StopInfo:
        """Get last stop reason"""
        output = await self._run("ai_last_stop")
        data = self._parse_json(output)
        if not data:
            return StopInfo(reason="unknown", description="Unknown", thread_id=0)
        
        return StopInfo(
            reason=data.get("reason", "unknown"),
            description=data.get("description", "Unknown"),
            thread_id=data.get("threadId", 0),
            text=data.get("text")
        )
    
    async def ai_status(self) -> bool:
        """Check server status"""
        output = await self._run("ai_status")
        return "running" in output.lower()

# ============================================================================
# AI DEBUG AGENT
# ============================================================================

class AIDebugAgent:
    """AI Agent for collaborative debugging"""
    
    def __init__(self, cli_path: str = AI_DEBUG_SCRIPT):
        self.cli = AIDebugCLI(cli_path)
        self.session_active = False
        self.binary_path = ""
    
    def print(self, message: str):
        """Print formatted message"""
        print(f"\n🤖 AI: {message}\n")
    
    async def report(self, message: str):
        """Report findings to Human"""
        print(f"🤖 {message}")
    
    async def ask(self, question: str):
        """Ask Human for input"""
        print(f"❓ AI: {question}")
    
    async def analyze_entry_point(self):
        """Analyze program at entry point"""
        self.print("Debug session started!")
        
        # Get source code
        source = await self.cli.ai_source(20)
        if source:
            await self.report("📍 Stopped at entry point:")
            print(source[:500])  # First 500 chars
        
        # Suggest breakpoints
        await self.report("💡 Suggested breakpoints:")
        suggestions = await self.suggest_breakpoints()
        for loc in suggestions:
            await self.report(f"  • {loc}")
    
    async def suggest_breakpoints(self) -> List[str]:
        """Suggest interesting locations for breakpoints"""
        # In real implementation, analyze source code
        return [
            "main.cpp:77 - Before error handling",
            "hsm_api_impl.cpp:138 - Potential null dereference",
            "crypto_service.cpp:62 - Key validation"
        ]
    
    async def analyze_on_breakpoint(self, bp: BreakpointInfo):
        """Analyze state at breakpoint"""
        await self.report(f"📍 Breakpoint hit at {bp.file}:{bp.line}")
        
        # Get variables
        vars = await self.cli.ai_vars()
        if vars:
            await self.report("📊 Variables:")
            for var in vars[:5]:  # First 5
                await self.report(f"  • {var.name} = {var.value}")
        
        # Get stack
        stack = await self.cli.ai_stack()
        if stack:
            await self.report("📚 Stack:")
            for frame in stack[:3]:  # First 3
                await self.report(f"  #{frame.id} {frame.function}() at {frame.file}:{frame.line}")
        
        # Check for anomalies
        anomalies = self.detect_anomalies(vars)
        if anomalies:
            await self.report("⚠️ Anomalies detected:")
            for a in anomalies:
                await self.report(f"  • {a}")
    
    def detect_anomalies(self, vars: List[Variable]) -> List[str]:
        """Detect suspicious variable values"""
        anomalies = []
        
        for var in vars:
            # NULL pointers
            if var.value == "0" or var.value == "0x0":
                if "ptr" in var.name.lower() or var.type.endswith("*"):
                    anomalies.append(f"{var.name} is NULL")
            
            # Error codes
            if var.value == "-1" or var.value == "0xffffffff":
                anomalies.append(f"{var.name} = -1 (error code?)")
            
            # Empty strings
            if '""' in var.value and "string" in var.type.lower():
                anomalies.append(f"{var.name} is empty string")
            
            # Uninitialized (garbage values)
            try:
                val = int(var.value, 0)
                if val > 0x7FFFFFFF or val < -0x7FFFFFFF:
                    anomalies.append(f"{var.name} has suspicious value {var.value}")
            except:
                pass
        
        return anomalies
    
    async def analyze_crash(self, stop_info: StopInfo):
        """Analyze crash"""
        await self.report("💥 CRASH DETECTED!")
        await self.report(f"Reason: {stop_info.reason} - {stop_info.description}")
        
        # Get stack trace
        stack = await self.cli.ai_stack()
        if stack:
            await self.report("📚 Stack trace:")
            for i, frame in enumerate(stack[:5]):
                await self.report(f"  #{i} {frame.function}() at {frame.file}:{frame.line}")
            
            # Find root cause
            root_cause = await self.find_root_cause(stack)
            await self.report(f"🔍 Root cause: {root_cause}")
            
            # Suggest fix
            fix = await self.suggest_fix(stack, stop_info)
            await self.report(f"💡 Suggested fix: {fix}")
    
    async def find_root_cause(self, stack: List[StackFrame]) -> str:
        """Find root cause of crash"""
        if not stack:
            return "Unknown (no stack trace)"
        
        top_frame = stack[0]
        
        # Common patterns
        if "encrypt" in top_frame.function.lower():
            return "Encryption operation failed - likely null pointer"
        if "getSlotInfo" in top_frame.function.lower():
            return "Keystore service access failed"
        if "memcpy" in top_frame.function.lower() or "strcpy" in top_frame.function.lower():
            return "Memory corruption (buffer overflow?)"
        
        return f"Crash in {top_frame.function}() at line {top_frame.line}"
    
    async def suggest_fix(self, stack: List[StackFrame], stop_info: StopInfo) -> str:
        """Suggest fix for crash"""
        if not stack:
            return "Cannot suggest fix without stack trace"
        
        top_frame = stack[0]
        
        if stop_info.reason == "exception":
            return f"Add null check before {top_frame.function}() call"
        elif stop_info.reason == "signal":
            return f"Check pointer validity at {top_frame.file}:{top_frame.line}"
        
        return "Review code at crash location"
    
    async def answer_question(self, question: str):
        """Answer Human's question"""
        await self.report(f"Analyzing: {question}")
        
        # Try to evaluate as expression
        result = await self.cli.ai_eval(question)
        if result and "Error" not in result:
            await self.report(f"📊 Result: {result}")
            return
        
        # Otherwise, provide general analysis
        await self.report("Let me check the debug context...")
        
        vars = await self.cli.ai_vars()
        if question.lower() in [v.name.lower() for v in vars]:
            var = next(v for v in vars if v.name.lower() == question.lower())
            await self.report(f"📊 {var.name} = {var.value} (type: {var.type})")
    
    async def collaborate(self, binary_path: str):
        """Main collaboration loop"""
        self.binary_path = binary_path
        self.print(f"Ready to debug: {binary_path}")
        
        # Check server
        status = await self.cli.ai_status()
        if not status:
            await self.report("❌ Debug proxy not running!")
            await self.report("💡 Start VSCode extension first")
            return
        
        # Launch session
        await self.report("🚀 Launching debug session...")
        success = await self.cli.ai_launch(binary_path, pause=True)
        if not success:
            await self.report("❌ Failed to launch debug session")
            return
        
        self.session_active = True
        
        # Initial analysis
        await self.analyze_entry_point()
        
        # Collaboration loop
        await self.report("🎯 Ready for collaboration!")
        await self.report("Commands:")
        await self.report("  'c' - Continue")
        await self.report("  's' - Step")
        await self.report("  'v <var>' - Check variable")
        await self.report("  'q' - Quit")
        
        while self.session_active:
            # Get Human input
            try:
                cmd = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: input("\n👤 Human> ")
                )
            except EOFError:
                break
            
            parts = cmd.strip().split()
            if not parts:
                continue
            
            command = parts[0].lower()
            
            if command == 'q' or command == 'quit':
                self.session_active = False
                await self.report("👋 Ending debug session")
                break
            
            elif command == 'c' or command == 'continue':
                await self.report("🏃 Continuing...")
                result = await self.cli.ai_continue()
                
                # Check for crash
                stop_info = await self.cli.ai_last_stop()
                if stop_info.reason in ["exception", "signal"]:
                    await self.analyze_crash(stop_info)
                else:
                    await self.report("✅ Continued successfully")
            
            elif command == 's' or command == 'step':
                await self.report("👣 Stepping...")
                # Would need ai_next implementation
            
            elif command == 'v' or command == 'vars':
                if len(parts) > 1:
                    var_name = parts[1]
                    await self.answer_question(var_name)
                else:
                    vars = await self.cli.ai_vars()
                    await self.report("📊 Variables:")
                    for var in vars:
                        await self.report(f"  {var.name} = {var.value}")
            
            elif command == 'stack':
                stack = await self.cli.ai_stack()
                if stack:
                    await self.report("📚 Stack:")
                    for frame in stack:
                        await self.report(f"  #{frame.id} {frame.function}() at {frame.file}:{frame.line}")
            
            else:
                await self.answer_question(cmd)
        
        await self.report("✅ Debug session ended")

# ============================================================================
# MAIN
# ============================================================================

async def main():
    if len(sys.argv) < 2:
        print("Usage: python3 ai-debug-agent.py <binary_path>")
        print(f"Example: python3 ai-debug-agent.py {DEFAULT_BINARY}")
        sys.exit(1)
    
    binary_path = sys.argv[1]
    agent = AIDebugAgent()
    await agent.collaborate(binary_path)

if __name__ == "__main__":
    asyncio.run(main())
