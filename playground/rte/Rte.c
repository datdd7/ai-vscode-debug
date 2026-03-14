/**
 * @file    Rte.c
 * @brief   RTE - Runtime Environment implementation
 */

#include "Rte.h"
#include <stdio.h>

/* Global RTE data exchange buffers */
Rte_TemperatureType   Rte_CoolantTemp      = 0;
Rte_TemperatureType   Rte_AmbientTemp       = 250; /* 25.0°C */
Rte_SystemStatusType  Rte_SystemStatus      = RTE_SYS_NORMAL;
Rte_MotorStateType    Rte_MotorState        = RTE_MOTOR_OFF;
Rte_FanSpeedType      Rte_FanDutyCycle      = 0u;
Rte_ButtonStateType   Rte_ManualOverride    = RTE_BUTTON_RELEASED;
boolean               Rte_ManualOverrideActive = FALSE;
Rte_CalibDataType     Rte_CalibData;
uint16                Rte_ErrorCount        = 0u;

void Rte_Init(void) {
    /* Set default calibration values */
    Rte_CalibData.TempWarningThreshold   = 850;    /* 85.0°C */
    Rte_CalibData.TempCriticalThreshold  = 950;    /* 95.0°C */
    Rte_CalibData.TempEmergencyThreshold = 1050;   /* 105.0°C */
    Rte_CalibData.FanMinDuty             = 20u;
    Rte_CalibData.FanMaxDuty             = 100u;
    Rte_CalibData.FilterCoefficient      = 200u;   /* 0.2 alpha */

    Rte_CoolantTemp       = 250;  /* 25.0°C initial */
    Rte_AmbientTemp       = 250;
    Rte_SystemStatus      = RTE_SYS_NORMAL;
    Rte_MotorState        = RTE_MOTOR_OFF;
    Rte_FanDutyCycle      = 0u;
    Rte_ManualOverrideActive = FALSE;
    Rte_ErrorCount        = 0u;

    printf("[RTE] Initialized with default calibration\n");
}
