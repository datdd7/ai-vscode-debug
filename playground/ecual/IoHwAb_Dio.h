/**
 * @file    IoHwAb_Dio.h
 * @brief   I/O HW Abstraction - Digital I/O signals
 */

#ifndef IOHWAB_DIO_H
#define IOHWAB_DIO_H

#include "../platform/Std_Types.h"

/* Application-level signal names */
typedef enum {
    IOHWAB_SIG_LED_GREEN = 0,
    IOHWAB_SIG_LED_YELLOW,
    IOHWAB_SIG_LED_RED,
    IOHWAB_SIG_BUTTON_OVERRIDE,
    IOHWAB_SIG_DIO_COUNT
} IoHwAb_DioSignalType;

void            IoHwAb_Dio_Init(void);
Std_ReturnType  IoHwAb_Dio_SetOutput(IoHwAb_DioSignalType Signal, uint8 Level);
Std_ReturnType  IoHwAb_Dio_GetInput(IoHwAb_DioSignalType Signal, uint8* Level);

#endif /* IOHWAB_DIO_H */
