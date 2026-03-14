/**
 * @file    Uart.c
 * @brief   UART Driver - Dummy implementation (outputs to stdout)
 */

#include "Uart.h"
#include <stdio.h>
#include <string.h>

static uint8   Uart_TxBuf[UART_MAX_CHANNELS][UART_BUFFER_SIZE];
static uint16  Uart_TxLen[UART_MAX_CHANNELS] = {0};
static boolean Uart_Initialized = FALSE;

static const Uart_ChannelConfigType Uart_ChannelConfigs[] = {
    { UART_CH_DEBUG,     115200u, 8u, 1u, 0u },
    { UART_CH_DASHBOARD, 9600u,   8u, 1u, 0u }
};

const Uart_ConfigType Uart_Config = {
    .NumChannels = 2u,
    .Channels    = Uart_ChannelConfigs
};

void Uart_Init(const Uart_ConfigType* ConfigPtr) {
    (void)ConfigPtr;
    memset(Uart_TxBuf, 0, sizeof(Uart_TxBuf));
    memset(Uart_TxLen, 0, sizeof(Uart_TxLen));
    Uart_Initialized = TRUE;
    printf("[UART] Initialized\n");
}

Std_ReturnType Uart_Transmit(Uart_ChannelType Channel, const uint8* Data, uint16 Length) {
    if (!Uart_Initialized || Channel >= UART_MAX_CHANNELS) return E_NOT_OK;
    if (Data == NULL_PTR || Length == 0u || Length > UART_BUFFER_SIZE) return E_NOT_OK;

    memcpy(Uart_TxBuf[Channel], Data, Length);
    Uart_TxLen[Channel] = Length;

    /* Simulate transmission - print to stdout */
    printf("[UART%u] TX: %.*s\n", Channel, Length, Data);
    return E_OK;
}

Std_ReturnType Uart_Receive(Uart_ChannelType Channel, uint8* Data, uint16* Length) {
    (void)Channel;
    (void)Data;
    if (Length != NULL_PTR) *Length = 0u;
    /* No simulated input for now */
    return E_NOT_OK;
}

void Uart_TxConfirmation(Uart_ChannelType Channel) {
    if (Channel >= UART_MAX_CHANNELS) return;
    Uart_TxLen[Channel] = 0u;
}

void Uart_Sim_PrintBuffer(Uart_ChannelType Channel) {
    if (Channel >= UART_MAX_CHANNELS) return;
    if (Uart_TxLen[Channel] > 0u) {
        printf("[UART%u-BUF] %.*s\n", Channel, Uart_TxLen[Channel], Uart_TxBuf[Channel]);
    }
}
