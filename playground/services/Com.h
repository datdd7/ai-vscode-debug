/**
 * @file    Com.h
 * @brief   COM - Communication service
 */
#ifndef COM_H
#define COM_H

#include "../platform/Std_Types.h"

typedef uint16 Com_SignalIdType;
typedef uint16 Com_SignalGroupIdType;

#define COM_MAX_SIGNALS     16u

/* Signal IDs for CAN communication */
#define COM_SIG_COOLANT_TEMP    0u
#define COM_SIG_FAN_SPEED       1u
#define COM_SIG_ENGINE_STATUS   2u
#define COM_SIG_ERROR_CODE      3u

void            Com_Init(void);
Std_ReturnType  Com_SendSignal(Com_SignalIdType SignalId, const void* SignalDataPtr);
Std_ReturnType  Com_ReceiveSignal(Com_SignalIdType SignalId, void* SignalDataPtr);
void            Com_MainFunction(void);

#endif /* COM_H */
