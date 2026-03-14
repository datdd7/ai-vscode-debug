/**
 * @file    Rte_SWC_Dashboard.h
 */
#ifndef RTE_SWC_DASHBOARD_H
#define RTE_SWC_DASHBOARD_H

#include "Rte.h"

#define Rte_Read_CoolantTemp_DB(ptr)    (*(ptr) = Rte_CoolantTemp, E_OK)
#define Rte_Read_SystemStatus_DB(ptr)   (*(ptr) = Rte_SystemStatus, E_OK)
#define Rte_Read_MotorState_DB(ptr)     (*(ptr) = Rte_MotorState, E_OK)
#define Rte_Read_FanDuty_DB(ptr)        (*(ptr) = Rte_FanDutyCycle, E_OK)
#define Rte_Read_Override_DB(ptr)       (*(ptr) = Rte_ManualOverrideActive, E_OK)
#define Rte_Read_ErrorCount_DB(ptr)     (*(ptr) = Rte_ErrorCount, E_OK)

#endif /* RTE_SWC_DASHBOARD_H */
