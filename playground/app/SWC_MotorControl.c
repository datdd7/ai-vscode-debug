/**
 * @file    SWC_MotorControl.c
 * @brief   Motor/Fan Control SWC with FSM
 *
 * BUG #3: Integer overflow when computing PWM duty cycle.
 *         The formula uses uint8 intermediate which overflows for high temps.
 *
 * BUG #5: Wrong state transition in FSM.
 *         STOPPING state transitions to RUNNING instead of OFF.
 */

#include "SWC_MotorControl.h"
#include "../services/Dem.h"
#include <stdio.h>

static Rte_MotorStateType MotorCtrl_State = RTE_MOTOR_OFF;
static uint8 MotorCtrl_StartupCounter = 0u;
static uint8 MotorCtrl_StopCounter    = 0u;

void SWC_MotorControl_Init(void) {
    MotorCtrl_State = RTE_MOTOR_OFF;
    MotorCtrl_StartupCounter = 0u;
    MotorCtrl_StopCounter    = 0u;
}

/**
 * Calculate fan duty cycle from temperature.
 * Linear mapping: below warning = FanMinDuty, above critical = FanMaxDuty
 *
 * BUG #3: Integer overflow!
 * When (temp - warning) * (maxDuty - minDuty) exceeds 255, the uint8
 * intermediate overflows and wraps around, giving wrong duty cycle.
 */
static uint8 CalculateFanDuty(Rte_TemperatureType temp, const Rte_CalibDataType* calib) {
    uint8 duty;

    if (temp <= calib->TempWarningThreshold) {
        return 0u; /* Fan off below warning */
    }

    if (temp >= calib->TempCriticalThreshold) {
        return calib->FanMaxDuty;
    }

    /* === BUG #3: Integer overflow ===
     * range = TempCriticalThreshold - TempWarningThreshold = 950 - 850 = 100 (in 0.1°C)
     * dutyRange = FanMaxDuty - FanMinDuty = 100 - 20 = 80
     * delta = temp - TempWarningThreshold could be up to 100
     *
     * BUG: Using uint8 for 'scaledDelta' which overflows when delta * dutyRange > 255
     * Example: temp=900, delta=50, scaledDelta = 50*80 = 4000 -> wraps to 160 in uint8 -> WRONG!
     *
     * CORRECT: Should use uint16 or uint32 for intermediate calculation.
     */
    uint8 delta = (uint8)(temp - calib->TempWarningThreshold);  /* BUG: cast to uint8 */
    uint8 range = (uint8)(calib->TempCriticalThreshold - calib->TempWarningThreshold);
    uint8 dutyRange = calib->FanMaxDuty - calib->FanMinDuty;

    /* This overflows for delta * dutyRange > 255 */
    uint8 scaledDelta = (uint8)(delta * dutyRange);  /* BUG: overflow! */
    duty = calib->FanMinDuty + (scaledDelta / range);

    return duty;
}

void SWC_MotorControl_MainFunction(void) {
    Rte_TemperatureType coolantTemp;
    Rte_SystemStatusType sysStatus;
    boolean manualOverride;
    Rte_CalibDataType calib;
    uint8 targetDuty;

    Rte_Read_CoolantTemp(&coolantTemp);
    Rte_Read_SystemStatus(&sysStatus);
    Rte_Read_ManualOverride(&manualOverride);
    Rte_Read_CalibData(&calib);

    /* FSM for motor control */
    switch (MotorCtrl_State) {
        case RTE_MOTOR_OFF:
            if (sysStatus >= RTE_SYS_WARNING || manualOverride) {
                MotorCtrl_State = RTE_MOTOR_STARTING;
                MotorCtrl_StartupCounter = 0u;
                printf("[MOTOR] OFF -> STARTING\n");
            }
            targetDuty = 0u;
            break;

        case RTE_MOTOR_STARTING:
            MotorCtrl_StartupCounter++;
            /* Soft-start: ramp up over 5 cycles */
            targetDuty = (MotorCtrl_StartupCounter * 20u);
            if (targetDuty > calib.FanMinDuty) targetDuty = calib.FanMinDuty;

            if (MotorCtrl_StartupCounter >= 5u) {
                MotorCtrl_State = RTE_MOTOR_RUNNING;
                printf("[MOTOR] STARTING -> RUNNING\n");
            }
            break;

        case RTE_MOTOR_RUNNING:
            if (sysStatus == RTE_SYS_NORMAL && !manualOverride) {
                MotorCtrl_State = RTE_MOTOR_STOPPING;
                MotorCtrl_StopCounter = 0u;
                printf("[MOTOR] RUNNING -> STOPPING\n");
            } else {
                targetDuty = CalculateFanDuty(coolantTemp, &calib);
                if (manualOverride) {
                    targetDuty = calib.FanMaxDuty; /* Full speed on override */
                }
            }
            break;

        case RTE_MOTOR_STOPPING:
            MotorCtrl_StopCounter++;
            targetDuty = calib.FanMinDuty / 2u; /* Coast down */

            /* === BUG #5: Wrong state transition ===
             * Should transition to RTE_MOTOR_OFF after stop delay,
             * but transitions to RTE_MOTOR_RUNNING instead.
             * This means the fan never fully stops!
             */
            if (MotorCtrl_StopCounter >= 5u) {
                MotorCtrl_State = RTE_MOTOR_RUNNING;  /* BUG: Should be RTE_MOTOR_OFF */
                printf("[MOTOR] STOPPING -> RUNNING (BUG: should be OFF)\n");
            }
            break;

        case RTE_MOTOR_FAULT:
            targetDuty = calib.FanMaxDuty; /* Safety: full speed on fault */
            Dem_SetEventStatus(DEM_EVENT_FAN_FAIL, DEM_EVENT_STATUS_FAILED);
            break;

        default:
            targetDuty = 0u;
            MotorCtrl_State = RTE_MOTOR_OFF;
            break;
    }

    /* Apply duty cycle */
    IoHwAb_Pwm_SetDuty(IOHWAB_SIG_FAN_SPEED, targetDuty);
    Rte_Write_MotorState(MotorCtrl_State);
    Rte_Write_FanDutyCycle(targetDuty);
}
