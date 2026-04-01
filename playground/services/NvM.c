/**
 * @file    NvM.c
 * @brief   NvM - Non-volatile Memory Manager
 *
 * BUG #4: Null pointer dereference when reading uninitialized block.
 *         When NvM_ReadBlock is called for a block that hasn't been written yet,
 *         the internal RAM mirror pointer is NULL, leading to a crash.
 */

#include "NvM.h"
#include "../mcal/Fls.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

typedef struct {
    uint8*  RamMirror;      /* Pointer to RAM copy */
    uint32  FlashAddress;
    uint16  Size;
    boolean Valid;
    boolean Modified;
} NvM_BlockDescriptor;

static NvM_BlockDescriptor NvM_Blocks[NVM_MAX_BLOCKS];
static boolean NvM_Initialized = FALSE;

void NvM_Init(void) {
    uint8 i;
    for (i = 0u; i < NVM_MAX_BLOCKS; i++) {
        NvM_Blocks[i].RamMirror    = NULL_PTR;  /* Not allocated yet! */
        NvM_Blocks[i].FlashAddress = i * NVM_BLOCK_SIZE;
        NvM_Blocks[i].Size         = NVM_BLOCK_SIZE;
        NvM_Blocks[i].Valid        = FALSE;
        NvM_Blocks[i].Modified     = FALSE;
    }
    NvM_Initialized = TRUE;
    printf("[NVM] Initialized %u blocks\n", NVM_MAX_BLOCKS);
}

Std_ReturnType NvM_ReadBlock(NvM_BlockIdType BlockId, void* DstPtr) {
    if (!NvM_Initialized || BlockId >= NVM_MAX_BLOCKS || DstPtr == NULL_PTR) {
        return E_NOT_OK;
    }

    if (NvM_Blocks[BlockId].RamMirror == NULL_PTR) {
        NvM_Blocks[BlockId].RamMirror = (uint8*)malloc(NVM_BLOCK_SIZE);
        if (NvM_Blocks[BlockId].RamMirror == NULL_PTR) return E_NOT_OK;
        memset(NvM_Blocks[BlockId].RamMirror, 0xFF, NVM_BLOCK_SIZE);
    }

    if (!NvM_Blocks[BlockId].Valid) {
        /* Fix BUG #4: mirror is now allocated */
        memcpy(NvM_Blocks[BlockId].RamMirror, 
               &NvM_Blocks[BlockId].FlashAddress,
               NvM_Blocks[BlockId].Size);
        NvM_Blocks[BlockId].Valid = TRUE;
    }

    memcpy(DstPtr, NvM_Blocks[BlockId].RamMirror, NvM_Blocks[BlockId].Size);
    return E_OK;
}

Std_ReturnType NvM_WriteBlock(NvM_BlockIdType BlockId, const void* SrcPtr) {
    if (!NvM_Initialized || BlockId >= NVM_MAX_BLOCKS || SrcPtr == NULL_PTR) {
        return E_NOT_OK;
    }

    /* Allocate RAM mirror if needed */
    if (NvM_Blocks[BlockId].RamMirror == NULL_PTR) {
        NvM_Blocks[BlockId].RamMirror = (uint8*)malloc(NVM_BLOCK_SIZE);
        if (NvM_Blocks[BlockId].RamMirror == NULL_PTR) {
            printf("[NVM] ERROR: Failed to allocate RAM mirror for block %u\n", BlockId);
            return E_NOT_OK;
        }
    }

    memcpy(NvM_Blocks[BlockId].RamMirror, SrcPtr, NVM_BLOCK_SIZE);
    NvM_Blocks[BlockId].Valid    = TRUE;
    NvM_Blocks[BlockId].Modified = TRUE;

    /* Write-through to flash */
    Fls_Write(NvM_Blocks[BlockId].FlashAddress,
              NvM_Blocks[BlockId].RamMirror,
              NvM_Blocks[BlockId].Size);

    return E_OK;
}

Std_ReturnType NvM_RestoreBlockDefaults(NvM_BlockIdType BlockId) {
    if (BlockId >= NVM_MAX_BLOCKS) return E_NOT_OK;

    if (NvM_Blocks[BlockId].RamMirror != NULL_PTR) {
        memset(NvM_Blocks[BlockId].RamMirror, 0, NVM_BLOCK_SIZE);
    }
    NvM_Blocks[BlockId].Valid    = FALSE;
    NvM_Blocks[BlockId].Modified = FALSE;
    return E_OK;
}

Std_ReturnType NvM_GetBlockStatus(NvM_BlockIdType BlockId, uint8* StatusPtr) {
    if (BlockId >= NVM_MAX_BLOCKS || StatusPtr == NULL_PTR) return E_NOT_OK;
    *StatusPtr = NvM_Blocks[BlockId].Valid ? 1u : 0u;
    return E_OK;
}
