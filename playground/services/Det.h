/**
 * @file    Det.h
 * @brief   DET - Default Error Tracer
 */
#ifndef DET_H
#define DET_H

#include "../platform/Std_Types.h"

#define DET_MAX_ERRORS  32u

typedef struct {
    uint16 ModuleId;
    uint8  InstanceId;
    uint8  ApiId;
    uint8  ErrorId;
} Det_ErrorType;

void            Det_Init(void);
Std_ReturnType  Det_ReportError(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId);
uint32          Det_GetErrorCount(void);
const Det_ErrorType* Det_GetLastError(void);

#endif /* DET_H */
