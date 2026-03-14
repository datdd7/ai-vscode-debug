# AI Debugging Training Scenarios

Each scenario describes a symptom, expected behavior, and hints for finding the root cause.

---

## Scenario 1: Ring Buffer Corruption (Bug #1)

**File:** `utils/Utils_RingBuffer.c`
**Symptom:** After pushing exactly `Size` elements, subsequent operations produce corrupted data or crash.
**Expected:** Circular wrap-around should keep Head/Tail within [0, Size-1].
**Hint:** Check the modulo operation in `RingBuffer_Push()` and `RingBuffer_Pop()`.

---

## Scenario 2: Temperature Filter Incorrect on Startup (Bug #2)

**File:** `utils/Utils_Filter.c`
**Symptom:** First ~10 temperature readings from Dashboard show wildly incorrect values before slowly converging.
**Expected:** Filter should immediately track near the true input on first sample.
**Hint:** Check `Filter_Init()` — is `Output` properly initialized? What happens on the first call to `Filter_Update()`?

---

## Scenario 3: Fan Runs at Wrong Speed (Bug #3)

**File:** `app/SWC_MotorControl.c`
**Symptom:** When coolant temperature is between Warning and Critical thresholds, fan duty cycle is incorrect (too low or wrapped around).
**Expected:** Linear interpolation from FanMinDuty to FanMaxDuty.
**Hint:** Check `CalculateFanDuty()` — what data types are used for intermediate calculations?

---

## Scenario 4: Crash on Diagnostic Data Read (Bug #4)

**File:** `services/NvM.c`
**Symptom:** Application crashes (segfault) when Diagnostic SWC tries to read NvM calibration data.
**Expected:** Read should either succeed or return E_NOT_OK gracefully.
**Hint:** Check `NvM_ReadBlock()` — what happens when the block hasn't been written yet? Is the RAM mirror pointer valid?

---

## Scenario 5: Fan Never Stops (Bug #5)

**File:** `app/SWC_MotorControl.c`
**Symptom:** Once the fan starts, it never fully turns off even when temperature drops to normal.
**Expected:** FSM should transition RUNNING→STOPPING→OFF.
**Hint:** Check the FSM state transition in the `RTE_MOTOR_STOPPING` case.

---

## Scenario 6: CRC Mismatch with Diagnostic Tester (Bug #6)

**File:** `utils/Utils_Crc.c`
**Symptom:** CRC-8 values calculated by the ECU don't match what an external diagnostic tester expects.
**Expected:** Should use SAE-J1850 polynomial (0x1D) for automotive applications.
**Hint:** Check the polynomial constant in `Utils_Crc8()`.

---

## Scenario 7: Intermittent Wrong Temperature Readings (Bug #7)

**File:** `app/SWC_TempMonitor.c`
**Symptom:** Dashboard occasionally shows a temperature value that's half-updated (lower byte from new value, upper byte from old value).
**Expected:** Atomic 16-bit write with exclusive area protection.
**Hint:** Check if `Rte_Write_CoolantTemp()` is protected by `SchM_Enter_Exclusive()`.

---

## Scenario 8: Dashboard Always Shows Same Temperature (Bug #8)

**File:** `mcal/Adc_Cfg.h`
**Symptom:** Regardless of simulated temperature changes, dashboard consistently shows ~33°C.
**Expected:** Temperature should track the simulated ADC ramp-up profile (25°C → 95°C).
**Hint:** Check the ADC channel mapping — which physical channel does `ADC_CH_COOLANT_TEMP` point to?

---

## Scenario 9: Stack Overflow in Diagnostic Handler (Bug #9)

**File:** `app/SWC_Diagnostic.c`
**Symptom:** Application crashes with stack overflow (segfault) during diagnostic processing.
**Expected:** Error handler should log and return gracefully.
**Hint:** Check `Diag_HandleError()` — is there a recursion depth limit?

---

## Scenario 10: Garbage Data in CAN Retransmission (Bug #10)

**File:** `app/SWC_Communication.c`
**Symptom:** CAN retransmission CRC check prints garbage or crashes intermittently.
**Expected:** Retransmission should use valid buffer data.
**Hint:** Check the lifecycle of `Comm_LastTxData` — is it still valid when accessed?

---

## Debugging Tips

1. **Use GDB**: `make debug` launches GDB with TUI
2. **Set breakpoints**: `break SWC_TempMonitor_MainFunction`
3. **Watch variables**: `watch Rte_CoolantTemp`
4. **Catch crashes**: `catch signal SIGSEGV`
5. **Address Sanitizer**: Rebuild with `-fsanitize=address` to catch memory bugs
6. **Valgrind**: `valgrind ./build/cooling_ecu` for memory analysis
