/**
 * @file    Fls_Cfg.h
 */
#ifndef FLS_CFG_H
#define FLS_CFG_H

#include "../platform/Std_Types.h"

#define FLS_TOTAL_SIZE      (64u * 1024u)   /* 64KB simulated flash */
#define FLS_SECTOR_SIZE     4096u
#define FLS_PAGE_SIZE       256u

typedef struct {
    uint32 BaseAddress;
    uint32 TotalSize;
    uint32 SectorSize;
} Fls_ConfigType;

extern const Fls_ConfigType Fls_Config;

#endif /* FLS_CFG_H */
