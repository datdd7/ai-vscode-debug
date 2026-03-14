/**
 * @file    IoHwAb_Pwm.h
 * @brief   I/O HW Abstraction - PWM signals
 */

#ifndef IOHWAB_PWM_H
#define IOHWAB_PWM_H

#include "../platform/Std_Types.h"

typedef enum {
    IOHWAB_SIG_FAN_SPEED = 0,
    IOHWAB_SIG_BUZZER,
    IOHWAB_SIG_PWM_COUNT
} IoHwAb_PwmSignalType;

void            IoHwAb_Pwm_Init(void);
Std_ReturnType  IoHwAb_Pwm_SetDuty(IoHwAb_PwmSignalType Signal, uint16 DutyPercent);
uint16          IoHwAb_Pwm_GetDuty(IoHwAb_PwmSignalType Signal);

#endif /* IOHWAB_PWM_H */
