/**
 * @file    Os_Cfg.h
 * @brief   OS Configuration
 */

#ifndef OS_CFG_H
#define OS_CFG_H

#include "../platform/Std_Types.h"

#define OS_MAX_TASKS        8u
#define OS_TICK_PERIOD_MS   10u     /* 10ms tick */
#define OS_MAX_ITERATIONS   200u    /* Max scheduler iterations before exit */

/* Task IDs */
#define OS_TASK_TEMP_MONITOR    0u  /* 10ms  */
#define OS_TASK_MOTOR_CONTROL   1u  /* 20ms  */
#define OS_TASK_LIGHT_CONTROL   2u  /* 50ms  */
#define OS_TASK_BUTTON_HANDLER  3u  /* 10ms  */
#define OS_TASK_DASHBOARD       4u  /* 100ms */
#define OS_TASK_DIAGNOSTIC      5u  /* 200ms */
#define OS_TASK_COMMUNICATION   6u  /* 50ms  */

#define OS_NUM_TASKS            7u

#endif /* OS_CFG_H */
