/**
 * @file    IoHwAb_Adc.h
 * @brief   I/O HW Abstraction - Analog signals
 */

#ifndef IOHWAB_ADC_H
#define IOHWAB_ADC_H

#include "../platform/Std_Types.h"

typedef enum {
    IOHWAB_SIG_COOLANT_TEMP = 0,
    IOHWAB_SIG_BATTERY_VOLT,
    IOHWAB_SIG_OIL_PRESSURE,
    IOHWAB_SIG_AMBIENT_TEMP,
    IOHWAB_SIG_ADC_COUNT
} IoHwAb_AdcSignalType;

void            IoHwAb_Adc_Init(void);
Std_ReturnType  IoHwAb_Adc_ReadSignal(IoHwAb_AdcSignalType Signal, uint16* Value);

#endif /* IOHWAB_ADC_H */
