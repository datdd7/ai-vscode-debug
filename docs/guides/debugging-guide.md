# Debugging Guide — Embedded Training Project

The `playground` project is an AUTOSAR-style C firmware simulation for an engine cooling ECU. It contains **10 intentional bugs** designed to train AI agents in embedded debugging techniques.

---

## Building the Training Project

```bash
cd playground
make clean && make    # builds build/cooling_ecu with -g -O0 debug symbols
make run              # run simulation (no debugger)
make debug            # launch GDB directly
```

The binary is output to `build/cooling_ecu`.

> **Important:** Always `make clean && make` from the correct working directory so DWARF debug symbols point to the right source paths.

---

## Project Architecture

```
app/       - Application SWCs (TempMonitor, MotorControl, Dashboard, etc.)
rte/       - Runtime Environment (inter-SWC communication)
services/  - OS, Com, Dem, Det, NvM, EcuM, BswM, SchM, ComM, CanIf
ecual/     - ECU Abstraction Layer (IoHwAb: Dio, Adc, Pwm)
mcal/      - Microcontroller Abstraction (Mcu, Port, Dio, Adc, Pwm, Gpt, ...)
platform/  - Platform types
utils/     - RingBuffer, Filter, CRC
main.c     - Entry point and scheduler
```

**Functional domain:** Reads coolant temperature via ADC, controls fan speed via PWM, controls LED indicators (Green/Yellow/Red), outputs UART dashboard, sends CAN diagnostics, stores calibration in NvM.

---

## Typical Debug Workflow

```bash
# 1. Launch session stopped at entry
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"launch","params":{"program":"/path/to/playground/build/cooling_ecu","stopOnEntry":true}}'

# 2. Set breakpoint at suspected bug location
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"set_breakpoint","params":{"location":{"path":"/path/to/utils/Utils_RingBuffer.c","line":25}}}'

# 3. Continue to breakpoint
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"continue"}'

# 4. Inspect stack
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"stack_trace"}'

# 5. Inspect variable
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"evaluate","params":{"expression":"buf->Head"}}'

# 6. Step through
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"next"}'
```

---

## The 10 Bugs

### Bug 1 — Ring Buffer Overflow

**File:** `utils/Utils_RingBuffer.c`
**Symptom:** After pushing exactly `Size` elements, subsequent push/pop operations corrupt data or crash.
**Technique:** Set breakpoint in `RingBuffer_Push()`, inspect `Head` and `Tail` values near capacity boundary.
**Key question:** Is the modulo operation correct? Does `Head` ever exceed `Size - 1`?

---

### Bug 2 — Uninitialized Filter Output

**File:** `utils/Utils_Filter.c`
**Symptom:** First ~10 temperature readings on the Dashboard show wildly incorrect values before converging to the true value.
**Technique:** Set breakpoint in `Filter_Init()` and `Filter_Update()`, evaluate `filter->Output` on first call.
**Key question:** Is `Output` initialized in `Filter_Init()`? What does the first `Filter_Update()` use as the previous value?

---

### Bug 3 — Integer Overflow in Fan Duty Calculation

**File:** `app/SWC_MotorControl.c`
**Symptom:** Fan duty cycle is incorrect (too low or wraps around) when coolant temperature is between Warning and Critical thresholds.
**Technique:** Set breakpoint in `CalculateFanDuty()`, evaluate intermediate calculation results.
**Key question:** What data types are used for the interpolation? Can the intermediate product overflow an 8-bit or 16-bit integer?

---

### Bug 4 — Null Pointer in NvM Read-Before-Write

**File:** `services/NvM.c`
**Symptom:** Application crashes (segfault) when Diagnostic SWC tries to read NvM calibration data.
**Technique:** Set breakpoint in `NvM_ReadBlock()`, check if RAM mirror pointer is non-null before dereferencing.
**Key question:** What happens when the block hasn't been written yet? Is the RAM mirror pointer initialized to NULL or to a valid buffer?

---

### Bug 5 — FSM Logic Error (Fan Never Stops)

**File:** `app/SWC_MotorControl.c`
**Symptom:** Once the fan starts, it never fully turns off even when temperature drops to normal range.
**Technique:** Set breakpoint on the `RTE_MOTOR_STOPPING` case, step through state transitions.
**Key question:** Is the transition from `STOPPING` to `OFF` implemented? Is the condition correct?

---

### Bug 6 — Wrong CRC Polynomial

**File:** `utils/Utils_Crc.c`
**Symptom:** CRC validation failures on CAN messages or NvM data that appears to be correct.
**Technique:** Evaluate the CRC constant, compare against the expected polynomial (CRC-8/SAE J1850 = `0x1D`).
**Key question:** Is the polynomial constant value correct?

---

### Bug 7 — Race Condition on Shared Data

**File:** Multiple (shared global state)
**Symptom:** Intermittent incorrect readings or inconsistent state, not reproducible every run.
**Technique:** Set watchpoint on the shared variable. Use conditional breakpoints to catch the torn-read window.
**Key question:** Is the shared variable updated atomically? Are interrupts or scheduler tasks accessing it concurrently without protection?

---

### Bug 8 — Wrong ADC Channel Mapping

**File:** `ecual/IoHwAb_Adc.c` or `mcal/Adc.c`
**Symptom:** Temperature sensor reads incorrect or fixed values that don't match physical simulation input.
**Technique:** Evaluate ADC channel index used for the coolant temperature sensor.
**Key question:** Does the channel mapping match the expected hardware pin assignment?

---

### Bug 9 — Stack Overflow in Recursive Error Handler

**File:** `services/Det.c` or similar error handler
**Symptom:** Crash with no obvious error message; call stack shows deep recursion.
**Technique:** When crash occurs, run `stack_trace` — look for repeated function names indicating recursion.
**Key question:** Does the error handler call itself (directly or indirectly) when an error is reported?

---

### Bug 10 — Use-After-Free in CAN Retransmit

**File:** `services/CanIf.c`
**Symptom:** Crash or memory corruption during CAN retransmit path, often after first successful transmission.
**Technique:** Set breakpoint on the retransmit function, evaluate the buffer pointer before use.
**Key question:** Was the CAN buffer freed or reused between the original send and the retransmit callback?

---

## Debugging Tips

### Inspecting struct members

```bash
# Evaluate struct field
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"evaluate","params":{"expression":"ring_buf->Head"}}'

# Pretty-print entire struct
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"pretty_print","params":{"expression":"*ring_buf"}}'

# Get type information
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"whatis","params":{"expression":"ring_buf"}}'
```

### Navigating the call stack

```bash
# Get full call stack
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"stack_trace"}'

# Move to frame 2 (parent caller)
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"goto_frame","params":{"frameId":2}}'

# Get local variables in that frame
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"get_stack_frame_variables","params":{"frameId":2}}'
```

### Conditional breakpoints for intermittent bugs

```bash
# Only break when Head wraps incorrectly
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"set_breakpoint","params":{"location":{"path":"/path/Utils_RingBuffer.c","line":25},"condition":"buf->Head >= buf->Size"}}'
```
