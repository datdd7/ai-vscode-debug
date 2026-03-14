/**
 * @file    SWC_ButtonHandler.c
 * @brief   Button debounce and manual override toggle
 */

#include "SWC_ButtonHandler.h"
#include "../mcal/Dio.h"
#include <stdio.h>

static uint8  BtnDebounceCount = 0u;
static uint8  BtnLastState     = STD_LOW;
static boolean BtnOverrideToggle = FALSE;
static boolean BtnSimPressed    = FALSE;

void SWC_ButtonHandler_Init(void) {
    BtnDebounceCount  = 0u;
    BtnLastState      = STD_LOW;
    BtnOverrideToggle = FALSE;
}

void SWC_ButtonHandler_Sim_Press(void) {
    BtnSimPressed = TRUE;
    Dio_WriteChannel(DIO_CH_BUTTON_1, STD_HIGH);
}

void SWC_ButtonHandler_Sim_Release(void) {
    BtnSimPressed = FALSE;
    Dio_WriteChannel(DIO_CH_BUTTON_1, STD_LOW);
}

void SWC_ButtonHandler_MainFunction(void) {
    uint8 currentState;

    IoHwAb_Dio_GetInput(IOHWAB_SIG_BUTTON_OVERRIDE, &currentState);

    if (currentState == STD_HIGH && BtnLastState == STD_LOW) {
        /* Rising edge detected */
        BtnDebounceCount++;
        if (BtnDebounceCount >= 3u) {
            /* Toggle override */
            BtnOverrideToggle = !BtnOverrideToggle;
            Rte_Write_ManualOverride(BtnOverrideToggle);
            printf("[BTN] Manual override %s\n", BtnOverrideToggle ? "ON" : "OFF");
            BtnDebounceCount = 0u;
        }
    } else if (currentState == STD_LOW) {
        BtnDebounceCount = 0u;
    }

    BtnLastState = currentState;
}
