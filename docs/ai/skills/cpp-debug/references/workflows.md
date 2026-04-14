# Debugging Workflows — AI Debug Proxy

## Workflow 1: Bug Hunt (known suspicious location)

Use when you know which function or line is likely broken.

```
launch → set_breakpoint → continue → inspect → step → terminate
```

```python
# 1. Launch — stop before anything runs
debug_launch("/abs/path/to/binary", stop_on_entry=True)

# 2. Set breakpoint (with optional condition)
debug_set_breakpoint("src/main.c", 42)
debug_set_breakpoint("src/ring_buffer.c", 88, condition="count > 255")

# 3. Run to breakpoint
debug_continue()

# 4. Inspect — scope_preview first, then drill down
debug_get_scope_preview()           # locals + args in one call
debug_stack_trace()                 # understand call context
debug_evaluate("suspect_var")       # specific value
debug_pretty_print("struct_ptr")    # expand struct / array
debug_whatis("my_var")              # check type if uncertain

# 5. Step through the logic
debug_next()       # step over (stay in current function)
debug_step_in()    # step into called function
debug_step_out()   # step out and return to caller

# 6. Need to look at a different call site? Jump frames
debug_stack_trace()    # get frame IDs
debug_goto_frame(2)    # jump to frame 2
debug_get_scope_preview()

# 7. Continue to next breakpoint or run to a specific line
debug_continue()
debug_until(100)   # run until line 100 (no persistent BP)

# 8. Done
debug_terminate()
```

---

## Workflow 2: Crash Investigation (segfault / abort / signal)

Use when the program crashes and you need to find the root cause.

```
launch (no stopOnEntry) → continue → get_last_stop_info → stack_trace → navigate frames
```

```python
# 1. Let the program run and crash naturally
debug_launch("/abs/path/to/binary", stop_on_entry=False)
debug_continue()

# 2. GDB catches the signal — read what happened
debug_get_last_stop_info()
# → {reason, signal, file, line, function}

# 3. Full call stack at the crash site
debug_stack_trace()
# Frame 0 = crash site, Frame 1 = its caller, etc.

# 4. Inspect crash frame
debug_get_scope_preview()
debug_evaluate("ptr")              # check null/bad pointer
debug_evaluate("arr[i]")          # check out-of-bounds index
debug_evaluate("sizeof(buf)")     # check buffer size

# 5. Navigate up to find where bad data originated
debug_up()
debug_get_scope_preview()
debug_evaluate("return_value")

# 6. Jump directly to any frame
debug_goto_frame(3)
debug_get_scope_preview()
```

**Signal → root cause mapping:**

| Signal | Likely cause | First thing to inspect |
| --- | --- | --- |
| `SIGSEGV` | Null/bad pointer dereference | Pointer at crash site |
| `SIGABRT` | `assert()` failure or heap corruption | `abort()` caller in stack |
| `SIGFPE` | Division by zero | Divisor expression |
| `SIGBUS` | Unaligned memory access | Address in registers |
| `exited-normally` | Clean exit — not a crash | Return value / exit code |

---

## Workflow 3: Memory & Register Inspection

Use for embedded targets, buffer analysis, or low-level debugging.

```python
# CPU registers
debug_get_registers()
# → {rip, rsp, rbp, rax, rbx, …}

# Read raw memory — memoryReference is a hex string
debug_read_memory("0x7fffffffde00", 64)
# → {address, data (hex), count}

# Get variable address, then read the raw bytes
result = debug_evaluate("&my_buf")
debug_read_memory(result["result"], 128)

# Write memory to patch a value at runtime
debug_write_memory(0x7fffffffde00, "deadbeef01020304")
# data = hex string, no "0x" prefix

# Raw GDB commands (escape hatch for anything not covered)
debug_execute_statement("x/16xb 0x7fffffffde00")  # examine memory
debug_execute_statement("info registers")
debug_execute_statement("bt full")                 # full backtrace with locals
debug_execute_statement("info threads")
```

---

## Workflow 4: Multi-Thread Debugging

Use when investigating race conditions or per-thread state.

```python
# 1. See all threads
debug_list_threads()
# → [{id, name, state, currentFrame}, …]

# 2. Switch to a specific thread (all subsequent calls use it)
debug_switch_thread(2)

# 3. Inspect that thread's state
debug_stack_trace()
debug_get_scope_preview()
debug_evaluate("shared_counter")

# 4. Compare with another thread
debug_switch_thread(3)
debug_get_scope_preview()

# 5. Switch back to main thread when done
debug_switch_thread(1)
```

> After `debug_switch_thread()`, frame context resets to frame 0 of the new
> thread. Always call `debug_stack_trace()` after switching to orient yourself.

---

## Inspection Strategy

**Order of calls (most to least efficient):**

```
debug_get_scope_preview()          # always first — locals + args, 1 call
  → debug_evaluate("expr")         # specific value or expression
    → debug_pretty_print("expr")   # only for complex structs/arrays
      → debug_execute_statement()  # raw GDB for anything else
```

**Expression examples for `evaluate` / `pretty_print` / `whatis`:**

| Goal | Expression |
| --- | --- |
| Dereference pointer | `"*ptr"` |
| Struct field | `"ptr->field"` or `"obj.field"` |
| Array element | `"arr[i]"` |
| Cast | `"(MyStruct*)raw_ptr"` |
| Call a function | `"strlen(str)"` |
| Variable address | `"&variable"` |
| Pointer arithmetic | `"buf + offset"` |

**When inspection returns empty or `<optimized out>`:**
- Wrong frame — `debug_stack_trace()` then `debug_goto_frame(N)`
- Code compiled with optimization — rebuild with `-O0`
- Program still running — `debug_get_last_stop_info()` to verify it's stopped

---

## Session Lifecycle

```python
debug_status()      # check before launching — avoid double sessions
debug_terminate()   # always clean up; frees GDB process
debug_restart()     # re-run without re-launching (keeps breakpoints)
```

If `debug_terminate()` is stuck: `debug_execute_statement("kill")`.
