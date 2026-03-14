/**
 * @file    Mcu.h
 * @brief   MCU Driver - Microcontroller initialization and control
 */

#ifndef MCU_H
#define MCU_H

#include "../platform/Std_Types.h"
#include "Mcu_Cfg.h"

/* ============================================================================
 *  Type Definitions
 * ============================================================================ */
typedef uint8 Mcu_ClockType;
typedef uint8 Mcu_RawResetType;
typedef uint8 Mcu_ModeType;
typedef uint8 Mcu_PllStatusType;

#define MCU_PLL_LOCKED      ((Mcu_PllStatusType)0x00u)
#define MCU_PLL_UNLOCKED    ((Mcu_PllStatusType)0x01u)
#define MCU_PLL_STATUS_UNDEFINED ((Mcu_PllStatusType)0x02u)

typedef enum {
    MCU_POWER_ON_RESET = 0,
    MCU_WATCHDOG_RESET,
    MCU_SW_RESET,
    MCU_RESET_UNDEFINED
} Mcu_ResetType;

/* ============================================================================
 *  Function Prototypes
 * ============================================================================ */
void                Mcu_Init(const Mcu_ConfigType* ConfigPtr);
Std_ReturnType      Mcu_InitRamSection(uint8 RamSection);
Std_ReturnType      Mcu_InitClock(Mcu_ClockType ClockSetting);
Mcu_PllStatusType   Mcu_GetPllStatus(void);
Mcu_ResetType       Mcu_GetResetReason(void);
void                Mcu_PerformReset(void);
void                Mcu_SetMode(Mcu_ModeType McuMode);

#endif /* MCU_H */
