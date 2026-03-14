/**
 * @file    Std_Types.h
 * @brief   AUTOSAR Standard type definitions
 */

#ifndef STD_TYPES_H
#define STD_TYPES_H

#include "Platform_Types.h"
#include "Compiler.h"

/* ============================================================================
 *  Standard Return Type
 * ============================================================================ */
typedef uint8 Std_ReturnType;

#define E_OK        ((Std_ReturnType)0x00u)
#define E_NOT_OK    ((Std_ReturnType)0x01u)

/* ============================================================================
 *  Standard Version Info Type
 * ============================================================================ */
typedef struct {
    uint16 vendorID;
    uint16 moduleID;
    uint8  sw_major_version;
    uint8  sw_minor_version;
    uint8  sw_patch_version;
} Std_VersionInfoType;

/* ============================================================================
 *  Common Macros
 * ============================================================================ */
#define STD_HIGH    0x01u
#define STD_LOW     0x00u

#define STD_ACTIVE  0x01u
#define STD_IDLE    0x00u

#define STD_ON      0x01u
#define STD_OFF     0x00u

#ifndef NULL_PTR
#define NULL_PTR    ((void*)0)
#endif

#endif /* STD_TYPES_H */
