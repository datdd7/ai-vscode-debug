/**
 * @file    Pwm.c
 * @brief   PWM Driver - Dummy implementation
 */

#include "Pwm.h"
#include <stdio.h>

static uint16 Pwm_CurrentDuty[PWM_MAX_CHANNELS]   = {0};
static uint16 Pwm_CurrentPeriod[PWM_MAX_CHANNELS]  = {0};
static boolean Pwm_Initialized = FALSE;

static const Pwm_ChannelConfigType Pwm_ChannelConfigs[] = {
    { PWM_CH_FAN,    1000u, PWM_DUTY_0, 0u },
    { PWM_CH_BUZZER, 500u,  PWM_DUTY_0, 0u }
};

const Pwm_ConfigType Pwm_Config = {
    .NumChannels = 2u,
    .Channels    = Pwm_ChannelConfigs
};

void Pwm_Init(const Pwm_ConfigType* ConfigPtr) {
    uint8 i;
    if (ConfigPtr == NULL_PTR) return;

    for (i = 0u; i < ConfigPtr->NumChannels; i++) {
        Pwm_CurrentDuty[ConfigPtr->Channels[i].ChannelId]  = ConfigPtr->Channels[i].DefaultDuty;
        Pwm_CurrentPeriod[ConfigPtr->Channels[i].ChannelId] = ConfigPtr->Channels[i].DefaultPeriod;
    }
    Pwm_Initialized = TRUE;
    printf("[PWM] Initialized %u channels\n", ConfigPtr->NumChannels);
}

void Pwm_DeInit(void) {
    uint8 i;
    for (i = 0u; i < PWM_MAX_CHANNELS; i++) {
        Pwm_CurrentDuty[i]  = 0u;
        Pwm_CurrentPeriod[i] = 0u;
    }
    Pwm_Initialized = FALSE;
}

void Pwm_SetDutyCycle(Pwm_ChannelType ChannelNumber, uint16 DutyCycle) {
    if (!Pwm_Initialized || ChannelNumber >= PWM_MAX_CHANNELS) return;
    Pwm_CurrentDuty[ChannelNumber] = DutyCycle;
}

void Pwm_SetPeriodAndDuty(Pwm_ChannelType ChannelNumber, Pwm_PeriodType Period, uint16 DutyCycle) {
    if (!Pwm_Initialized || ChannelNumber >= PWM_MAX_CHANNELS) return;
    Pwm_CurrentPeriod[ChannelNumber] = Period;
    Pwm_CurrentDuty[ChannelNumber]   = DutyCycle;
}

void Pwm_SetOutputToIdle(Pwm_ChannelType ChannelNumber) {
    if (!Pwm_Initialized || ChannelNumber >= PWM_MAX_CHANNELS) return;
    Pwm_CurrentDuty[ChannelNumber] = PWM_DUTY_0;
}

uint16 Pwm_GetCurrentDutyCycle(Pwm_ChannelType ChannelNumber) {
    if (ChannelNumber >= PWM_MAX_CHANNELS) return 0u;
    return Pwm_CurrentDuty[ChannelNumber];
}
