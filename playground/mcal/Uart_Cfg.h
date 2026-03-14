/**
 * @file    Uart_Cfg.h
 * @brief   UART Driver configuration
 */

#ifndef UART_CFG_H
#define UART_CFG_H

#include "../platform/Std_Types.h"

#define UART_MAX_CHANNELS   2u
#define UART_BUFFER_SIZE    256u

#define UART_CH_DEBUG       0u
#define UART_CH_DASHBOARD   1u

typedef struct {
    uint8   ChannelId;
    uint32  BaudRate;
    uint8   DataBits;
    uint8   StopBits;
    uint8   Parity;     /* 0=None, 1=Even, 2=Odd */
} Uart_ChannelConfigType;

typedef struct {
    uint8                      NumChannels;
    const Uart_ChannelConfigType* Channels;
} Uart_ConfigType;

extern const Uart_ConfigType Uart_Config;

#endif /* UART_CFG_H */
