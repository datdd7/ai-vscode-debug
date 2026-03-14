/**
 * @file    BswM.h
 * @brief   BswM - BSW Mode Manager
 */
#ifndef BSWM_H
#define BSWM_H

#include "../platform/Std_Types.h"

typedef uint8 BswM_ModeType;

#define BSWM_MODE_STARTUP       0u
#define BSWM_MODE_NORMAL        1u
#define BSWM_MODE_DEGRADED      2u
#define BSWM_MODE_SHUTDOWN      3u

void            BswM_Init(void);
void            BswM_MainFunction(void);
BswM_ModeType   BswM_GetCurrentMode(void);
void            BswM_RequestMode(BswM_ModeType Mode);

#endif /* BSWM_H */
