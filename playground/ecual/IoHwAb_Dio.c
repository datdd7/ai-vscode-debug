/**
 * @file    IoHwAb_Dio.c
 * @brief   I/O HW Abstraction - Digital I/O implementation
 */

#include "IoHwAb_Dio.h"
#include "../mcal/Dio.h"

/* Signal-to-channel mapping */
static const Dio_ChannelType IoHwAb_Dio_Map[IOHWAB_SIG_DIO_COUNT] = {
    [IOHWAB_SIG_LED_GREEN]       = DIO_CH_LED_GREEN,
    [IOHWAB_SIG_LED_YELLOW]      = DIO_CH_LED_YELLOW,
    [IOHWAB_SIG_LED_RED]         = DIO_CH_LED_RED,
    [IOHWAB_SIG_BUTTON_OVERRIDE] = DIO_CH_BUTTON_1,
};

void IoHwAb_Dio_Init(void) {
    /* DIO is already initialized via Dio_Init */
}

Std_ReturnType IoHwAb_Dio_SetOutput(IoHwAb_DioSignalType Signal, uint8 Level) {
    if (Signal >= IOHWAB_SIG_DIO_COUNT) return E_NOT_OK;
    Dio_WriteChannel(IoHwAb_Dio_Map[Signal], Level);
    return E_OK;
}

Std_ReturnType IoHwAb_Dio_GetInput(IoHwAb_DioSignalType Signal, uint8* Level) {
    if (Signal >= IOHWAB_SIG_DIO_COUNT || Level == NULL_PTR) return E_NOT_OK;
    *Level = Dio_ReadChannel(IoHwAb_Dio_Map[Signal]);
    return E_OK;
}
