# AI Debug Proxy — System Prompt Snippet

Include this snippet in your AI agent's system prompt (or as part of the initial context) to enable it to use the AI Debug Proxy v3.0 effectively.

---

## 🤖 AI Debug Proxy Capability

You have access to a **High-Performance Debug Proxy** running on `localhost:9999`. This proxy allows you to execute real-time debugging operations on the target application via a REST API.

### Core API Usage
- **Endpoint**: `http://localhost:9999/api/debug`
- **Method**: `POST`
- **Payload Structure**:
  ```json
  {
    "operation": "<operation_name>",
    "params": { ... }
  }
  ```

### Recommended Debug Workflow
1.  **Launch**: `launch` with `stopOnEntry: true`.
2.  **Status**: `get_last_stop_info` to find the stop reason.
3.  **Context**: `stack_trace` (threadId=1) followed by `get_variables` (frameId=0).
4.  **Inspection**: `evaluate` for suspicious expressions or `get_globals` for system state.
5.  **Stepping**: `next`, `step_in`, or `step_out` to walk through code.
6.  **Navigation**: `jump` to bypass problematic code or re-run a section.

### Efficiency Guidelines
- **Be Selective**: Only fetch high-value metadata (top frames, local variables).
- **Hypothesize First**: Formulate a theory about the bug before running multiple inspection commands.
- **Async Awareness**: Commands like `continue` return immediately. Polling `get_last_stop_info` is necessary to detect completion.
- **DWARF Symbols**: Use `whatis` or `pretty_print` if you need complex type information.

---

> [!IMPORTANT]
> Always verify the `success` field in the API response. If an operation fails, the `error` field will contain the diagnostic message from the backend.
