/**
 * @file    SWC_LightControl.c
 * @brief   LED indicator control based on system status
 */

#include "SWC_LightControl.h"

void SWC_LightControl_Init(void) {
    IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_GREEN,  STD_LOW);
    IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_YELLOW, STD_LOW);
    IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_RED,    STD_LOW);
}

void SWC_LightControl_MainFunction(void) {
    Rte_SystemStatusType status;
    Rte_Read_SystemStatus_LC(&status);

    switch (status) {
        case RTE_SYS_NORMAL:
            IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_GREEN,  STD_HIGH);
            IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_YELLOW, STD_LOW);
            IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_RED,    STD_LOW);
            break;

        case RTE_SYS_WARNING:
            IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_GREEN,  STD_LOW);
            IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_YELLOW, STD_HIGH);
            IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_RED,    STD_LOW);
            break;

        case RTE_SYS_CRITICAL:
        case RTE_SYS_EMERGENCY:
            IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_GREEN,  STD_LOW);
            IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_YELLOW, STD_LOW);
            IoHwAb_Dio_SetOutput(IOHWAB_SIG_LED_RED,    STD_HIGH);
            break;

        default:
            break;
    }
}
