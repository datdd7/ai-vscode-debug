/**
 * @file    Rte_SWC_MotorControl.h
 */
#ifndef RTE_SWC_MOTORCONTROL_H
#define RTE_SWC_MOTORCONTROL_H

#include "Rte.h"
#include "../ecual/IoHwAb_Pwm.h"

#define Rte_Read_CoolantTemp(ptr)       (*(ptr) = Rte_CoolantTemp, E_OK)
#define Rte_Read_SystemStatus(ptr)      (*(ptr) = Rte_SystemStatus, E_OK)
#define Rte_Read_ManualOverride(ptr)    (*(ptr) = Rte_ManualOverrideActive, E_OK)
#define Rte_Write_MotorState(val)       (Rte_MotorState = (val), E_OK)
#define Rte_Write_FanDutyCycle(val)     (Rte_FanDutyCycle = (val), E_OK)
#define Rte_Read_CalibData(ptr)         (*(ptr) = Rte_CalibData, E_OK)

#endif /* RTE_SWC_MOTORCONTROL_H */
