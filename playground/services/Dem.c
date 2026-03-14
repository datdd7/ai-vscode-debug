/**
 * @file    Dem.c
 * @brief   DEM - Diagnostic Event Manager implementation
 */

#include "Dem.h"
#include <stdio.h>

static Dem_EventStatusType Dem_EventStatus[DEM_MAX_EVENTS];
static uint16 Dem_StoredDTCCount = 0u;

void Dem_Init(void) {
    uint16 i;
    for (i = 0u; i < DEM_MAX_EVENTS; i++) {
        Dem_EventStatus[i] = DEM_EVENT_STATUS_PASSED;
    }
    Dem_StoredDTCCount = 0u;
    printf("[DEM] Initialized\n");
}

Std_ReturnType Dem_SetEventStatus(Dem_EventIdType EventId, Dem_EventStatusType EventStatus) {
    if (EventId == 0u || EventId >= DEM_MAX_EVENTS) return E_NOT_OK;

    Dem_EventStatusType oldStatus = Dem_EventStatus[EventId];
    Dem_EventStatus[EventId] = EventStatus;

    if (EventStatus == DEM_EVENT_STATUS_FAILED && oldStatus != DEM_EVENT_STATUS_FAILED) {
        Dem_StoredDTCCount++;
        printf("[DEM] Event %u FAILED (DTC stored, total=%u)\n", EventId, Dem_StoredDTCCount);
    } else if (EventStatus == DEM_EVENT_STATUS_PASSED && oldStatus == DEM_EVENT_STATUS_FAILED) {
        if (Dem_StoredDTCCount > 0u) Dem_StoredDTCCount--;
        printf("[DEM] Event %u PASSED (cleared)\n", EventId);
    }
    return E_OK;
}

Std_ReturnType Dem_GetEventStatus(Dem_EventIdType EventId, Dem_EventStatusType* EventStatusPtr) {
    if (EventId == 0u || EventId >= DEM_MAX_EVENTS || EventStatusPtr == NULL_PTR) return E_NOT_OK;
    *EventStatusPtr = Dem_EventStatus[EventId];
    return E_OK;
}

uint16 Dem_GetNumberOfStoredDTCs(void) {
    return Dem_StoredDTCCount;
}

void Dem_ClearAllDTCs(void) {
    uint16 i;
    for (i = 0u; i < DEM_MAX_EVENTS; i++) {
        Dem_EventStatus[i] = DEM_EVENT_STATUS_PASSED;
    }
    Dem_StoredDTCCount = 0u;
    printf("[DEM] All DTCs cleared\n");
}
