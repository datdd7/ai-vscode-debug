/**
 * @file    Utils_Filter.h
 * @brief   Digital filtering utilities
 */
#ifndef UTILS_FILTER_H
#define UTILS_FILTER_H

#include "../platform/Std_Types.h"

typedef struct {
    sint32  Output;         /* Current filtered output */
    uint16  Alpha;          /* Filter coefficient x1000 (200 = 0.2) */
    boolean Initialized;
} Filter_StateType;

void    Filter_Init(Filter_StateType* state, uint16 alpha);
sint32  Filter_Update(Filter_StateType* state, sint32 input);
void    Filter_Reset(Filter_StateType* state);

#endif /* UTILS_FILTER_H */
