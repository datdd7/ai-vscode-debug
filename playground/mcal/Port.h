/**
 * @file    Port.h
 * @brief   Port Driver - Pin configuration and direction control
 */

#ifndef PORT_H
#define PORT_H

#include "../platform/Std_Types.h"
#include "Port_Cfg.h"

/* ============================================================================
 *  Type Definitions
 * ============================================================================ */
typedef uint8  Port_PinType;
typedef uint8  Port_PinDirectionType;
typedef uint32 Port_PinModeType;

#define PORT_PIN_IN     ((Port_PinDirectionType)0x00u)
#define PORT_PIN_OUT    ((Port_PinDirectionType)0x01u)

/* ============================================================================
 *  Function Prototypes
 * ============================================================================ */
void            Port_Init(const Port_ConfigType* ConfigPtr);
void            Port_SetPinDirection(Port_PinType Pin, Port_PinDirectionType Direction);
void            Port_SetPinMode(Port_PinType Pin, Port_PinModeType Mode);

#endif /* PORT_H */
