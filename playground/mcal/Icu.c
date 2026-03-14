/**
 * @file    Icu.c
 * @brief   ICU Driver - Dummy implementation
 */

#include "Icu.h"
#include <stdio.h>

static uint32  Icu_EdgeCount[ICU_MAX_CHANNELS] = {0};
static uint8   Icu_Activation[ICU_MAX_CHANNELS] = {0};
static boolean Icu_Initialized = FALSE;

static const Icu_ChannelConfigType Icu_ChannelConfigs[] = {
    { ICU_CH_FAN_TACH, 0u }
};

const Icu_ConfigType Icu_Config = {
    .NumChannels = 1u,
    .Channels    = Icu_ChannelConfigs
};

void Icu_Init(const Icu_ConfigType* ConfigPtr) {
    uint8 i;
    if (ConfigPtr == NULL_PTR) return;
    for (i = 0u; i < ConfigPtr->NumChannels; i++) {
        Icu_Activation[ConfigPtr->Channels[i].ChannelId] = ConfigPtr->Channels[i].DefaultActivation;
        Icu_EdgeCount[ConfigPtr->Channels[i].ChannelId]  = 0u;
    }
    Icu_Initialized = TRUE;
    printf("[ICU] Initialized\n");
}

void Icu_DeInit(void) { Icu_Initialized = FALSE; }

void Icu_SetActivationCondition(Icu_ChannelType Channel, Icu_ActivationType Activation) {
    if (Channel >= ICU_MAX_CHANNELS) return;
    Icu_Activation[Channel] = (uint8)Activation;
}

Icu_ValueType Icu_GetDutyCycleValues(Icu_ChannelType Channel) {
    (void)Channel;
    return 500u; /* Simulated 50% duty cycle */
}

void Icu_EnableEdgeCount(Icu_ChannelType Channel) {
    if (Channel >= ICU_MAX_CHANNELS) return;
    Icu_EdgeCount[Channel] = 0u;
}

Icu_ValueType Icu_GetEdgeNumbers(Icu_ChannelType Channel) {
    if (Channel >= ICU_MAX_CHANNELS) return 0u;
    return Icu_EdgeCount[Channel];
}
