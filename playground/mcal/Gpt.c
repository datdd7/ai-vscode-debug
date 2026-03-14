/**
 * @file    Gpt.c
 * @brief   GPT Driver - Dummy implementation
 */

#include "Gpt.h"
#include <stdio.h>

static uint32  Gpt_Counter[GPT_MAX_CHANNELS]   = {0};
static uint32  Gpt_Target[GPT_MAX_CHANNELS]     = {0};
static uint8   Gpt_Running[GPT_MAX_CHANNELS]    = {0};
static uint8   Gpt_Mode[GPT_MAX_CHANNELS]       = {0};
static boolean Gpt_Initialized = FALSE;

static const Gpt_ChannelConfigType Gpt_ChannelConfigs[] = {
    { GPT_CH_OS_TICK,     0xFFFFFFFFu, 1u },  /* Continuous */
    { GPT_CH_WDG_TRIGGER, 1000u,       1u },
    { GPT_CH_DEBOUNCE,    50u,         0u }    /* One-shot */
};

const Gpt_ConfigType Gpt_Config = {
    .NumChannels = 3u,
    .Channels    = Gpt_ChannelConfigs
};

void Gpt_Init(const Gpt_ConfigType* ConfigPtr) {
    uint8 i;
    if (ConfigPtr == NULL_PTR) return;

    for (i = 0u; i < ConfigPtr->NumChannels; i++) {
        uint8 ch = ConfigPtr->Channels[i].ChannelId;
        Gpt_Mode[ch]    = ConfigPtr->Channels[i].Mode;
        Gpt_Counter[ch] = 0u;
        Gpt_Target[ch]  = 0u;
        Gpt_Running[ch] = 0u;
    }
    Gpt_Initialized = TRUE;
    printf("[GPT] Initialized %u channels\n", ConfigPtr->NumChannels);
}

void Gpt_DeInit(void) {
    Gpt_Initialized = FALSE;
}

void Gpt_StartTimer(Gpt_ChannelType Channel, Gpt_ValueType Value) {
    if (!Gpt_Initialized || Channel >= GPT_MAX_CHANNELS) return;
    Gpt_Counter[Channel] = 0u;
    Gpt_Target[Channel]  = Value;
    Gpt_Running[Channel] = 1u;
}

void Gpt_StopTimer(Gpt_ChannelType Channel) {
    if (Channel >= GPT_MAX_CHANNELS) return;
    Gpt_Running[Channel] = 0u;
}

Gpt_ValueType Gpt_GetTimeElapsed(Gpt_ChannelType Channel) {
    if (Channel >= GPT_MAX_CHANNELS) return 0u;
    return Gpt_Counter[Channel];
}

Gpt_ValueType Gpt_GetTimeRemaining(Gpt_ChannelType Channel) {
    if (Channel >= GPT_MAX_CHANNELS) return 0u;
    if (Gpt_Counter[Channel] >= Gpt_Target[Channel]) return 0u;
    return Gpt_Target[Channel] - Gpt_Counter[Channel];
}

void Gpt_Sim_Tick(void) {
    uint8 i;
    for (i = 0u; i < GPT_MAX_CHANNELS; i++) {
        if (Gpt_Running[i]) {
            Gpt_Counter[i]++;
            if (Gpt_Counter[i] >= Gpt_Target[i]) {
                if (Gpt_Mode[i] == 1u) {
                    Gpt_Counter[i] = 0u; /* Continuous: restart */
                } else {
                    Gpt_Running[i] = 0u; /* One-shot: stop */
                }
            }
        }
    }
}
