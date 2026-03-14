/**
 * @file    Pwm_Cfg.h
 * @brief   PWM Driver configuration
 */

#ifndef PWM_CFG_H
#define PWM_CFG_H

#include "../platform/Std_Types.h"

#define PWM_MAX_CHANNELS    4u

/* PWM duty cycle range: 0 = 0%, 0x8000 = 100% (AUTOSAR convention) */
#define PWM_DUTY_0          0x0000u
#define PWM_DUTY_100        0x8000u

/* Channel IDs */
#define PWM_CH_FAN          0u
#define PWM_CH_BUZZER       1u

typedef struct {
    uint8   ChannelId;
    uint16  DefaultPeriod;  /* in microseconds */
    uint16  DefaultDuty;
    uint8   Polarity;       /* 0=HIGH, 1=LOW */
} Pwm_ChannelConfigType;

typedef struct {
    uint8                      NumChannels;
    const Pwm_ChannelConfigType* Channels;
} Pwm_ConfigType;

extern const Pwm_ConfigType Pwm_Config;

#endif /* PWM_CFG_H */
