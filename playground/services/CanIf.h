/**
 * @file    CanIf.h
 * @brief   CanIf - CAN Interface
 */
#ifndef CANIF_H
#define CANIF_H

#include "../platform/Std_Types.h"

typedef uint32 Can_IdType;
typedef uint8  Can_HwHandleType;

#define CANIF_MAX_TX_PDUS   8u
#define CANIF_MAX_RX_PDUS   8u

typedef struct {
    Can_IdType  CanId;
    uint8       Data[8];
    uint8       Length;
} CanIf_PduType;

void            CanIf_Init(void);
Std_ReturnType  CanIf_Transmit(Can_HwHandleType Hth, const CanIf_PduType* PduInfo);
void            CanIf_RxIndication(Can_HwHandleType Hrh, const CanIf_PduType* PduInfo);

#endif /* CANIF_H */
