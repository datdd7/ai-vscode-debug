# Engine Cooling System ECU — Debug Training Project

An AUTOSAR-like embedded C project (~100 files) designed for **AI debugging training**.

## Architecture

```
┌─────────────────────────────────────────┐
│         Application SWCs (app/)         │
│  TempMonitor │ MotorCtrl │ LightCtrl    │
│  ButtonHndlr │ Dashboard │ Diagnostic   │
│              │ Communication            │
├─────────────────────────────────────────┤
│            RTE (rte/)                   │
├─────────────────────────────────────────┤
│          Services (services/)           │
│  Os │ Com │ Dem │ Det │ NvM │ EcuM     │
│  BswM │ SchM │ ComM │ CanIf            │
├─────────────────────────────────────────┤
│     ECU Abstraction (ecual/)            │
│  IoHwAb: Dio, Adc, Pwm                 │
├─────────────────────────────────────────┤
│            MCAL (mcal/)                 │
│  Mcu │ Port │ Dio │ Adc │ Pwm │ Gpt   │
│  Spi │ Uart │ Icu │ Wdg │ Fls         │
├─────────────────────────────────────────┤
│     Platform Types (platform/)          │
└─────────────────────────────────────────┘
```

## Quick Start

```bash
make clean && make     # Build with debug symbols
make run               # Run simulation
make debug             # Launch GDB
make count             # Count project files
```

## Application: Engine Cooling System

- Reads coolant temperature via ADC sensor
- Controls cooling fan speed via PWM (proportional to temperature)
- LED indicators: Green (Normal), Yellow (Warning), Red (Critical)
- Button for manual fan override
- UART dashboard output (periodic status display)
- CAN communication for diagnostics
- NvM for calibration data storage
- Watchdog for safety monitoring

## Debugging Exercises

This project contains **10 intentional bugs** across different severity levels.
See `debug_scenarios.md` for detailed exercises.

| # | Severity | Category | Hint |
|---|----------|----------|------|
| 1 | Medium | Buffer overflow | Ring buffer wraps wrong |
| 2 | High | Uninitialized var | Filter output garbage on first run |
| 3 | High | Integer overflow | Fan duty cycle wrong at high temps |
| 4 | Critical | Null pointer | NvM read before write crashes |
| 5 | Medium | Logic error | Fan never fully stops |
| 6 | Low | Wrong constant | CRC doesn't match tester |
| 7 | High | Race condition | Torn reads on shared temp data |
| 8 | Medium | Config error | Wrong ADC channel mapping |
| 9 | Critical | Stack overflow | Recursive error handler |
| 10 | Critical | Use-after-free | CAN retransmit accesses freed mem |
