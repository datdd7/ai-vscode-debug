/**
 * @file    NvM.h
 * @brief   NvM - Non-volatile Memory Manager
 */
#ifndef NVM_H
#define NVM_H

#include "../platform/Std_Types.h"

typedef uint16 NvM_BlockIdType;

#define NVM_MAX_BLOCKS      8u
#define NVM_BLOCK_SIZE      64u

/* Block IDs */
#define NVM_BLOCK_CALIB_DATA    1u  /* Calibration thresholds */
#define NVM_BLOCK_ERROR_LOG     2u  /* Error counter log */
#define NVM_BLOCK_RUNTIME_DATA  3u  /* Runtime statistics */

void            NvM_Init(void);
Std_ReturnType  NvM_ReadBlock(NvM_BlockIdType BlockId, void* DstPtr);
Std_ReturnType  NvM_WriteBlock(NvM_BlockIdType BlockId, const void* SrcPtr);
Std_ReturnType  NvM_RestoreBlockDefaults(NvM_BlockIdType BlockId);
Std_ReturnType  NvM_GetBlockStatus(NvM_BlockIdType BlockId, uint8* StatusPtr);

#endif /* NVM_H */
