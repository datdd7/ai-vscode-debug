/**
 * @file    Mcu_Cfg.h
 * @brief   MCU Driver configuration
 */

#ifndef MCU_CFG_H
#define MCU_CFG_H

#include "../platform/Std_Types.h"

#define MCU_CLK_SRC_INTERNAL    0u
#define MCU_CLK_SRC_EXTERNAL    1u
#define MCU_CLK_SRC_PLL         2u

#define MCU_CLOCK_FREQ_HZ       72000000u  /* 72 MHz */
#define MCU_RAM_SECTIONS        1u

typedef struct {
    uint32 ClockFrequency;
    uint8  ClockSource;
    uint8  PllMultiplier;
    uint8  PllDivider;
} Mcu_ConfigType;

extern const Mcu_ConfigType Mcu_Config;

#endif /* MCU_CFG_H */
