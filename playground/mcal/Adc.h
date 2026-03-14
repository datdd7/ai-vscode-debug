/**
 * @file    Adc.h
 * @brief   ADC Driver - Analog to Digital Converter
 */

#ifndef ADC_H
#define ADC_H

#include "../platform/Std_Types.h"
#include "Adc_Cfg.h"

typedef uint8  Adc_GroupType;
typedef uint16 Adc_ValueGroupType;

typedef enum {
    ADC_IDLE = 0,
    ADC_BUSY,
    ADC_COMPLETED,
    ADC_STREAM_COMPLETED
} Adc_StatusType;

void              Adc_Init(const Adc_ConfigType* ConfigPtr);
void              Adc_DeInit(void);
void              Adc_StartGroupConversion(Adc_GroupType Group);
void              Adc_StopGroupConversion(Adc_GroupType Group);
Std_ReturnType    Adc_ReadGroup(Adc_GroupType Group, Adc_ValueGroupType* DataBufferPtr);
Adc_StatusType    Adc_GetGroupStatus(Adc_GroupType Group);

/* Simulation helper - set simulated ADC raw value */
void              Adc_Sim_SetRawValue(uint8 Channel, uint16 Value);

#endif /* ADC_H */
