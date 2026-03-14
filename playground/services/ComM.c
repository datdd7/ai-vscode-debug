/**
 * @file    ComM.c
 */
#include "ComM.h"
#include <stdio.h>

static ComM_ModeType ComM_Mode = COMM_NO_COMMUNICATION;

void ComM_Init(void) {
    ComM_Mode = COMM_NO_COMMUNICATION;
    printf("[ComM] Initialized\n");
}

Std_ReturnType ComM_RequestComMode(ComM_ModeType Mode) {
    printf("[ComM] Mode: %u -> %u\n", ComM_Mode, Mode);
    ComM_Mode = Mode;
    return E_OK;
}

ComM_ModeType ComM_GetCurrentMode(void) { return ComM_Mode; }
