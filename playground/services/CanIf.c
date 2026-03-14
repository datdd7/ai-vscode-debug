/**
 * @file    CanIf.c
 */
#include "CanIf.h"
#include <stdio.h>
#include <string.h>

static CanIf_PduType CanIf_TxBuffer[CANIF_MAX_TX_PDUS];
static uint8 CanIf_TxCount = 0u;

void CanIf_Init(void) {
    memset(CanIf_TxBuffer, 0, sizeof(CanIf_TxBuffer));
    CanIf_TxCount = 0u;
    printf("[CanIf] Initialized\n");
}

Std_ReturnType CanIf_Transmit(Can_HwHandleType Hth, const CanIf_PduType* PduInfo) {
    (void)Hth;
    if (PduInfo == NULL_PTR) return E_NOT_OK;

    if (CanIf_TxCount < CANIF_MAX_TX_PDUS) {
        memcpy(&CanIf_TxBuffer[CanIf_TxCount], PduInfo, sizeof(CanIf_PduType));
        CanIf_TxCount++;
        printf("[CAN] TX ID=0x%03X Len=%u\n", PduInfo->CanId, PduInfo->Length);
        return E_OK;
    }
    return E_NOT_OK;
}

void CanIf_RxIndication(Can_HwHandleType Hrh, const CanIf_PduType* PduInfo) {
    (void)Hrh;
    if (PduInfo != NULL_PTR) {
        printf("[CAN] RX ID=0x%03X Len=%u\n", PduInfo->CanId, PduInfo->Length);
    }
}
