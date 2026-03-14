/**
 * @file    Port_Cfg.h
 * @brief   Port Driver configuration
 */

#ifndef PORT_CFG_H
#define PORT_CFG_H

#include "../platform/Std_Types.h"

#define PORT_MAX_PINS       32u

/* Pin IDs */
#define PORT_PIN_LED_GREEN      0u
#define PORT_PIN_LED_YELLOW     1u
#define PORT_PIN_LED_RED        2u
#define PORT_PIN_BUTTON_1       3u
#define PORT_PIN_FAN_PWM        4u
#define PORT_PIN_UART_TX        5u
#define PORT_PIN_UART_RX        6u
#define PORT_PIN_SPI_SCK        7u
#define PORT_PIN_SPI_MOSI       8u
#define PORT_PIN_SPI_MISO       9u
#define PORT_PIN_ADC_TEMP       10u

typedef struct {
    uint8  PinId;
    uint8  Direction;   /* 0=IN, 1=OUT */
    uint8  InitValue;
    uint32 Mode;
} Port_PinConfigType;

typedef struct {
    uint8                   NumPins;
    const Port_PinConfigType* PinConfig;
} Port_ConfigType;

extern const Port_ConfigType Port_Config;

#endif /* PORT_CFG_H */
