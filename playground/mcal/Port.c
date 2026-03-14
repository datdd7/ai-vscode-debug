/**
 * @file    Port.c
 * @brief   Port Driver - Dummy implementation
 */

#include "Port.h"
#include <stdio.h>

/* Simulated pin registers */
static uint8  Port_PinDirection[PORT_MAX_PINS];
static uint32 Port_PinMode[PORT_MAX_PINS];
static boolean Port_Initialized = FALSE;

/* Default configuration */
static const Port_PinConfigType Port_DefaultPins[] = {
    { PORT_PIN_LED_GREEN,  1u, STD_LOW,  0u },
    { PORT_PIN_LED_YELLOW, 1u, STD_LOW,  0u },
    { PORT_PIN_LED_RED,    1u, STD_LOW,  0u },
    { PORT_PIN_BUTTON_1,   0u, STD_LOW,  0u },
    { PORT_PIN_FAN_PWM,    1u, STD_LOW,  1u },  /* Alt function: PWM */
    { PORT_PIN_UART_TX,    1u, STD_LOW,  2u },  /* Alt function: UART */
    { PORT_PIN_UART_RX,    0u, STD_LOW,  2u },
    { PORT_PIN_ADC_TEMP,   0u, STD_LOW,  3u },  /* Alt function: Analog */
};

const Port_ConfigType Port_Config = {
    .NumPins   = sizeof(Port_DefaultPins) / sizeof(Port_DefaultPins[0]),
    .PinConfig = Port_DefaultPins
};

void Port_Init(const Port_ConfigType* ConfigPtr) {
    uint8 i;
    if (ConfigPtr == NULL_PTR) return;

    for (i = 0u; i < ConfigPtr->NumPins; i++) {
        const Port_PinConfigType* pin = &ConfigPtr->PinConfig[i];
        Port_PinDirection[pin->PinId] = pin->Direction;
        Port_PinMode[pin->PinId]      = pin->Mode;
    }
    Port_Initialized = TRUE;
    printf("[PORT] Initialized %u pins\n", ConfigPtr->NumPins);
}

void Port_SetPinDirection(Port_PinType Pin, Port_PinDirectionType Direction) {
    if (!Port_Initialized || Pin >= PORT_MAX_PINS) return;
    Port_PinDirection[Pin] = Direction;
}

void Port_SetPinMode(Port_PinType Pin, Port_PinModeType Mode) {
    if (!Port_Initialized || Pin >= PORT_MAX_PINS) return;
    Port_PinMode[Pin] = Mode;
}
