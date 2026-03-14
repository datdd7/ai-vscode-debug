/**
 * @file    Dio_Cfg.h
 * @brief   DIO Driver configuration
 */

#ifndef DIO_CFG_H
#define DIO_CFG_H

#include "../platform/Std_Types.h"

typedef uint8 Dio_PortType;

#define DIO_MAX_CHANNELS    32u
#define DIO_MAX_PORTS       4u
#define DIO_CHANNELS_PER_PORT 8u

/* Channel IDs (same as Port pin IDs) */
#define DIO_CH_LED_GREEN    0u
#define DIO_CH_LED_YELLOW   1u
#define DIO_CH_LED_RED      2u
#define DIO_CH_BUTTON_1     3u

/* Port IDs */
#define DIO_PORT_A          0u
#define DIO_PORT_B          1u

#endif /* DIO_CFG_H */
