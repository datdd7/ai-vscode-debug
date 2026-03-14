/**
 * @file    Rte_SWC_TempMonitor.h
 * @brief   RTE port interface for Temperature Monitor SWC
 */
#ifndef RTE_SWC_TEMPMONITOR_H
#define RTE_SWC_TEMPMONITOR_H

#include "Rte.h"
#include "../ecual/IoHwAb_Adc.h"

/* Provided ports */
#define Rte_Write_CoolantTemp(val)   (Rte_CoolantTemp = (val), E_OK)
#define Rte_Write_SystemStatus(val)  (Rte_SystemStatus = (val), E_OK)

/* Required ports */
#define Rte_Read_CalibData(ptr)      (*(ptr) = Rte_CalibData, E_OK)

#endif /* RTE_SWC_TEMPMONITOR_H */
