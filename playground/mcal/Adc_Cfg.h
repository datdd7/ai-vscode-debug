/**
 * @file    Adc_Cfg.h
 * @brief   ADC Driver configuration
 *
 * BUG #8: ADC_CH_COOLANT_TEMP is mapped to channel 2 instead of channel 0.
 *         The physical coolant temp sensor is connected to ADC channel 0,
 *         but this config maps it to channel 2 (which is the oil pressure sensor).
 *         This will cause the temperature monitor to read wrong values.
 */

#ifndef ADC_CFG_H
#define ADC_CFG_H

#include "../platform/Std_Types.h"

#define ADC_MAX_CHANNELS    8u
#define ADC_MAX_GROUPS      4u
#define ADC_RESOLUTION      4096u   /* 12-bit ADC */

/* ADC Channel IDs
 * Physical wiring:
 *   Channel 0 = Coolant Temperature Sensor (NTC thermistor)
 *   Channel 1 = Battery Voltage Divider
 *   Channel 2 = Oil Pressure Sensor
 *   Channel 3 = Ambient Temperature
 */

/* === BUG #8: Wrong channel mapping! ===
 * Should be 0u (physical coolant temp channel), but is 2u (oil pressure)
 */
#define ADC_CH_COOLANT_TEMP     2u    /* BUG: Should be 0u */
#define ADC_CH_BATTERY_VOLTAGE  1u
#define ADC_CH_OIL_PRESSURE     0u    /* BUG: Swapped with coolant temp */
#define ADC_CH_AMBIENT_TEMP     3u

/* Group definitions */
#define ADC_GROUP_TEMP      0u
#define ADC_GROUP_VOLTAGE   1u

typedef struct {
    uint8   GroupId;
    uint8   NumChannels;
    uint8   Channels[ADC_MAX_CHANNELS];
} Adc_GroupConfigType;

typedef struct {
    uint8                    NumGroups;
    const Adc_GroupConfigType* Groups;
} Adc_ConfigType;

extern const Adc_ConfigType Adc_Config;

#endif /* ADC_CFG_H */
