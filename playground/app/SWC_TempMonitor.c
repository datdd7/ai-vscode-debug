/**
 * @file    SWC_TempMonitor.c
 * @brief   Temperature Monitoring SWC
 *
 * BUG #7: Race condition - Rte_CoolantTemp is written here without
 *         exclusive area protection, while MotorControl and Dashboard
 *         read it concurrently. In a real preemptive RTOS, this could
 *         cause torn reads of the 16-bit value.
 */

#include "SWC_TempMonitor.h"
#include "../services/Dem.h"
#include "../services/SchM.h"
#include "../utils/Utils_Filter.h"
#include <stdio.h>

static Filter_StateType TempFilter;
static uint32 TempMonitor_CycleCount = 0u;

/* ADC raw to temperature conversion (simplified linear) */
/* 0 = -40°C, 4095 = 150°C => temp = raw * 190 / 4095 - 400 (in 0.1°C) */
static Rte_TemperatureType ConvertAdcToTemp(uint16 adcRaw) {
    sint32 temp = ((sint32)adcRaw * 1900) / 4095 - 400;
    return (Rte_TemperatureType)temp;
}

void SWC_TempMonitor_Init(void) {
    Filter_Init(&TempFilter, 200u); /* Alpha = 0.2 */
    TempMonitor_CycleCount = 0u;
}

void SWC_TempMonitor_MainFunction(void) {
    uint16 adcRaw = 0u;
    Rte_TemperatureType rawTemp;
    Rte_TemperatureType filteredTemp;
    Rte_CalibDataType calib;

    TempMonitor_CycleCount++;

    /* Read ADC value for coolant temperature */
    IoHwAb_Adc_ReadSignal(IOHWAB_SIG_COOLANT_TEMP, &adcRaw);

    /* Convert to temperature */
    rawTemp = ConvertAdcToTemp(adcRaw);

    /* Apply low-pass filter (BUG #2 is inside Filter_Update!) */
    filteredTemp = (Rte_TemperatureType)Filter_Update(&TempFilter, (sint32)rawTemp);

    /* === BUG #7: Race condition ===
     * Writing to Rte_CoolantTemp WITHOUT SchM_Enter_Exclusive().
     * MotorControl and Dashboard read this value from other tasks.
     * CORRECT code should wrap in:
     *   SchM_Enter_Exclusive(SCHM_EA_TEMP_DATA);
     *   Rte_Write_CoolantTemp(filteredTemp);
     *   SchM_Exit_Exclusive(SCHM_EA_TEMP_DATA);
     */
    Rte_Write_CoolantTemp(filteredTemp);

    /* Determine system status based on temperature thresholds */
    Rte_Read_CalibData(&calib);

    if (filteredTemp >= calib.TempEmergencyThreshold) {
        Rte_Write_SystemStatus(RTE_SYS_EMERGENCY);
        Dem_SetEventStatus(DEM_EVENT_OVERTEMP, DEM_EVENT_STATUS_FAILED);
    } else if (filteredTemp >= calib.TempCriticalThreshold) {
        Rte_Write_SystemStatus(RTE_SYS_CRITICAL);
        Dem_SetEventStatus(DEM_EVENT_OVERTEMP, DEM_EVENT_STATUS_PREFAILED);
    } else if (filteredTemp >= calib.TempWarningThreshold) {
        Rte_Write_SystemStatus(RTE_SYS_WARNING);
        Dem_SetEventStatus(DEM_EVENT_OVERTEMP, DEM_EVENT_STATUS_PREPASSED);
    } else {
        Rte_Write_SystemStatus(RTE_SYS_NORMAL);
        Dem_SetEventStatus(DEM_EVENT_OVERTEMP, DEM_EVENT_STATUS_PASSED);
    }
}
