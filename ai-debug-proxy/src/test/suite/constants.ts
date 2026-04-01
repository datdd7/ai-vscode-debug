/**
 * @file constants.ts
 * @brief Centralized test constants for E2E test suite.
 *
 * All line number references to playground/main.c are defined here.
 * When main.c changes, update ONLY this file.
 */

/** Line numbers in playground/main.c (verified 2026-03-30) */
export const MAIN_C = {
    FUNCTION_START:     33,   // int main(void) {
    ITERATION_DECL:     34,   // uint32 iteration = 0u;
    ECUM_INIT:          39,   // EcuM_Init();
    RTE_INIT:           44,   // Rte_Init();
    SWC_TEMP_INIT:      47,   // SWC_TempMonitor_Init();
    SWC_BUTTON_INIT:    50,   // SWC_ButtonHandler_Init();
    ECUM_STARTUP_TWO:   58,   // EcuM_StartupTwo();
    WHILE_LOOP:         63,   // while (iteration < OS_MAX_ITERATIONS)
    SIM_TEMP_DECL:      70,   // uint16 simTemp;
    BUTTON_PRESS:       93,   // if (iteration == 80u)
    OS_RUN_SCHEDULER:   103,  // Os_RunScheduler();
    GPT_SIM_TICK:       106,  // Gpt_Sim_Tick();
    ITERATION_INC:      111,  // iteration++;
    USLEEP:             112,  // usleep(1000);
    ECUM_SHUTDOWN:      124,  // EcuM_Shutdown();
    RETURN:             126,  // return 0;
};

/** Line numbers in playground/main_mt.cpp (verified 2026-03-30) */
export const MAIN_MT = {
    FUNCTION_START:         77,   // int main() {
    THREAD_CREATE_FIRST:    87,   // std::thread t1(...)
    THREAD_CREATE_LAST:     89,   // std::thread t3(...)
    THREAD_JOIN_FIRST:      91,   // t1.join()
    THREAD_JOIN_LAST:       93,   // t3.join()
};

/** Wait times (ms) for E2E test operations */
export const TIMEOUTS = {
    LAUNCH_SETTLE:      5000,   // Wait for GDB start + hit entry
    STEP_SETTLE:        1500,   // Wait for a single step
    CONTINUE_RUN:       1500,   // Let program run in loop before pausing
    PAUSE_SETTLE:       800,    // Wait for pause to register
    QUICK:              500,    // Quick operation settle
    STOP_POLL_INTERVAL: 200,    // Polling interval for waitForStop
    STOP_POLL_TIMEOUT:  8000,   // Max time to wait for stop
    SESSION_CLEANUP:    800,    // Wait after stopDebugging
};
