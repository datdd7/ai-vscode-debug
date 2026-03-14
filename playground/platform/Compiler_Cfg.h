/**
 * @file    Compiler_Cfg.h
 * @brief   Module-specific compiler configuration
 */

#ifndef COMPILER_CFG_H
#define COMPILER_CFG_H

/* Memory class macros for each module */
#define MCU_CODE
#define MCU_CONST
#define MCU_VAR
#define MCU_APPL_DATA

#define PORT_CODE
#define PORT_CONST
#define PORT_VAR

#define DIO_CODE
#define DIO_CONST
#define DIO_VAR

#define ADC_CODE
#define ADC_CONST
#define ADC_VAR

#define PWM_CODE
#define PWM_CONST
#define PWM_VAR

#define GPT_CODE
#define GPT_CONST
#define GPT_VAR

#define SPI_CODE
#define SPI_CONST
#define SPI_VAR

#define UART_CODE
#define UART_CONST
#define UART_VAR

#define ICU_CODE
#define ICU_CONST
#define ICU_VAR

#define WDG_CODE
#define WDG_CONST
#define WDG_VAR

#define FLS_CODE
#define FLS_CONST
#define FLS_VAR

#define OS_CODE
#define OS_VAR

#define NVM_CODE
#define NVM_VAR

#define RTE_CODE
#define RTE_VAR

#define APP_CODE
#define APP_VAR

#endif /* COMPILER_CFG_H */
