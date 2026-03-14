/**
 * @file    Dem.h
 * @brief   DEM - Diagnostic Event Manager
 */
#ifndef DEM_H
#define DEM_H

#include "../platform/Std_Types.h"

typedef uint16 Dem_EventIdType;
typedef uint8  Dem_EventStatusType;

#define DEM_EVENT_STATUS_PASSED     0x00u
#define DEM_EVENT_STATUS_FAILED     0x01u
#define DEM_EVENT_STATUS_PREPASSED  0x02u
#define DEM_EVENT_STATUS_PREFAILED  0x03u

/* Event IDs */
#define DEM_EVENT_OVERTEMP          1u
#define DEM_EVENT_SENSOR_FAIL       2u
#define DEM_EVENT_FAN_FAIL          3u
#define DEM_EVENT_COMM_TIMEOUT      4u
#define DEM_EVENT_NVM_FAIL          5u
#define DEM_EVENT_WDG_TIMEOUT       6u

#define DEM_MAX_EVENTS              16u

void            Dem_Init(void);
Std_ReturnType  Dem_SetEventStatus(Dem_EventIdType EventId, Dem_EventStatusType EventStatus);
Std_ReturnType  Dem_GetEventStatus(Dem_EventIdType EventId, Dem_EventStatusType* EventStatusPtr);
uint16          Dem_GetNumberOfStoredDTCs(void);
void            Dem_ClearAllDTCs(void);

#endif /* DEM_H */
