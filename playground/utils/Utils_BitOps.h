/**
 * @file    Utils_BitOps.h
 */
#ifndef UTILS_BITOPS_H
#define UTILS_BITOPS_H

#include "../platform/Std_Types.h"

#define BIT_SET(reg, bit)     ((reg) |= (1u << (bit)))
#define BIT_CLR(reg, bit)     ((reg) &= ~(1u << (bit)))
#define BIT_TOGGLE(reg, bit)  ((reg) ^= (1u << (bit)))
#define BIT_CHECK(reg, bit)   (((reg) >> (bit)) & 1u)

uint8  Utils_CountSetBits(uint32 value);
uint32 Utils_ReverseBits(uint32 value, uint8 numBits);
uint8  Utils_FindFirstSetBit(uint32 value);

#endif /* UTILS_BITOPS_H */
