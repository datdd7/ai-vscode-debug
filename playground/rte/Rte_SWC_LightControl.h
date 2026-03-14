/**
 * @file    Rte_SWC_LightControl.h
 */
#ifndef RTE_SWC_LIGHTCONTROL_H
#define RTE_SWC_LIGHTCONTROL_H

#include "Rte.h"
#include "../ecual/IoHwAb_Dio.h"

#define Rte_Read_SystemStatus_LC(ptr)   (*(ptr) = Rte_SystemStatus, E_OK)

#endif /* RTE_SWC_LIGHTCONTROL_H */
