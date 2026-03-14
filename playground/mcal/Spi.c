/**
 * @file    Spi.c
 * @brief   SPI Driver - Dummy implementation
 */

#include "Spi.h"
#include <stdio.h>
#include <string.h>

static Spi_StatusType Spi_Status = SPI_UNINIT;
static uint8 Spi_TxBuffer[SPI_MAX_CHANNELS][SPI_BUFFER_SIZE];
static uint8 Spi_RxBuffer[SPI_MAX_CHANNELS][SPI_BUFFER_SIZE];

static const Spi_ChannelConfigType Spi_ChannelConfigs[] = {
    { SPI_CH_EEPROM,  1000000u, 8u, 10u },
    { SPI_CH_DISPLAY, 4000000u, 8u, 11u }
};

const Spi_ConfigType Spi_Config = {
    .NumChannels = 2u,
    .Channels    = Spi_ChannelConfigs
};

void Spi_Init(const Spi_ConfigType* ConfigPtr) {
    (void)ConfigPtr;
    memset(Spi_TxBuffer, 0, sizeof(Spi_TxBuffer));
    memset(Spi_RxBuffer, 0, sizeof(Spi_RxBuffer));
    Spi_Status = SPI_IDLE;
    printf("[SPI] Initialized\n");
}

void Spi_DeInit(void) {
    Spi_Status = SPI_UNINIT;
}

Spi_StatusType Spi_GetStatus(void) {
    return Spi_Status;
}

Std_ReturnType Spi_WriteIB(Spi_ChannelType Channel, const Spi_DataBufferType DataBufferPtr) {
    if (Spi_Status == SPI_UNINIT || Channel >= SPI_MAX_CHANNELS) return E_NOT_OK;
    if (DataBufferPtr == NULL_PTR) return E_NOT_OK;
    memcpy(Spi_TxBuffer[Channel], DataBufferPtr, SPI_BUFFER_SIZE);
    return E_OK;
}

Std_ReturnType Spi_ReadIB(Spi_ChannelType Channel, Spi_DataBufferType DataBufferPtr) {
    if (Spi_Status == SPI_UNINIT || Channel >= SPI_MAX_CHANNELS) return E_NOT_OK;
    if (DataBufferPtr == NULL_PTR) return E_NOT_OK;
    memcpy(DataBufferPtr, Spi_RxBuffer[Channel], SPI_BUFFER_SIZE);
    return E_OK;
}

Std_ReturnType Spi_AsyncTransmit(Spi_SequenceType Sequence) {
    (void)Sequence;
    if (Spi_Status != SPI_IDLE) return E_NOT_OK;
    /* Simulate instant transfer - copy Tx to Rx (loopback) */
    Spi_Status = SPI_BUSY;
    printf("[SPI] Transmitting sequence %u\n", Sequence);
    Spi_Status = SPI_IDLE;
    return E_OK;
}

Spi_JobResultType Spi_GetJobResult(Spi_JobType Job) {
    (void)Job;
    return SPI_JOB_OK;
}
