/**
 * @file    Spi_Cfg.h
 * @brief   SPI Driver configuration
 */

#ifndef SPI_CFG_H
#define SPI_CFG_H

#include "../platform/Std_Types.h"

#define SPI_MAX_CHANNELS    4u
#define SPI_MAX_JOBS        4u
#define SPI_MAX_SEQUENCES   2u
#define SPI_BUFFER_SIZE     64u

#define SPI_CH_EEPROM       0u
#define SPI_CH_DISPLAY      1u

typedef struct {
    uint8  ChannelId;
    uint32 BaudRate;
    uint8  DataWidth;   /* 8 or 16 bits */
    uint8  CsPin;
} Spi_ChannelConfigType;

typedef struct {
    uint8                     NumChannels;
    const Spi_ChannelConfigType* Channels;
} Spi_ConfigType;

extern const Spi_ConfigType Spi_Config;

#endif /* SPI_CFG_H */
