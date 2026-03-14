/**
 * @file    Icu_Cfg.h
 * @brief   ICU Driver configuration
 */

#ifndef ICU_CFG_H
#define ICU_CFG_H

#include "../platform/Std_Types.h"

#define ICU_MAX_CHANNELS    4u
#define ICU_CH_FAN_TACH     0u  /* Fan tachometer feedback */

typedef struct {
    uint8  ChannelId;
    uint8  DefaultActivation;
} Icu_ChannelConfigType;

typedef struct {
    uint8                     NumChannels;
    const Icu_ChannelConfigType* Channels;
} Icu_ConfigType;

extern const Icu_ConfigType Icu_Config;

#endif /* ICU_CFG_H */
