/**
 * @file    Mcu.c
 * @brief   MCU Driver - Dummy implementation
 */

#include "Mcu.h"
#include <stdio.h>

/* ============================================================================
 *  Configuration Instance
 * ============================================================================ */
const Mcu_ConfigType Mcu_Config = {
    .ClockFrequency = MCU_CLOCK_FREQ_HZ,
    .ClockSource    = MCU_CLK_SRC_PLL,
    .PllMultiplier  = 9u,
    .PllDivider     = 1u
};

/* ============================================================================
 *  Internal State
 * ============================================================================ */
static boolean         Mcu_Initialized = FALSE;
static Mcu_PllStatusType Mcu_PllStatus = MCU_PLL_UNLOCKED;
static Mcu_ResetType   Mcu_LastReset   = MCU_POWER_ON_RESET;

/* ============================================================================
 *  API Implementation
 * ============================================================================ */
void Mcu_Init(const Mcu_ConfigType* ConfigPtr) {
    if (ConfigPtr == NULL_PTR) {
        return;
    }
    printf("[MCU] Init: Clock=%u Hz, Src=%u, PLL=%ux/%u\n",
           ConfigPtr->ClockFrequency, ConfigPtr->ClockSource,
           ConfigPtr->PllMultiplier, ConfigPtr->PllDivider);
    Mcu_Initialized = TRUE;
}

Std_ReturnType Mcu_InitRamSection(uint8 RamSection) {
    if (!Mcu_Initialized) return E_NOT_OK;
    printf("[MCU] RAM Section %u initialized\n", RamSection);
    return E_OK;
}

Std_ReturnType Mcu_InitClock(Mcu_ClockType ClockSetting) {
    if (!Mcu_Initialized) return E_NOT_OK;
    printf("[MCU] Clock setting %u applied\n", ClockSetting);
    Mcu_PllStatus = MCU_PLL_LOCKED;
    return E_OK;
}

Mcu_PllStatusType Mcu_GetPllStatus(void) {
    return Mcu_PllStatus;
}

Mcu_ResetType Mcu_GetResetReason(void) {
    return Mcu_LastReset;
}

void Mcu_PerformReset(void) {
    printf("[MCU] *** SOFTWARE RESET ***\n");
    Mcu_LastReset = MCU_SW_RESET;
    /* In real HW, this would reset the MCU */
}

void Mcu_SetMode(Mcu_ModeType McuMode) {
    printf("[MCU] Mode set to %u\n", McuMode);
}
