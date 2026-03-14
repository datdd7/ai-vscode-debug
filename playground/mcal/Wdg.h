/**
 * @file    Wdg.h
 * @brief   WDG Driver - Watchdog Timer
 */

#ifndef WDG_H
#define WDG_H

#include "../platform/Std_Types.h"
#include "Wdg_Cfg.h"

typedef enum {
    WDGIF_OFF_MODE = 0,
    WDGIF_SLOW_MODE,
    WDGIF_FAST_MODE
} WdgIf_ModeType;

void            Wdg_Init(const Wdg_ConfigType* ConfigPtr);
Std_ReturnType  Wdg_SetMode(WdgIf_ModeType Mode);
void            Wdg_SetTriggerCondition(uint16 Timeout);
void            Wdg_Trigger(void);
uint32          Wdg_GetTriggerCounter(void);

#endif /* WDG_H */
