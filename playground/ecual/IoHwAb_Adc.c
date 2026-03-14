/**
 * @file    IoHwAb_Adc.c
 * @brief   I/O HW Abstraction - Analog signal implementation
 *
 * Note: This module uses ADC channel definitions from Adc_Cfg.h.
 * BUG #8 propagates through here - the coolant temp signal will read
 * from the wrong ADC channel due to misconfiguration in Adc_Cfg.h
 */

#include "IoHwAb_Adc.h"
#include "../mcal/Adc.h"

/* Maps application signals to ADC channels (uses Adc_Cfg.h definitions) */
static const uint8 IoHwAb_Adc_Map[IOHWAB_SIG_ADC_COUNT] = {
    [IOHWAB_SIG_COOLANT_TEMP] = ADC_CH_COOLANT_TEMP,   /* BUG #8: This maps to wrong channel */
    [IOHWAB_SIG_BATTERY_VOLT] = ADC_CH_BATTERY_VOLTAGE,
    [IOHWAB_SIG_OIL_PRESSURE] = ADC_CH_OIL_PRESSURE,
    [IOHWAB_SIG_AMBIENT_TEMP] = ADC_CH_AMBIENT_TEMP,
};

void IoHwAb_Adc_Init(void) {
    /* ADC is already initialized via Adc_Init */
}

Std_ReturnType IoHwAb_Adc_ReadSignal(IoHwAb_AdcSignalType Signal, uint16* Value) {
    uint16 adcBuffer[2];

    if (Signal >= IOHWAB_SIG_ADC_COUNT || Value == NULL_PTR) return E_NOT_OK;

    /* Start conversion for the group containing this channel */
    Adc_StartGroupConversion(ADC_GROUP_TEMP);

    if (Adc_ReadGroup(ADC_GROUP_TEMP, adcBuffer) == E_OK) {
        /* Read the specific channel value from the simulated ADC */
        /* Note: simplified - just read the channel directly through conversion */
        Adc_StartGroupConversion(ADC_GROUP_TEMP);
        Adc_ReadGroup(ADC_GROUP_TEMP, adcBuffer);
        *Value = adcBuffer[0]; /* First channel in group */
        return E_OK;
    }

    return E_NOT_OK;
}
