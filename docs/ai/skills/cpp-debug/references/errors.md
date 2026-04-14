# Common Errors — AI Debug Proxy

## Error Table

| Error message | Cause | Fix |
| --- | --- | --- |
| `No debug backend initialized` | No active session | Call `debug_launch` first |
| `GDB not initialized` | Backend exists but launch not called | Call `debug_launch` |
| `Already at the outermost frame` | `debug_down` called at frame 0 | Call `debug_up` to reach inner frames |
| `No breakpoint found at path:line` | Wrong file path or line number | `debug_get_active_breakpoints()` — check exact path and line |
| `Connection refused` | Proxy HTTP server not running | Reload VS Code window (extension auto-starts server) |
| `program not found` | Relative path given | Use absolute path: `/home/user/project/build/app` |
| `timeout` / no response | GDB blocked waiting for program output | `debug_pause()` to interrupt, or `debug_terminate()` |
| `Unknown operation` | Operation name typo | Check `references/mcp-tools.md` for correct names |
| `Invalid parameters` | Wrong param name or type | Check tool signature in `references/mcp-tools.md` |

---

## Diagnostic Steps

### Proxy not responding

```bash
# 1. Check if proxy is up
curl -s http://localhost:9999/api/ping

# 2. Check session state
curl -s http://localhost:9999/api/debug/status
```

If ping fails → reload VS Code window.  
If status shows `hasActiveSession: false` → call `debug_launch`.

### Variables show empty or `<optimized out>`

1. Wrong frame — `debug_stack_trace()` → `debug_goto_frame(N)` to a frame
   where the variable is defined
2. Compiler optimization — rebuild with `-O0 -g`
3. Variable not yet initialized — step forward with `debug_next()`

### Program hangs after `debug_continue()`

The process is running and waiting (for input, a lock, etc.):

```python
debug_pause()              # interrupt it
debug_get_last_stop_info() # see where it stopped
debug_stack_trace()        # diagnose the hang
```

### Session stuck / GDB unresponsive

```python
debug_execute_statement("kill")   # force-kill the inferior process
# If that fails:
debug_terminate()                 # terminate the session entirely
```

### Breakpoint never hits

```python
debug_get_active_breakpoints()   # verify BP was set
# Common causes:
# - File path must match how GDB sees it (try just the filename, not full path)
# - Line number may have shifted — set BP on a function name instead:
debug_execute_statement("break my_function")
```

### `SIGSEGV` immediately on launch

The binary has no debug symbols or the path is wrong:

```bash
file /path/to/binary          # check: should say "not stripped"
readelf -S binary | grep debug # should list .debug_info sections
```

Rebuild: `gcc -g -O0 src/*.c -o build/app`
