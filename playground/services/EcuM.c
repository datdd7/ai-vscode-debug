/**
 * @file    EcuM.c
 * @brief   EcuM - ECU State Manager (orchestrates init sequence)
 */

#include "EcuM.h"
#include "../mcal/Mcu.h"
#include "../mcal/Port.h"
#include "../mcal/Dio.h"
#include "../mcal/Adc.h"
#include "../mcal/Pwm.h"
#include "../mcal/Gpt.h"
#include "../mcal/Spi.h"
#include "../mcal/Uart.h"
#include "../mcal/Icu.h"
#include "../mcal/Wdg.h"
#include "../mcal/Fls.h"
#include "../ecual/IoHwAb.h"
#include "Det.h"
#include "Dem.h"
#include "NvM.h"
#include "Com.h"
#include "Os.h"
#include "SchM.h"
#include <stdio.h>

static EcuM_StateType EcuM_CurrentState = ECUM_STATE_STARTUP;

void EcuM_Init(void) {
    printf("\n========================================\n");
    printf("  Engine Cooling System ECU - Boot\n");
    printf("========================================\n\n");

    EcuM_CurrentState = ECUM_STATE_STARTUP;

    /* Phase 1: MCAL Init */
    printf("--- MCAL Initialization ---\n");
    Mcu_Init(&Mcu_Config);
    Mcu_InitClock(0u);
    Port_Init(&Port_Config);
    Gpt_Init(&Gpt_Config);
    Adc_Init(&Adc_Config);
    Pwm_Init(&Pwm_Config);
    Spi_Init(&Spi_Config);
    Uart_Init(&Uart_Config);
    Icu_Init(&Icu_Config);
    Wdg_Init(&Wdg_Config);
    Fls_Init(&Fls_Config);

    /* Phase 2: ECU Abstraction */
    printf("\n--- ECU Abstraction Init ---\n");
    IoHwAb_Init();

    /* Phase 3: Services */
    printf("\n--- Services Init ---\n");
    Det_Init();
    Dem_Init();
    NvM_Init();
    Com_Init();
    SchM_Init();
}

void EcuM_StartupTwo(void) {
    printf("\n--- OS & Application Init ---\n");
    Os_Init();
    Os_Start();
    EcuM_CurrentState = ECUM_STATE_RUN;
    printf("\n========================================\n");
    printf("  ECU Running - Main Loop Active\n");
    printf("========================================\n\n");
}

EcuM_StateType EcuM_GetState(void) {
    return EcuM_CurrentState;
}

void EcuM_SetState(EcuM_StateType State) {
    EcuM_CurrentState = State;
}

void EcuM_Shutdown(void) {
    printf("\n[EcuM] Shutting down...\n");
    Os_Shutdown();
    EcuM_CurrentState = ECUM_STATE_SHUTDOWN;
}
