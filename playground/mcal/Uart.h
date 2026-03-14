/**
 * @file    Uart.h
 * @brief   UART Driver - Universal Asynchronous Receiver/Transmitter
 */

#ifndef UART_H
#define UART_H

#include "../platform/Std_Types.h"
#include "Uart_Cfg.h"

typedef uint8 Uart_ChannelType;

void            Uart_Init(const Uart_ConfigType* ConfigPtr);
Std_ReturnType  Uart_Transmit(Uart_ChannelType Channel, const uint8* Data, uint16 Length);
Std_ReturnType  Uart_Receive(Uart_ChannelType Channel, uint8* Data, uint16* Length);
void            Uart_TxConfirmation(Uart_ChannelType Channel);

/* Simulation: prints to stdout */
void            Uart_Sim_PrintBuffer(Uart_ChannelType Channel);

#endif /* UART_H */
