/**
 * @file    Wdg_Cfg.h
 */
#ifndef WDG_CFG_H
#define WDG_CFG_H

#include "../platform/Std_Types.h"

#define WDG_INITIAL_TIMEOUT     1000u  /* ms */
#define WDG_MAX_TIMEOUT         5000u  /* ms */

typedef struct {
    uint16 InitialTimeout;
    uint8  InitialMode;
} Wdg_ConfigType;

extern const Wdg_ConfigType Wdg_Config;

#endif /* WDG_CFG_H */
