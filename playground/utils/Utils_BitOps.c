/**
 * @file    Utils_BitOps.c
 */

#include "Utils_BitOps.h"

uint8 Utils_CountSetBits(uint32 value) {
    uint8 count = 0u;
    while (value) {
        count += (uint8)(value & 1u);
        value >>= 1u;
    }
    return count;
}

uint32 Utils_ReverseBits(uint32 value, uint8 numBits) {
    uint32 result = 0u;
    uint8 i;
    for (i = 0u; i < numBits; i++) {
        result = (result << 1u) | (value & 1u);
        value >>= 1u;
    }
    return result;
}

uint8 Utils_FindFirstSetBit(uint32 value) {
    uint8 pos = 0u;
    if (value == 0u) return 0xFFu;
    while ((value & 1u) == 0u) {
        value >>= 1u;
        pos++;
    }
    return pos;
}
