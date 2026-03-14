/**
 * @file    Fls.c
 * @brief   FLS Driver - Simulated flash using RAM buffer
 */

#include "Fls.h"
#include <stdio.h>
#include <string.h>

static uint8            Fls_Memory[FLS_TOTAL_SIZE];
static MemIf_StatusType Fls_Status    = MEMIF_UNINIT;
static MemIf_JobResultType Fls_JobResult = MEMIF_JOB_OK;

const Fls_ConfigType Fls_Config = {
    .BaseAddress = 0x08000000u,
    .TotalSize   = FLS_TOTAL_SIZE,
    .SectorSize  = FLS_SECTOR_SIZE
};

void Fls_Init(const Fls_ConfigType* ConfigPtr) {
    (void)ConfigPtr;
    memset(Fls_Memory, 0xFF, FLS_TOTAL_SIZE);
    Fls_Status    = MEMIF_IDLE;
    Fls_JobResult = MEMIF_JOB_OK;
    printf("[FLS] Initialized, %u KB simulated flash\n", FLS_TOTAL_SIZE / 1024u);
}

Std_ReturnType Fls_Erase(Fls_AddressType TargetAddress, Fls_LengthType Length) {
    if (Fls_Status != MEMIF_IDLE) return E_NOT_OK;
    if (TargetAddress + Length > FLS_TOTAL_SIZE) return E_NOT_OK;

    Fls_Status = MEMIF_BUSY;
    memset(&Fls_Memory[TargetAddress], 0xFF, Length);
    Fls_Status    = MEMIF_IDLE;
    Fls_JobResult = MEMIF_JOB_OK;
    return E_OK;
}

Std_ReturnType Fls_Write(Fls_AddressType TargetAddress, const uint8* SourceAddressPtr, Fls_LengthType Length) {
    if (Fls_Status != MEMIF_IDLE || SourceAddressPtr == NULL_PTR) return E_NOT_OK;
    if (TargetAddress + Length > FLS_TOTAL_SIZE) return E_NOT_OK;

    Fls_Status = MEMIF_BUSY;
    memcpy(&Fls_Memory[TargetAddress], SourceAddressPtr, Length);
    Fls_Status    = MEMIF_IDLE;
    Fls_JobResult = MEMIF_JOB_OK;
    return E_OK;
}

Std_ReturnType Fls_Read(Fls_AddressType SourceAddress, uint8* TargetAddressPtr, Fls_LengthType Length) {
    if (Fls_Status != MEMIF_IDLE || TargetAddressPtr == NULL_PTR) return E_NOT_OK;
    if (SourceAddress + Length > FLS_TOTAL_SIZE) return E_NOT_OK;

    Fls_Status = MEMIF_BUSY;
    memcpy(TargetAddressPtr, &Fls_Memory[SourceAddress], Length);
    Fls_Status    = MEMIF_IDLE;
    Fls_JobResult = MEMIF_JOB_OK;
    return E_OK;
}

MemIf_StatusType Fls_GetStatus(void) {
    return Fls_Status;
}

MemIf_JobResultType Fls_GetJobResult(void) {
    return Fls_JobResult;
}
