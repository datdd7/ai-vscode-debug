/**
 * @file    Utils_Filter.c
 * @brief   Low-pass digital filter
 *
 * BUG #2: Uninitialized accumulator.
 *         The Filter_Init function does NOT properly initialize the
 *         Output field, leaving it with random stack data. The first
 *         few filter outputs will be wildly wrong until the filter
 *         converges to the actual input value.
 */

#include "Utils_Filter.h"

void Filter_Init(Filter_StateType* state, uint16 alpha) {
    if (state == NULL_PTR) return;

    /* === BUG #2: Missing initialization of Output ===
     * state->Output is NOT set to 0 here.
     * CORRECT code: state->Output = 0;
     *
     * Since Filter_StateType may be allocated on the stack or as a
     * static global (which is zero-initialized), this bug may only
     * manifest when allocated on stack or after a warm reset.
     *
     * We intentionally set a garbage pattern to make the bug visible:
     */
    state->Alpha       = alpha;
    state->Initialized = FALSE;  /* BUG: should be TRUE, and Output should be set */
    /* state->Output is left uninitialized! */
}

sint32 Filter_Update(Filter_StateType* state, sint32 input) {
    if (state == NULL_PTR) return input;

    if (!state->Initialized) {
        /* First sample: should initialize to input, but check what happens
         * when Output has garbage from BUG #2 */
        state->Output = state->Output;  /* BUG: uses garbage Output value! */
        state->Initialized = TRUE;
        /* CORRECT: state->Output = input; */
    }

    /* Exponential moving average: output = alpha * input + (1-alpha) * output
     * Alpha is in x1000 format (200 = 0.2) */
    state->Output = (sint32)(
        ((sint64)state->Alpha * input + (sint64)(1000 - state->Alpha) * state->Output) / 1000
    );

    return state->Output;
}

void Filter_Reset(Filter_StateType* state) {
    if (state == NULL_PTR) return;
    state->Output      = 0;
    state->Initialized = FALSE;
}
