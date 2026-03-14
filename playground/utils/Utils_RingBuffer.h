/**
 * @file    Utils_RingBuffer.h
 */
#ifndef UTILS_RINGBUFFER_H
#define UTILS_RINGBUFFER_H

#include "../platform/Std_Types.h"

#define RINGBUF_MAX_SIZE    64u

typedef struct {
    uint8   Buffer[RINGBUF_MAX_SIZE];
    uint16  Head;
    uint16  Tail;
    uint16  Count;
    uint16  Size;
} RingBuffer_Type;

void            RingBuffer_Init(RingBuffer_Type* rb, uint16 size);
Std_ReturnType  RingBuffer_Push(RingBuffer_Type* rb, uint8 data);
Std_ReturnType  RingBuffer_Pop(RingBuffer_Type* rb, uint8* data);
boolean         RingBuffer_IsFull(const RingBuffer_Type* rb);
boolean         RingBuffer_IsEmpty(const RingBuffer_Type* rb);
uint16          RingBuffer_GetCount(const RingBuffer_Type* rb);

#endif /* UTILS_RINGBUFFER_H */
