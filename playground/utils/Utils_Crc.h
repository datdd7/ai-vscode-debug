/**
 * @file    Utils_Crc.h
 */
#ifndef UTILS_CRC_H
#define UTILS_CRC_H

#include "../platform/Std_Types.h"

uint8   Utils_Crc8(const uint8* data, uint16 length);
uint16  Utils_Crc16(const uint8* data, uint16 length);

#endif /* UTILS_CRC_H */
