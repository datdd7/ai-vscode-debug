/**
 * @file    Dio.c
 * @brief   DIO Driver - Dummy implementation
 */

#include "Dio.h"
#include <stdio.h>

/* Simulated GPIO registers */
static uint8 Dio_ChannelState[DIO_MAX_CHANNELS] = {0};

Dio_LevelType Dio_ReadChannel(Dio_ChannelType ChannelId) {
    if (ChannelId >= DIO_MAX_CHANNELS) return STD_LOW;
    return Dio_ChannelState[ChannelId];
}

void Dio_WriteChannel(Dio_ChannelType ChannelId, Dio_LevelType Level) {
    if (ChannelId >= DIO_MAX_CHANNELS) return;
    Dio_ChannelState[ChannelId] = (Level != STD_LOW) ? STD_HIGH : STD_LOW;
}

Dio_PortLevelType Dio_ReadPort(Dio_PortType PortId) {
    uint8 portLevel = 0u;
    uint8 baseChannel = PortId * DIO_CHANNELS_PER_PORT;
    uint8 i;

    if (PortId >= DIO_MAX_PORTS) return 0u;

    for (i = 0u; i < DIO_CHANNELS_PER_PORT; i++) {
        if (Dio_ChannelState[baseChannel + i] == STD_HIGH) {
            portLevel |= (uint8)(1u << i);
        }
    }
    return portLevel;
}

void Dio_WritePort(Dio_PortType PortId, Dio_PortLevelType Level) {
    uint8 baseChannel = PortId * DIO_CHANNELS_PER_PORT;
    uint8 i;

    if (PortId >= DIO_MAX_PORTS) return;

    for (i = 0u; i < DIO_CHANNELS_PER_PORT; i++) {
        Dio_ChannelState[baseChannel + i] = ((Level >> i) & 0x01u) ? STD_HIGH : STD_LOW;
    }
}

Dio_LevelType Dio_FlipChannel(Dio_ChannelType ChannelId) {
    if (ChannelId >= DIO_MAX_CHANNELS) return STD_LOW;
    Dio_ChannelState[ChannelId] = (Dio_ChannelState[ChannelId] == STD_LOW) ? STD_HIGH : STD_LOW;
    return Dio_ChannelState[ChannelId];
}
