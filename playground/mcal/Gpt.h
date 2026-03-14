/**
 * @file    Gpt.h
 * @brief   GPT Driver - General Purpose Timer
 */

#ifndef GPT_H
#define GPT_H

#include "../platform/Std_Types.h"
#include "Gpt_Cfg.h"

typedef uint8  Gpt_ChannelType;
typedef uint32 Gpt_ValueType;

typedef void (*Gpt_NotificationType)(void);

void            Gpt_Init(const Gpt_ConfigType* ConfigPtr);
void            Gpt_DeInit(void);
void            Gpt_StartTimer(Gpt_ChannelType Channel, Gpt_ValueType Value);
void            Gpt_StopTimer(Gpt_ChannelType Channel);
Gpt_ValueType   Gpt_GetTimeElapsed(Gpt_ChannelType Channel);
Gpt_ValueType   Gpt_GetTimeRemaining(Gpt_ChannelType Channel);

/* Simulation: tick all running timers by 1ms */
void            Gpt_Sim_Tick(void);

#endif /* GPT_H */
