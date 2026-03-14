/**
 * @file    Wdg.c
 * @brief   WDG Driver - Dummy implementation
 */

#include "Wdg.h"
#include <stdio.h>

static uint16  Wdg_Timeout     = 0u;
static uint32  Wdg_TriggerCnt  = 0u;
static uint8   Wdg_Mode        = 0u;
static boolean Wdg_Initialized = FALSE;

const Wdg_ConfigType Wdg_Config = {
    .InitialTimeout = WDG_INITIAL_TIMEOUT,
    .InitialMode    = 1u  /* SLOW */
};

void Wdg_Init(const Wdg_ConfigType* ConfigPtr) {
    if (ConfigPtr == NULL_PTR) return;
    Wdg_Timeout    = ConfigPtr->InitialTimeout;
    Wdg_Mode       = ConfigPtr->InitialMode;
    Wdg_TriggerCnt = 0u;
    Wdg_Initialized = TRUE;
    printf("[WDG] Initialized, timeout=%u ms\n", Wdg_Timeout);
}

Std_ReturnType Wdg_SetMode(WdgIf_ModeType Mode) {
    if (!Wdg_Initialized) return E_NOT_OK;
    Wdg_Mode = (uint8)Mode;
    printf("[WDG] Mode set to %u\n", Wdg_Mode);
    return E_OK;
}

void Wdg_SetTriggerCondition(uint16 Timeout) {
    Wdg_Timeout = Timeout;
}

void Wdg_Trigger(void) {
    if (!Wdg_Initialized) return;
    Wdg_TriggerCnt++;
}

uint32 Wdg_GetTriggerCounter(void) {
    return Wdg_TriggerCnt;
}
