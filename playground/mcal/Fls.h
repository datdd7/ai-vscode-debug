/**
 * @file    Fls.h
 * @brief   FLS Driver - Flash Memory
 */

#ifndef FLS_H
#define FLS_H

#include "../platform/Std_Types.h"
#include "Fls_Cfg.h"

typedef uint32 Fls_AddressType;
typedef uint32 Fls_LengthType;

typedef enum {
    MEMIF_UNINIT = 0,
    MEMIF_IDLE,
    MEMIF_BUSY,
    MEMIF_BUSY_INTERNAL
} MemIf_StatusType;

typedef enum {
    MEMIF_JOB_OK = 0,
    MEMIF_JOB_PENDING,
    MEMIF_JOB_FAILED,
    MEMIF_JOB_CANCELLED,
    MEMIF_BLOCK_INCONSISTENT,
    MEMIF_BLOCK_INVALID
} MemIf_JobResultType;

void               Fls_Init(const Fls_ConfigType* ConfigPtr);
Std_ReturnType     Fls_Erase(Fls_AddressType TargetAddress, Fls_LengthType Length);
Std_ReturnType     Fls_Write(Fls_AddressType TargetAddress, const uint8* SourceAddressPtr, Fls_LengthType Length);
Std_ReturnType     Fls_Read(Fls_AddressType SourceAddress, uint8* TargetAddressPtr, Fls_LengthType Length);
MemIf_StatusType   Fls_GetStatus(void);
MemIf_JobResultType Fls_GetJobResult(void);

#endif /* FLS_H */
