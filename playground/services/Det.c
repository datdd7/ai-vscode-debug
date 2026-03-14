/**
 * @file    Det.c
 * @brief   DET - Default Error Tracer implementation
 */

#include "Det.h"
#include <stdio.h>

static Det_ErrorType Det_ErrorLog[DET_MAX_ERRORS];
static uint32 Det_ErrorCount = 0u;

void Det_Init(void) {
    Det_ErrorCount = 0u;
    printf("[DET] Initialized\n");
}

Std_ReturnType Det_ReportError(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId) {
    if (Det_ErrorCount < DET_MAX_ERRORS) {
        Det_ErrorLog[Det_ErrorCount].ModuleId   = ModuleId;
        Det_ErrorLog[Det_ErrorCount].InstanceId = InstanceId;
        Det_ErrorLog[Det_ErrorCount].ApiId      = ApiId;
        Det_ErrorLog[Det_ErrorCount].ErrorId    = ErrorId;
    }
    Det_ErrorCount++;
    printf("[DET] Error: Module=0x%04X Instance=%u Api=%u Error=%u\n",
           ModuleId, InstanceId, ApiId, ErrorId);
    return E_OK;
}

uint32 Det_GetErrorCount(void) {
    return Det_ErrorCount;
}

const Det_ErrorType* Det_GetLastError(void) {
    if (Det_ErrorCount == 0u) return NULL_PTR;
    uint32 idx = (Det_ErrorCount <= DET_MAX_ERRORS) ? Det_ErrorCount - 1u : DET_MAX_ERRORS - 1u;
    return &Det_ErrorLog[idx];
}
