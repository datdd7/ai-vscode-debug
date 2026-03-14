/**
 * @file    Rte.h
 * @brief   RTE - Runtime Environment (inter-SWC communication)
 */

#ifndef RTE_H
#define RTE_H

#include "Rte_Type.h"

/* ============================================================================
 *  Shared Data Exchange Buffers (global RTE state)
 * ============================================================================ */

/* Temperature data - written by TempMonitor, read by MotorControl/Dashboard */
extern Rte_TemperatureType   Rte_CoolantTemp;
extern Rte_TemperatureType   Rte_AmbientTemp;
extern Rte_SystemStatusType  Rte_SystemStatus;

/* Motor data */
extern Rte_MotorStateType    Rte_MotorState;
extern Rte_FanSpeedType      Rte_FanDutyCycle;

/* Button data */
extern Rte_ButtonStateType   Rte_ManualOverride;
extern boolean               Rte_ManualOverrideActive;

/* Calibration data */
extern Rte_CalibDataType     Rte_CalibData;

/* Error counters */
extern uint16                Rte_ErrorCount;

/* RTE Init/Deinit */
void Rte_Init(void);

#endif /* RTE_H */
