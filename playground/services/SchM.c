/**
 * @file    SchM.c
 */
#include "SchM.h"
#include "Os.h"
#include <stdio.h>

static uint8 SchM_NestCount[8u] = {0};

void SchM_Init(void) { printf("[SchM] Initialized\n"); }

void SchM_Enter_Exclusive(uint8 ExclusiveAreaId) {
    if (ExclusiveAreaId < 8u) {
        SchM_NestCount[ExclusiveAreaId]++;
        Os_EnterCritical();
    }
}

void SchM_Exit_Exclusive(uint8 ExclusiveAreaId) {
    if (ExclusiveAreaId < 8u && SchM_NestCount[ExclusiveAreaId] > 0u) {
        SchM_NestCount[ExclusiveAreaId]--;
        Os_ExitCritical();
    }
}

void SchM_MainFunction(void) { /* placeholder */ }
