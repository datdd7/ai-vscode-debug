/**
 * @file    Utils_Crc.c
 * @brief   CRC calculation utilities
 *
 * BUG #6: Wrong CRC-8 polynomial.
 *         Uses 0x07 (CRC-8/ATM) instead of 0x1D (CRC-8/SAE-J1850)
 *         which is the automotive standard. CRC values won't match
 *         what the ECU diagnostics tester expects.
 */

#include "Utils_Crc.h"

/**
 * CRC-8 calculation
 *
 * BUG #6: Wrong polynomial!
 * Should use 0x1D (SAE-J1850 automotive standard)
 * but uses 0x07 (CRC-8/ATM standard instead)
 */
uint8 Utils_Crc8(const uint8* data, uint16 length) {
    uint8 crc = 0xFFu;  /* Initial value */
    uint16 i;
    uint8 j;

    if (data == NULL_PTR) return 0u;

    for (i = 0u; i < length; i++) {
        crc ^= data[i];
        for (j = 0u; j < 8u; j++) {
            if (crc & 0x80u) {
                crc = (uint8)((crc << 1u) ^ 0x07u);  /* BUG: Should be 0x1Du */
            } else {
                crc = (uint8)(crc << 1u);
            }
        }
    }
    return crc ^ 0xFFu;
}

/* CRC-16/CCITT - this one is correct */
uint16 Utils_Crc16(const uint8* data, uint16 length) {
    uint16 crc = 0xFFFFu;
    uint16 i;
    uint8 j;

    if (data == NULL_PTR) return 0u;

    for (i = 0u; i < length; i++) {
        crc ^= ((uint16)data[i] << 8u);
        for (j = 0u; j < 8u; j++) {
            if (crc & 0x8000u) {
                crc = (uint16)((crc << 1u) ^ 0x1021u);
            } else {
                crc = (uint16)(crc << 1u);
            }
        }
    }
    return crc;
}
