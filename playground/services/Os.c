/**
 * @file    Os.c
 * @brief   OS - Simplified cooperative scheduler
 */

#include "Os.h"
#include <stdio.h>

typedef struct {
    Os_TaskFuncType  Function;
    Os_TaskStateType State;
    uint16           PeriodMs;
    uint16           OffsetMs;
    uint32           LastRunTick;
} Os_TaskControlBlock;

static Os_TaskControlBlock Os_Tasks[OS_MAX_TASKS];
static uint32  Os_TickCounter  = 0u;
static uint8   Os_NumTasks     = 0u;
static boolean Os_Running      = FALSE;
static uint8   Os_CriticalNest = 0u;

/* External task function declarations (defined in app SWCs) */
extern void SWC_TempMonitor_MainFunction(void);
extern void SWC_MotorControl_MainFunction(void);
extern void SWC_LightControl_MainFunction(void);
extern void SWC_ButtonHandler_MainFunction(void);
extern void SWC_Dashboard_MainFunction(void);
extern void SWC_Diagnostic_MainFunction(void);
extern void SWC_Communication_MainFunction(void);

void Os_Init(void) {
    uint8 i;
    for (i = 0u; i < OS_MAX_TASKS; i++) {
        Os_Tasks[i].Function     = NULL_PTR;
        Os_Tasks[i].State        = OS_TASK_SUSPENDED;
        Os_Tasks[i].PeriodMs     = 0u;
        Os_Tasks[i].OffsetMs     = 0u;
        Os_Tasks[i].LastRunTick  = 0u;
    }

    /* Register tasks with their periods */
    Os_Tasks[OS_TASK_TEMP_MONITOR].Function    = SWC_TempMonitor_MainFunction;
    Os_Tasks[OS_TASK_TEMP_MONITOR].PeriodMs    = 10u;

    Os_Tasks[OS_TASK_MOTOR_CONTROL].Function   = SWC_MotorControl_MainFunction;
    Os_Tasks[OS_TASK_MOTOR_CONTROL].PeriodMs   = 20u;

    Os_Tasks[OS_TASK_LIGHT_CONTROL].Function   = SWC_LightControl_MainFunction;
    Os_Tasks[OS_TASK_LIGHT_CONTROL].PeriodMs   = 50u;

    Os_Tasks[OS_TASK_BUTTON_HANDLER].Function  = SWC_ButtonHandler_MainFunction;
    Os_Tasks[OS_TASK_BUTTON_HANDLER].PeriodMs  = 10u;

    Os_Tasks[OS_TASK_DASHBOARD].Function       = SWC_Dashboard_MainFunction;
    Os_Tasks[OS_TASK_DASHBOARD].PeriodMs       = 100u;

    Os_Tasks[OS_TASK_DIAGNOSTIC].Function      = SWC_Diagnostic_MainFunction;
    Os_Tasks[OS_TASK_DIAGNOSTIC].PeriodMs      = 200u;

    Os_Tasks[OS_TASK_COMMUNICATION].Function   = SWC_Communication_MainFunction;
    Os_Tasks[OS_TASK_COMMUNICATION].PeriodMs   = 50u;

    Os_NumTasks = OS_NUM_TASKS;
    Os_TickCounter = 0u;
    printf("[OS] Initialized %u tasks\n", Os_NumTasks);
}

void Os_Start(void) {
    uint8 i;
    for (i = 0u; i < Os_NumTasks; i++) {
        Os_Tasks[i].State       = OS_TASK_READY;
        Os_Tasks[i].LastRunTick = 0u;
    }
    Os_Running = TRUE;
    printf("[OS] Started\n");
}

void Os_Shutdown(void) {
    Os_Running = FALSE;
    printf("[OS] Shutdown\n");
}

void Os_RunScheduler(void) {
    uint8 i;
    uint32 elapsedMs;

    if (!Os_Running) return;

    Os_TickCounter++;
    elapsedMs = Os_TickCounter * OS_TICK_PERIOD_MS;

    for (i = 0u; i < Os_NumTasks; i++) {
        if (Os_Tasks[i].State == OS_TASK_READY &&
            Os_Tasks[i].Function != NULL_PTR) {

            uint32 timeSinceLastRun = elapsedMs - (Os_Tasks[i].LastRunTick * OS_TICK_PERIOD_MS);

            if (timeSinceLastRun >= Os_Tasks[i].PeriodMs) {
                Os_Tasks[i].State = OS_TASK_RUNNING;
                Os_Tasks[i].Function();
                Os_Tasks[i].State       = OS_TASK_READY;
                Os_Tasks[i].LastRunTick  = Os_TickCounter;
            }
        }
    }
}

void Os_ActivateTask(Os_TaskIdType TaskId) {
    if (TaskId >= OS_MAX_TASKS) return;
    Os_Tasks[TaskId].State = OS_TASK_READY;
}

void Os_TerminateTask(void) {
    /* In cooperative scheduler, this is a no-op, task just returns */
}

Os_TaskStateType Os_GetTaskState(Os_TaskIdType TaskId) {
    if (TaskId >= OS_MAX_TASKS) return OS_TASK_SUSPENDED;
    return Os_Tasks[TaskId].State;
}

void Os_EnterCritical(void) {
    Os_CriticalNest++;
}

void Os_ExitCritical(void) {
    if (Os_CriticalNest > 0u) {
        Os_CriticalNest--;
    }
}

uint32 Os_GetTickCount(void) {
    return Os_TickCounter;
}
