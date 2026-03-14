/**
 * @file    Icu.h
 * @brief   ICU Driver - Input Capture Unit
 */

#ifndef ICU_H
#define ICU_H

#include "../platform/Std_Types.h"
#include "Icu_Cfg.h"

typedef uint8  Icu_ChannelType;
typedef uint32 Icu_ValueType;

typedef enum {
    ICU_MODE_NORMAL = 0,
    ICU_MODE_SLEEP
} Icu_ModeType;

typedef enum {
    ICU_RISING_EDGE = 0,
    ICU_FALLING_EDGE,
    ICU_BOTH_EDGES
} Icu_ActivationType;

void            Icu_Init(const Icu_ConfigType* ConfigPtr);
void            Icu_DeInit(void);
void            Icu_SetActivationCondition(Icu_ChannelType Channel, Icu_ActivationType Activation);
Icu_ValueType   Icu_GetDutyCycleValues(Icu_ChannelType Channel);
void            Icu_EnableEdgeCount(Icu_ChannelType Channel);
Icu_ValueType   Icu_GetEdgeNumbers(Icu_ChannelType Channel);

#endif /* ICU_H */
