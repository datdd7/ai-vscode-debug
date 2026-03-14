/**
 * @file    IoHwAb_Pwm.c
 * @brief   I/O HW Abstraction - PWM signal implementation
 */

#include "IoHwAb_Pwm.h"
#include "../mcal/Pwm.h"

static const Pwm_ChannelType IoHwAb_Pwm_Map[IOHWAB_SIG_PWM_COUNT] = {
    [IOHWAB_SIG_FAN_SPEED] = PWM_CH_FAN,
    [IOHWAB_SIG_BUZZER]    = PWM_CH_BUZZER,
};

void IoHwAb_Pwm_Init(void) {
    /* PWM already initialized */
}

Std_ReturnType IoHwAb_Pwm_SetDuty(IoHwAb_PwmSignalType Signal, uint16 DutyPercent) {
    uint16 dutyCycle;
    if (Signal >= IOHWAB_SIG_PWM_COUNT) return E_NOT_OK;

    /* Convert percentage (0-100) to AUTOSAR range (0-0x8000) */
    if (DutyPercent > 100u) DutyPercent = 100u;
    dutyCycle = (uint16)((uint32)DutyPercent * PWM_DUTY_100 / 100u);

    Pwm_SetDutyCycle(IoHwAb_Pwm_Map[Signal], dutyCycle);
    return E_OK;
}

uint16 IoHwAb_Pwm_GetDuty(IoHwAb_PwmSignalType Signal) {
    if (Signal >= IOHWAB_SIG_PWM_COUNT) return 0u;
    uint16 rawDuty = Pwm_GetCurrentDutyCycle(IoHwAb_Pwm_Map[Signal]);
    /* Convert back to percentage */
    return (uint16)((uint32)rawDuty * 100u / PWM_DUTY_100);
}
