/**
 * @file    SWC_ButtonHandler.h
 */
#ifndef SWC_BUTTONHANDLER_H
#define SWC_BUTTONHANDLER_H

#include "../rte/Rte_SWC_ButtonHandler.h"

void SWC_ButtonHandler_Init(void);
void SWC_ButtonHandler_MainFunction(void);

/* Simulation: press/release button */
void SWC_ButtonHandler_Sim_Press(void);
void SWC_ButtonHandler_Sim_Release(void);

#endif /* SWC_BUTTONHANDLER_H */
