/**
 * @file    BswM.c
 */
#include "BswM.h"
#include <stdio.h>

static BswM_ModeType BswM_Mode = BSWM_MODE_STARTUP;

void BswM_Init(void) {
    BswM_Mode = BSWM_MODE_STARTUP;
    printf("[BswM] Initialized\n");
}

void BswM_MainFunction(void) {
    /* Mode arbitration logic */
}

BswM_ModeType BswM_GetCurrentMode(void) { return BswM_Mode; }

void BswM_RequestMode(BswM_ModeType Mode) {
    printf("[BswM] Mode request: %u -> %u\n", BswM_Mode, Mode);
    BswM_Mode = Mode;
}
