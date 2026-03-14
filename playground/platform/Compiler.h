/**
 * @file    Compiler.h
 * @brief   AUTOSAR Compiler abstraction macros
 */

#ifndef COMPILER_H
#define COMPILER_H

#include "Compiler_Cfg.h"

/* Compiler identification */
#define _GCC_C_          /* GCC Compiler */

/* ============================================================================
 *  Storage Classes & Qualifiers
 * ============================================================================ */
#define AUTOMATIC
#define TYPEDEF

#define STATIC      static
#define LOCAL_INLINE static inline

#define INLINE      inline

#define FUNC(rettype, memclass)             rettype
#define FUNC_P2CONST(rettype, pclass, mclass)  const rettype *
#define FUNC_P2VAR(rettype, pclass, mclass)    rettype *

#define P2VAR(ptrtype, memclass, ptrclass)      ptrtype *
#define P2CONST(ptrtype, memclass, ptrclass)    const ptrtype *
#define CONSTP2VAR(ptrtype, memclass, ptrclass) ptrtype * const
#define CONSTP2CONST(ptrtype, memclass, ptrclass) const ptrtype * const
#define P2FUNC(rettype, ptrclass, fctname)       rettype (*fctname)

#define CONST(consttype, memclass)      const consttype
#define VAR(vartype, memclass)          vartype

/* NULL_PTR definition */
#ifndef NULL_PTR
#define NULL_PTR    ((void*)0)
#endif

#endif /* COMPILER_H */
