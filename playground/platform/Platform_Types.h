/**
 * @file    Platform_Types.h
 * @brief   AUTOSAR Platform-dependent type definitions
 * @details Defines basic integer types for 32-bit ARM Cortex-M platform (simulated on x86)
 */

#ifndef PLATFORM_TYPES_H
#define PLATFORM_TYPES_H

/* ============================================================================
 *  CPU Type Definitions
 * ============================================================================ */
#define CPU_TYPE_8      8u
#define CPU_TYPE_16     16u
#define CPU_TYPE_32     32u
#define CPU_TYPE        CPU_TYPE_32

#define MSB_FIRST       0u
#define LSB_FIRST       1u
#define CPU_BYTE_ORDER  LSB_FIRST

#define HIGH_BYTE_FIRST 0u
#define LOW_BYTE_FIRST  1u
#define CPU_BIT_ORDER   LSB_FIRST

/* ============================================================================
 *  Boolean Type
 * ============================================================================ */
#ifndef TRUE
#define TRUE    1u
#endif

#ifndef FALSE
#define FALSE   0u
#endif

typedef unsigned char       boolean;

/* ============================================================================
 *  Integer Types
 * ============================================================================ */
typedef signed char         sint8;
typedef unsigned char       uint8;
typedef signed short        sint16;
typedef unsigned short      uint16;
typedef signed int          sint32;
typedef unsigned int        uint32;
typedef signed long long    sint64;
typedef unsigned long long  uint64;

typedef unsigned int        uint8_least;
typedef unsigned int        uint16_least;
typedef unsigned int        uint32_least;
typedef signed int          sint8_least;
typedef signed int          sint16_least;
typedef signed int          sint32_least;

/* ============================================================================
 *  Float Types
 * ============================================================================ */
typedef float               float32;
typedef double              float64;

/* ============================================================================
 *  Void Pointer
 * ============================================================================ */
typedef void*               VoidPtr;
typedef const void*         ConstVoidPtr;

#endif /* PLATFORM_TYPES_H */
