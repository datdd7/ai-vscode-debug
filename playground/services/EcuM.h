/**
 * @file    EcuM.h
 * @brief   EcuM - ECU State Manager
 */
#ifndef ECUM_H
#define ECUM_H

#include "../platform/Std_Types.h"

typedef enum {
    ECUM_STATE_STARTUP = 0,
    ECUM_STATE_RUN,
    ECUM_STATE_SLEEP,
    ECUM_STATE_SHUTDOWN
} EcuM_StateType;

void            EcuM_Init(void);
void            EcuM_StartupTwo(void);
EcuM_StateType  EcuM_GetState(void);
void            EcuM_SetState(EcuM_StateType State);
void            EcuM_Shutdown(void);

#endif /* ECUM_H */
