/**
 * @file    Rte_Type.h
 * @brief   RTE data types used across SWCs
 */

#ifndef RTE_TYPE_H
#define RTE_TYPE_H

#include "../platform/Std_Types.h"

/* Temperature data (in 0.1°C units, e.g., 800 = 80.0°C) */
typedef sint16 Rte_TemperatureType;

/* Fan speed percentage 0-100 */
typedef uint8 Rte_FanSpeedType;

/* System status */
typedef enum {
    RTE_SYS_NORMAL = 0,
    RTE_SYS_WARNING,
    RTE_SYS_CRITICAL,
    RTE_SYS_EMERGENCY
} Rte_SystemStatusType;

/* Calibration data block */
typedef struct {
    Rte_TemperatureType TempWarningThreshold;   /* Default: 850 = 85.0°C */
    Rte_TemperatureType TempCriticalThreshold;  /* Default: 950 = 95.0°C */
    Rte_TemperatureType TempEmergencyThreshold; /* Default: 1050 = 105.0°C */
    uint8               FanMinDuty;             /* Minimum fan duty % */
    uint8               FanMaxDuty;             /* Maximum fan duty % */
    uint16              FilterCoefficient;      /* Low-pass filter alpha x1000 */
} Rte_CalibDataType;

/* Motor control FSM state */
typedef enum {
    RTE_MOTOR_OFF = 0,
    RTE_MOTOR_STARTING,
    RTE_MOTOR_RUNNING,
    RTE_MOTOR_STOPPING,
    RTE_MOTOR_FAULT
} Rte_MotorStateType;

/* Button state */
typedef enum {
    RTE_BUTTON_RELEASED = 0,
    RTE_BUTTON_PRESSED,
    RTE_BUTTON_HELD
} Rte_ButtonStateType;

/* Diagnostic request */
typedef struct {
    uint8   ServiceId;
    uint8   SubFunction;
    uint8   Data[8];
    uint8   DataLength;
} Rte_DiagRequestType;

#endif /* RTE_TYPE_H */
