/**
 * @file    Os.h
 * @brief   OS - Simplified RTOS interface
 */

#ifndef OS_H
#define OS_H

#include "../platform/Std_Types.h"
#include "Os_Cfg.h"

typedef uint8 Os_TaskIdType;

typedef void (*Os_TaskFuncType)(void);

typedef enum {
    OS_TASK_SUSPENDED = 0,
    OS_TASK_READY,
    OS_TASK_RUNNING,
    OS_TASK_WAITING
} Os_TaskStateType;

void    Os_Init(void);
void    Os_Start(void);
void    Os_Shutdown(void);
void    Os_RunScheduler(void);  /* Call in main loop to simulate scheduling */
void    Os_ActivateTask(Os_TaskIdType TaskId);
void    Os_TerminateTask(void);
Os_TaskStateType Os_GetTaskState(Os_TaskIdType TaskId);

/* Critical section */
void    Os_EnterCritical(void);
void    Os_ExitCritical(void);

/* Tick counter */
uint32  Os_GetTickCount(void);

#endif /* OS_H */
