/**
 * @file    main.c
 * @brief   Engine Cooling System ECU - Main Entry Point
 *
 * This simulates an AUTOSAR-like embedded ECU application.
 * The main loop runs a cooperative scheduler that periodically
 * executes all registered SWC tasks.
 *
 * Simulated temperature profile:
 *   - Starts at 25°C
 *   - Ramps up to ~95°C over 100 cycles
 *   - This triggers Warning and Critical thresholds
 *   - Various bugs become visible during the ramp-up
 */

#include "services/EcuM.h"
#include "services/Os.h"
#include "services/Os_Cfg.h"
#include "rte/Rte.h"
#include "mcal/Adc.h"
#include "mcal/Wdg.h"
#include "mcal/Gpt.h"
#include "app/SWC_TempMonitor.h"
#include "app/SWC_MotorControl.h"
#include "app/SWC_LightControl.h"
#include "app/SWC_ButtonHandler.h"
#include "app/SWC_Dashboard.h"
#include "app/SWC_Diagnostic.h"
#include "app/SWC_Communication.h"
#include <stdio.h>

int main(void) {
    uint32 iteration = 0u;

    /* ========================================
     * Phase 1: ECU Startup (MCAL + Services)
     * ======================================== */
    EcuM_Init();

    /* ========================================
     * Phase 2: RTE + Application Init
     * ======================================== */
    Rte_Init();

    /* Initialize SWC internal states */
    SWC_TempMonitor_Init();
    SWC_MotorControl_Init();
    SWC_LightControl_Init();
    SWC_ButtonHandler_Init();
    SWC_Dashboard_Init();
    SWC_Diagnostic_Init();
    SWC_Communication_Init();

    /* ========================================
     * Phase 3: Start OS scheduler
     * ======================================== */
    EcuM_StartupTwo();

    /* ========================================
     * Main Loop - Simulated periodic execution
     * ======================================== */
    while (iteration < OS_MAX_ITERATIONS) {
        /* Simulate temperature rising over time */
        /* ADC channel 0 (actual coolant sensor channel):
         * Maps 0->-40°C, 4095->150°C
         * For 25°C: ADC = (25+40)*4095/190 = 1400
         * For 95°C: ADC = (95+40)*4095/190 = 2910
         */
        uint16 simTemp;
        if (iteration < 50u) {
            /* Cool phase: 25°C -> 70°C */
            simTemp = 1400u + (iteration * 20u);
        } else if (iteration < 100u) {
            /* Warming: 70°C -> 95°C */
            simTemp = 2400u + ((iteration - 50u) * 10u);
        } else if (iteration < 150u) {
            /* Hot: stabilize at ~90°C */
            simTemp = 2800u;
        } else {
            /* Cooling down: 90°C -> 60°C */
            simTemp = 2800u - ((iteration - 150u) * 15u);
        }

        /* Set simulated ADC value on CORRECT channel (channel 0)
         * Note: Due to BUG #8, the application reads from channel 2
         * instead of channel 0, so it sees oil pressure data! */
        Adc_Sim_SetRawValue(0u, simTemp);
        /* Also set some value on channel 2 (what app actually reads) */
        Adc_Sim_SetRawValue(2u, 1500u);  /* Oil pressure stays constant */

        /* Simulate button press at iteration 80 */
        if (iteration == 80u) {
            printf("\n=== [SIM] Button pressed at iteration %u ===\n\n", iteration);
            SWC_ButtonHandler_Sim_Press();
        }
        if (iteration == 120u) {
            printf("\n=== [SIM] Button released at iteration %u ===\n\n", iteration);
            SWC_ButtonHandler_Sim_Release();
        }

        /* Run the cooperative scheduler */
        Os_RunScheduler();

        /* Tick hardware timers */
        Gpt_Sim_Tick();

        /* Feed watchdog */
        Wdg_Trigger();

        iteration++;
    }

    /* ========================================
     * Shutdown
     * ======================================== */
    printf("\n========================================\n");
    printf("  Simulation complete: %u iterations\n", iteration);
    printf("  Total WDG triggers: %u\n", Wdg_GetTriggerCounter());
    printf("  Total DET errors:   %u\n", Det_GetErrorCount());
    printf("========================================\n");

    EcuM_Shutdown();

    return 0;
}
