/**
 * @file    Gpt_Cfg.h
 * @brief   GPT Driver configuration
 */

#ifndef GPT_CFG_H
#define GPT_CFG_H

#include "../platform/Std_Types.h"

#define GPT_MAX_CHANNELS    4u

#define GPT_CH_OS_TICK      0u
#define GPT_CH_WDG_TRIGGER  1u
#define GPT_CH_DEBOUNCE     2u

typedef struct {
    uint8   ChannelId;
    uint32  MaxValue;
    uint8   Mode;       /* 0=ONE_SHOT, 1=CONTINUOUS */
} Gpt_ChannelConfigType;

typedef struct {
    uint8                      NumChannels;
    const Gpt_ChannelConfigType* Channels;
} Gpt_ConfigType;

extern const Gpt_ConfigType Gpt_Config;

#endif /* GPT_CFG_H */
