/**
 * @file    Dio.h
 * @brief   DIO Driver - Digital Input/Output
 */

#ifndef DIO_H
#define DIO_H

#include "../platform/Std_Types.h"
#include "Dio_Cfg.h"

typedef uint8  Dio_ChannelType;
typedef uint8  Dio_LevelType;
typedef uint8  Dio_PortLevelType;

Dio_LevelType     Dio_ReadChannel(Dio_ChannelType ChannelId);
void              Dio_WriteChannel(Dio_ChannelType ChannelId, Dio_LevelType Level);
Dio_PortLevelType Dio_ReadPort(Dio_PortType PortId);
void              Dio_WritePort(Dio_PortType PortId, Dio_PortLevelType Level);
Dio_LevelType     Dio_FlipChannel(Dio_ChannelType ChannelId);

#endif /* DIO_H */
