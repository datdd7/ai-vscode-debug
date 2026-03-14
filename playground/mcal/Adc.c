/**
 * @file    Adc.c
 * @brief   ADC Driver - Dummy implementation with simulated values
 */

#include "Adc.h"
#include <stdio.h>
#include <string.h>

/* Simulated ADC hardware registers */
static uint16 Adc_SimulatedValues[ADC_MAX_CHANNELS] = {0};
static Adc_StatusType Adc_GroupStatus[ADC_MAX_GROUPS] = {ADC_IDLE};
static uint16 Adc_ResultBuffer[ADC_MAX_CHANNELS] = {0};
static boolean Adc_Initialized = FALSE;

/* Configuration */
static const Adc_GroupConfigType Adc_GroupConfigs[] = {
    { ADC_GROUP_TEMP,    2u, { ADC_CH_COOLANT_TEMP, ADC_CH_AMBIENT_TEMP } },
    { ADC_GROUP_VOLTAGE, 1u, { ADC_CH_BATTERY_VOLTAGE } }
};

const Adc_ConfigType Adc_Config = {
    .NumGroups = 2u,
    .Groups    = Adc_GroupConfigs
};

void Adc_Init(const Adc_ConfigType* ConfigPtr) {
    (void)ConfigPtr;
    memset(Adc_SimulatedValues, 0, sizeof(Adc_SimulatedValues));
    memset(Adc_GroupStatus, ADC_IDLE, sizeof(Adc_GroupStatus));

    /* Set default simulated values (mid-range) */
    Adc_SimulatedValues[0] = 2048u;  /* Ch0: Coolant temp ~80°C */
    Adc_SimulatedValues[1] = 3100u;  /* Ch1: Battery ~13.5V */
    Adc_SimulatedValues[2] = 1500u;  /* Ch2: Oil pressure ~3bar */
    Adc_SimulatedValues[3] = 1800u;  /* Ch3: Ambient ~25°C */

    Adc_Initialized = TRUE;
    printf("[ADC] Initialized with %u groups\n", ConfigPtr->NumGroups);
}

void Adc_DeInit(void) {
    Adc_Initialized = FALSE;
}

void Adc_StartGroupConversion(Adc_GroupType Group) {
    const Adc_GroupConfigType* grpCfg;
    uint8 i;

    if (!Adc_Initialized || Group >= ADC_MAX_GROUPS) return;

    grpCfg = &Adc_Config.Groups[Group];
    Adc_GroupStatus[Group] = ADC_BUSY;

    /* "Convert" - just copy simulated values to result buffer */
    for (i = 0u; i < grpCfg->NumChannels; i++) {
        Adc_ResultBuffer[grpCfg->Channels[i]] = Adc_SimulatedValues[grpCfg->Channels[i]];
    }

    Adc_GroupStatus[Group] = ADC_COMPLETED;
}

void Adc_StopGroupConversion(Adc_GroupType Group) {
    if (Group >= ADC_MAX_GROUPS) return;
    Adc_GroupStatus[Group] = ADC_IDLE;
}

Std_ReturnType Adc_ReadGroup(Adc_GroupType Group, Adc_ValueGroupType* DataBufferPtr) {
    const Adc_GroupConfigType* grpCfg;
    uint8 i;

    if (!Adc_Initialized || Group >= ADC_MAX_GROUPS || DataBufferPtr == NULL_PTR) {
        return E_NOT_OK;
    }

    if (Adc_GroupStatus[Group] != ADC_COMPLETED) {
        return E_NOT_OK;
    }

    grpCfg = &Adc_Config.Groups[Group];
    for (i = 0u; i < grpCfg->NumChannels; i++) {
        DataBufferPtr[i] = Adc_ResultBuffer[grpCfg->Channels[i]];
    }

    Adc_GroupStatus[Group] = ADC_IDLE;
    return E_OK;
}

Adc_StatusType Adc_GetGroupStatus(Adc_GroupType Group) {
    if (Group >= ADC_MAX_GROUPS) return ADC_IDLE;
    return Adc_GroupStatus[Group];
}

void Adc_Sim_SetRawValue(uint8 Channel, uint16 Value) {
    if (Channel < ADC_MAX_CHANNELS) {
        Adc_SimulatedValues[Channel] = Value;
    }
}
