/**
 * @file    Spi.h
 * @brief   SPI Driver - Serial Peripheral Interface
 */

#ifndef SPI_H
#define SPI_H

#include "../platform/Std_Types.h"
#include "Spi_Cfg.h"

typedef uint8  Spi_ChannelType;
typedef uint8  Spi_SequenceType;
typedef uint8  Spi_JobType;
typedef uint8* Spi_DataBufferType;

typedef enum {
    SPI_UNINIT = 0,
    SPI_IDLE,
    SPI_BUSY
} Spi_StatusType;

typedef enum {
    SPI_JOB_OK = 0,
    SPI_JOB_PENDING,
    SPI_JOB_FAILED
} Spi_JobResultType;

void              Spi_Init(const Spi_ConfigType* ConfigPtr);
void              Spi_DeInit(void);
Spi_StatusType    Spi_GetStatus(void);
Std_ReturnType    Spi_WriteIB(Spi_ChannelType Channel, const Spi_DataBufferType DataBufferPtr);
Std_ReturnType    Spi_ReadIB(Spi_ChannelType Channel, Spi_DataBufferType DataBufferPtr);
Std_ReturnType    Spi_AsyncTransmit(Spi_SequenceType Sequence);
Spi_JobResultType Spi_GetJobResult(Spi_JobType Job);

#endif /* SPI_H */
