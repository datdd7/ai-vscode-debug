/**
 * @file    ComM.h
 * @brief   ComM - Communication Manager
 */
#ifndef COMM_H
#define COMM_H

#include "../platform/Std_Types.h"

typedef uint8 ComM_ModeType;

#define COMM_NO_COMMUNICATION       0u
#define COMM_SILENT_COMMUNICATION   1u
#define COMM_FULL_COMMUNICATION     2u

void            ComM_Init(void);
Std_ReturnType  ComM_RequestComMode(ComM_ModeType Mode);
ComM_ModeType   ComM_GetCurrentMode(void);

#endif /* COMM_H */
