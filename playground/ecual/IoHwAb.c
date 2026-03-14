/**
 * @file    IoHwAb.c
 * @brief   I/O Hardware Abstraction - Main initialization
 */

#include "IoHwAb.h"
#include "IoHwAb_Dio.h"
#include "IoHwAb_Adc.h"
#include "IoHwAb_Pwm.h"
#include <stdio.h>

void IoHwAb_Init(void) {
    IoHwAb_Dio_Init();
    IoHwAb_Adc_Init();
    IoHwAb_Pwm_Init();
    printf("[IoHwAb] All sub-modules initialized\n");
}
