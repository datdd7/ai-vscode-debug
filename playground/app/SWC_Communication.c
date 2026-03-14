/**
 * @file    SWC_Communication.c
 * @brief   CAN communication handler
 *
 * BUG #10: Use-after-free (dangling pointer).
 *          A transmit buffer is allocated with malloc, sent via CAN,
 *          then freed. But a pointer to it is retained and used later,
 *          causing undefined behavior.
 */

#include "SWC_Communication.h"
#include "../services/Com.h"
#include "../services/CanIf.h"
#include "../utils/Utils_Crc.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#define CAN_ID_ENGINE_STATUS    0x100u
#define CAN_ID_TEMP_DATA        0x200u
#define CAN_MSG_INTERVAL        5u

static uint32  Comm_CycleCount = 0u;
static uint8*  Comm_LastTxData = NULL_PTR;  /* BUG #10: dangling pointer */

static void Comm_SendEngineStatus(void) {
    CanIf_PduType pdu;
    pdu.CanId  = CAN_ID_ENGINE_STATUS;
    pdu.Length  = 4u;

    /* Pack status data */
    pdu.Data[0] = (uint8)Rte_SystemStatus;
    pdu.Data[1] = (uint8)Rte_MotorState;
    pdu.Data[2] = Rte_FanDutyCycle;
    pdu.Data[3] = Rte_ManualOverrideActive ? 1u : 0u;

    CanIf_Transmit(0u, &pdu);
}

static void Comm_SendTempData(void) {
    /* === BUG #10: Use-after-free ===
     * We malloc a buffer, build the CAN message, send it, then free it.
     * But we store the pointer in Comm_LastTxData and access it later.
     */
    uint8* txBuf = (uint8*)malloc(8u);
    if (txBuf == NULL_PTR) return;

    /* Build temp data message */
    txBuf[0] = (uint8)(Rte_CoolantTemp >> 8);
    txBuf[1] = (uint8)(Rte_CoolantTemp & 0xFF);
    txBuf[2] = (uint8)(Rte_AmbientTemp >> 8);
    txBuf[3] = (uint8)(Rte_AmbientTemp & 0xFF);

    /* Calculate CRC (uses utility) */
    uint8 crc = Utils_Crc8(txBuf, 4u);
    txBuf[4] = crc;

    CanIf_PduType pdu;
    pdu.CanId  = CAN_ID_TEMP_DATA;
    pdu.Length  = 5u;
    memcpy(pdu.Data, txBuf, 5u);
    CanIf_Transmit(0u, &pdu);

    /* Save pointer for "retransmission" feature */
    Comm_LastTxData = txBuf;

    /* Free the buffer */
    free(txBuf);

    /* BUG #10: Comm_LastTxData now points to freed memory!
     * If we access Comm_LastTxData later, it's use-after-free.
     * Should set: Comm_LastTxData = NULL_PTR; after free()
     */
}

void SWC_Communication_Init(void) {
    Comm_CycleCount = 0u;
    Comm_LastTxData = NULL_PTR;
}

void SWC_Communication_MainFunction(void) {
    Comm_CycleCount++;

    if (Comm_CycleCount % CAN_MSG_INTERVAL == 0u) {
        Comm_SendEngineStatus();
        Comm_SendTempData();
    }

    /* "Retransmission check" - uses dangling pointer every 20 cycles */
    if (Comm_CycleCount % 20u == 0u && Comm_LastTxData != NULL_PTR) {
        /* === BUG #10 trigger: accessing freed memory ===
         * This reads from Comm_LastTxData which was already freed.
         * In practice, this might "work" sometimes (if memory wasn't reused)
         * or produce garbage values or crash.
         */
        printf("[COMM] Last TX CRC check: 0x%02X\n", Comm_LastTxData[4]);
    }
}
