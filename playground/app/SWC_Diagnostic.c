/**
 * @file    SWC_Diagnostic.c
 * @brief   Diagnostic handler - processes UDS-like requests
 *
 * BUG #9: Stack overflow due to recursive error handling.
 *         When a diagnostic error is detected, the error handler calls
 *         itself recursively without proper termination condition,
 *         eventually blowing the stack.
 */

#include "SWC_Diagnostic.h"
#include "../services/Dem.h"
#include "../services/Det.h"
#include "../services/NvM.h"
#include "../services/CanIf.h"
#include "../utils/Utils_Crc.h"
#include <stdio.h>
#include <string.h>

#define DIAG_SERVICE_READ_DTC       0x19u
#define DIAG_SERVICE_CLEAR_DTC      0x14u
#define DIAG_SERVICE_READ_DATA      0x22u
#define DIAG_SERVICE_TESTER_PRESENT 0x3Eu

static uint32 Diag_RequestCount    = 0u;
static uint32 Diag_ErrorHandleDepth = 0u;

/**
 * BUG #9: Recursive error handler with no depth limit.
 * When an error occurs, this function logs it and tries to report
 * the error to DEM. If DEM reporting fails, it calls itself again
 * to handle THAT error, creating infinite recursion.
 */
static void Diag_HandleError(uint8 errorCode, uint8 severity) {
    Diag_ErrorHandleDepth++;

    printf("[DIAG] HandleError: code=%u severity=%u depth=%u\n",
           errorCode, severity, Diag_ErrorHandleDepth);

    Rte_ErrorCount++;

    /* Log to DET */
    Det_ReportError(0x0050u, 0u, errorCode, severity);

    /* Try to report to DEM */
    Std_ReturnType result = Dem_SetEventStatus(DEM_EVENT_COMM_TIMEOUT, DEM_EVENT_STATUS_FAILED);

    /* === BUG #9: Recursive call without proper base case ===
     * If DEM reporting returns E_NOT_OK (which it does for invalid event IDs),
     * we recursively try to handle THAT error, creating infinite recursion.
     *
     * CORRECT: Should have a depth limit check:
     *   if (Diag_ErrorHandleDepth > MAX_ERROR_DEPTH) return;
     */
    if (result != E_OK) {
        /* BUG: This will recurse forever if DEM keeps returning E_NOT_OK */
        Diag_HandleError(errorCode + 1u, severity);  /* BUG: infinite recursion! */
    }

    Diag_ErrorHandleDepth--;
}

static void Diag_ProcessRequest(const Rte_DiagRequestType* request) {
    switch (request->ServiceId) {
        case DIAG_SERVICE_READ_DTC: {
            uint16 dtcCount = Dem_GetNumberOfStoredDTCs();
            printf("[DIAG] Read DTCs: count=%u\n", dtcCount);
            break;
        }
        case DIAG_SERVICE_CLEAR_DTC:
            Dem_ClearAllDTCs();
            printf("[DIAG] DTCs cleared\n");
            break;

        case DIAG_SERVICE_READ_DATA: {
            /* Read calibration data from NvM */
            uint8 nvmData[64];
            Std_ReturnType ret = NvM_ReadBlock(NVM_BLOCK_CALIB_DATA, nvmData);
            if (ret != E_OK) {
                printf("[DIAG] NvM read failed - triggering error handler\n");
                /* This triggers BUG #9 if the error handler recurses */
                Diag_HandleError(0x10u, 0x02u);
            }
            break;
        }
        case DIAG_SERVICE_TESTER_PRESENT:
            /* Simple keepalive - just acknowledge */
            break;

        default:
            printf("[DIAG] Unknown service: 0x%02X\n", request->ServiceId);
            break;
    }
}

void SWC_Diagnostic_Init(void) {
    Diag_RequestCount     = 0u;
    Diag_ErrorHandleDepth = 0u;
}

void SWC_Diagnostic_MainFunction(void) {
    Diag_RequestCount++;

    /* Simulate a periodic diagnostic request every 10 cycles */
    if (Diag_RequestCount % 10u == 0u) {
        Rte_DiagRequestType req;
        memset(&req, 0, sizeof(req));

        /* Alternate between different requests */
        switch ((Diag_RequestCount / 10u) % 4u) {
            case 0u: req.ServiceId = DIAG_SERVICE_TESTER_PRESENT; break;
            case 1u: req.ServiceId = DIAG_SERVICE_READ_DTC;       break;
            case 2u: req.ServiceId = DIAG_SERVICE_READ_DATA;      break;
            case 3u: req.ServiceId = DIAG_SERVICE_CLEAR_DTC;      break;
        }
        Diag_ProcessRequest(&req);
    }
}
