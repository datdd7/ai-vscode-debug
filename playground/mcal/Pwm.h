/**
 * @file    Pwm.h
 * @brief   PWM Driver - Pulse Width Modulation
 */

#ifndef PWM_H
#define PWM_H

#include "../platform/Std_Types.h"
#include "Pwm_Cfg.h"

typedef uint8  Pwm_ChannelType;
typedef uint16 Pwm_PeriodType;

void    Pwm_Init(const Pwm_ConfigType* ConfigPtr);
void    Pwm_DeInit(void);
void    Pwm_SetDutyCycle(Pwm_ChannelType ChannelNumber, uint16 DutyCycle);
void    Pwm_SetPeriodAndDuty(Pwm_ChannelType ChannelNumber, Pwm_PeriodType Period, uint16 DutyCycle);
void    Pwm_SetOutputToIdle(Pwm_ChannelType ChannelNumber);
uint16  Pwm_GetCurrentDutyCycle(Pwm_ChannelType ChannelNumber);

#endif /* PWM_H */
