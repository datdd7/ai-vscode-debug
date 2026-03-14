/**
 * @file    SchM.h
 * @brief   SchM - Schedule Manager (exclusive area protection)
 */
#ifndef SCHM_H
#define SCHM_H

#include "../platform/Std_Types.h"

void SchM_Init(void);
void SchM_Enter_Exclusive(uint8 ExclusiveAreaId);
void SchM_Exit_Exclusive(uint8 ExclusiveAreaId);
void SchM_MainFunction(void);

#define SCHM_EA_TEMP_DATA   0u
#define SCHM_EA_MOTOR_DATA  1u
#define SCHM_EA_COM_DATA    2u

#endif /* SCHM_H */
