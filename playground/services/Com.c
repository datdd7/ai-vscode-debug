/**
 * @file    Com.c
 * @brief   COM - Communication service implementation
 */

#include "Com.h"
#include <stdio.h>
#include <string.h>

static uint32 Com_SignalValues[COM_MAX_SIGNALS];
static boolean Com_Initialized = FALSE;

void Com_Init(void) {
    memset(Com_SignalValues, 0, sizeof(Com_SignalValues));
    Com_Initialized = TRUE;
    printf("[COM] Initialized\n");
}

Std_ReturnType Com_SendSignal(Com_SignalIdType SignalId, const void* SignalDataPtr) {
    if (!Com_Initialized || SignalId >= COM_MAX_SIGNALS || SignalDataPtr == NULL_PTR) return E_NOT_OK;
    memcpy(&Com_SignalValues[SignalId], SignalDataPtr, sizeof(uint32));
    return E_OK;
}

Std_ReturnType Com_ReceiveSignal(Com_SignalIdType SignalId, void* SignalDataPtr) {
    if (!Com_Initialized || SignalId >= COM_MAX_SIGNALS || SignalDataPtr == NULL_PTR) return E_NOT_OK;
    memcpy(SignalDataPtr, &Com_SignalValues[SignalId], sizeof(uint32));
    return E_OK;
}

void Com_MainFunction(void) {
    /* Periodic processing - would normally handle PDU routing */
}
