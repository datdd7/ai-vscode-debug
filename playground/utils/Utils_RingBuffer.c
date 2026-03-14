/**
 * @file    Utils_RingBuffer.c
 * @brief   Circular buffer implementation
 *
 * BUG #1: Off-by-one error in wrap-around logic.
 *         The head pointer wraps at Size instead of (Size - 1),
 *         causing it to go out of bounds and corrupt memory.
 */

#include "Utils_RingBuffer.h"

void RingBuffer_Init(RingBuffer_Type* rb, uint16 size) {
    if (rb == NULL_PTR) return;
    rb->Head  = 0u;
    rb->Tail  = 0u;
    rb->Count = 0u;
    rb->Size  = (size <= RINGBUF_MAX_SIZE) ? size : RINGBUF_MAX_SIZE;
}

Std_ReturnType RingBuffer_Push(RingBuffer_Type* rb, uint8 data) {
    if (rb == NULL_PTR || RingBuffer_IsFull(rb)) return E_NOT_OK;

    rb->Buffer[rb->Head] = data;
    rb->Count++;

    /* === BUG #1: Off-by-one in wrap-around ===
     * Should be: rb->Head = (rb->Head + 1u) % rb->Size;
     * But uses (rb->Size + 1) which means Head can equal rb->Size,
     * which is one past the valid index range [0, Size-1].
     * This causes Buffer[Size] write = buffer overflow!
     */
    rb->Head = (rb->Head + 1u) % (rb->Size + 1u);  /* BUG: should be % rb->Size */

    return E_OK;
}

Std_ReturnType RingBuffer_Pop(RingBuffer_Type* rb, uint8* data) {
    if (rb == NULL_PTR || data == NULL_PTR || RingBuffer_IsEmpty(rb)) return E_NOT_OK;

    *data = rb->Buffer[rb->Tail];
    rb->Count--;

    /* Same wrap-around bug as Push */
    rb->Tail = (rb->Tail + 1u) % (rb->Size + 1u);  /* BUG: should be % rb->Size */

    return E_OK;
}

boolean RingBuffer_IsFull(const RingBuffer_Type* rb) {
    if (rb == NULL_PTR) return TRUE;
    return (rb->Count >= rb->Size);
}

boolean RingBuffer_IsEmpty(const RingBuffer_Type* rb) {
    if (rb == NULL_PTR) return TRUE;
    return (rb->Count == 0u);
}

uint16 RingBuffer_GetCount(const RingBuffer_Type* rb) {
    if (rb == NULL_PTR) return 0u;
    return rb->Count;
}
