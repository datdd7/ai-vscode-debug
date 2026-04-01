/**
 * @file    SWC_Dashboard.c
 * @brief   Dashboard display via UART
 */

#include "SWC_Dashboard.h"
#include "../mcal/Uart.h"
#include <stdio.h>
#include <string.h>

static uint32 Dashboard_RefreshCount = 0u;

static const char* StatusToString(Rte_SystemStatusType s) {
    switch (s) {
        case RTE_SYS_NORMAL:    return "NORMAL";
        case RTE_SYS_WARNING:   return "WARNING";
        case RTE_SYS_CRITICAL:  return "CRITICAL";
        case RTE_SYS_EMERGENCY: return "EMERGENCY";
        default:                return "UNKNOWN";
    }
}

static const char* MotorToString(Rte_MotorStateType s) {
    switch (s) {
        case RTE_MOTOR_OFF:      return "OFF";
        case RTE_MOTOR_STARTING: return "STARTING";
        case RTE_MOTOR_RUNNING:  return "RUNNING";
        case RTE_MOTOR_STOPPING: return "STOPPING";
        case RTE_MOTOR_FAULT:    return "FAULT";
        default:                 return "???";
    }
}

void SWC_Dashboard_Init(void) {
    Dashboard_RefreshCount = 0u;
}

void SWC_Dashboard_MainFunction(void) {
    Rte_TemperatureType temp;
    Rte_SystemStatusType status;
    Rte_MotorStateType motor;
    Rte_FanSpeedType fan;
    boolean override;
    uint16 errors;
    char buf[200];
    int len;

    Dashboard_RefreshCount++;

    if (Dashboard_RefreshCount % 500 != 0) {
        return;
    }

    Rte_Read_CoolantTemp_DB(&temp);
    Rte_Read_SystemStatus_DB(&status);
    Rte_Read_MotorState_DB(&motor);
    Rte_Read_FanDuty_DB(&fan);
    Rte_Read_Override_DB(&override);
    Rte_Read_ErrorCount_DB(&errors);

    len = snprintf(buf, sizeof(buf),
        "[DASH #%u] Temp=%d.%d°C | Status=%s | Motor=%s | Fan=%u%% | Override=%s | Errs=%u\n",
        Dashboard_RefreshCount,
        temp / 10, (temp >= 0 ? temp % 10 : (-temp) % 10),
        StatusToString(status),
        MotorToString(motor),
        fan,
        override ? "ON" : "OFF",
        errors);

    Uart_Transmit(UART_CH_DASHBOARD, (const uint8*)buf, (uint16)len);
}
