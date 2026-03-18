/******************************************************************************
 * @file        BoundaryDetector.ts
 *
 * @brief       Boundary and risk detection for variables.
 *
 * @details
 * This module implements heuristics for detecting boundary violations,
 * null pointer risks, and other dangerous patterns in variable values
 * and source code.
 *
 * @project     AI Debug Proxy
 * @component   Debug Module
 *
 * @author      AI Agent
 * @date        2026-03-18
 *
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-WATCH-3   Boundary Detection
 * DD-WATCH-4   Null Pointer Risk Detection
 *
 * Architecture Requirements:
 * ARCH-HEURISTIC-002 Boundary Analysis [Satisfies $AI AI-5]
 * ARCH-HEURISTIC-003 Risk Detection [Satisfies $AI AI-6]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import { logger } from "../utils/logging";
import { VariableInfo } from "../types";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "BoundaryDetector";

// Type limits for overflow detection
const TYPE_LIMITS: Record<string, number> = {
  'char': 127,
  'unsigned char': 255,
  'short': 32767,
  'unsigned short': 65535,
  'int': 2147483647,
  'unsigned int': 4294967295,
  'long': 2147483647,
  'unsigned long': 4294967295,
  'long long': 9223372036854775807,
  'unsigned long long': 18446744073709551615,
  'float': 3.4028235e38,
  'double': 1.7976931348623157e308,
};

// Thresholds for risk levels
const HIGH_THRESHOLD = 0.95;  // 95% of max
const MEDIUM_THRESHOLD = 0.90;  // 90% of max
const LOW_THRESHOLD = 0.80;  // 80% of max

// Capacity warning threshold
const CAPACITY_HIGH_THRESHOLD = 0.90;
const CAPACITY_MEDIUM_THRESHOLD = 0.80;

/******************************************************************************
 * Type Definitions
 ******************************************************************************/

/**
 * @brief Risk level enumeration.
 */
export type RiskLevel = 'high' | 'medium' | 'low';

/**
 * @brief Boundary risk detection result.
 */
export interface BoundaryRisk {
  variable: string;
  riskType: 'overflow' | 'underflow' | 'capacity' | 'null_pointer' | 'division';
  riskLevel: RiskLevel;
  currentValue: string;
  threshold?: string;
  expression: string;
  reason: string;
  confidence: number;  // 0.0 - 1.0
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-WATCH-3.1
 *
 * @brief Detect boundary and risk patterns in variables.
 *
 * Analyzes variable values and source code to detect potential
 * boundary violations, null pointer dereferences, and other risks.
 *
 * [Satisfies $ARCH ARCH-HEURISTIC-002, ARCH-HEURISTIC-003]
 */
export class BoundaryDetector {
  
  /**
   * @brief Detect overflow/underflow risks.
   *
   * @param [in]  variables   Array of variables to analyze.
   *
   * @return Array of overflow risks.
   */
  detectOverflow(variables: VariableInfo[]): BoundaryRisk[] {
    const risks: BoundaryRisk[] = [];

    for (const variable of variables) {
      if (!variable.type || !variable.value) continue;

      // Check if type has known limits
      const typeKey = variable.type.toLowerCase().replace(/\s+/g, ' ');
      const limit = TYPE_LIMITS[typeKey];
      
      if (!limit) continue;

      const value = this.parseValue(variable.value);
      if (value === null) continue;

      const ratio = Math.abs(value) / limit;
      
      let riskLevel: RiskLevel | null = null;
      if (ratio >= HIGH_THRESHOLD) {
        riskLevel = 'high';
      } else if (ratio >= MEDIUM_THRESHOLD) {
        riskLevel = 'medium';
      } else if (ratio >= LOW_THRESHOLD) {
        riskLevel = 'low';
      }

      if (riskLevel) {
        const isNegative = value < 0;
        risks.push({
          variable: variable.name,
          riskType: isNegative ? 'underflow' : 'overflow',
          riskLevel,
          currentValue: variable.value,
          threshold: limit.toString(),
          expression: variable.name,
          reason: `Value ${variable.value} is ${(ratio * 100).toFixed(1)}% of ${typeKey} max (${limit})`,
          confidence: ratio,
        });
      }
    }

    return risks;
  }

  /**
   * @brief Detect null pointer dereference risks.
   *
   * @param [in]  sourceLine  Current source line.
   * @param [in]  pointers    Pointer variables.
   *
   * @return Array of null pointer risks.
   */
  detectNullPointerRisk(sourceLine: string, pointers: VariableInfo[]): BoundaryRisk[] {
    const risks: BoundaryRisk[] = [];

    // Patterns that indicate pointer dereference
    const derefPatterns = [
      /\b(\w+)\s*->\s*\w+/g,      // ptr->member
      /\*\s*(\w+)/g,              // *ptr
      /\b(\w+)\s*\[\s*\w+\s*\]/g, // ptr[index]
    ];

    const dereferencedVars = new Set<string>();

    for (const pattern of derefPatterns) {
      let match;
      while ((match = pattern.exec(sourceLine)) !== null) {
        dereferencedVars.add(match[1]);
      }
    }

    // Check if dereferenced pointers might be null
    for (const pointer of pointers) {
      if (!pointer.type?.includes('*') && !pointer.type?.toLowerCase().includes('ptr')) {
        continue;
      }

      if (dereferencedVars.has(pointer.name)) {
        const isNull = pointer.value === '0' || 
                       pointer.value === '0x0' || 
                       pointer.value === 'NULL' ||
                       pointer.value === 'nullptr' ||
                       !pointer.value ||
                       pointer.value.toLowerCase() === 'null';

        if (isNull) {
          risks.push({
            variable: pointer.name,
            riskType: 'null_pointer',
            riskLevel: 'high',
            currentValue: pointer.value || 'unknown',
            expression: pointer.name,
            reason: `Pointer '${pointer.name}' is null and dereferenced at current line`,
            confidence: 1.0,
          });
        } else {
          // Check if there's a null check before dereference
          const hasNullCheck = this.hasNullCheck(sourceLine, pointer.name);
          if (!hasNullCheck) {
            risks.push({
              variable: pointer.name,
              riskType: 'null_pointer',
              riskLevel: 'medium',
              currentValue: pointer.value || 'unknown',
              expression: pointer.name,
              reason: `Pointer '${pointer.name}' dereferenced without null check`,
              confidence: 0.7,
            });
          }
        }
      }
    }

    return risks;
  }

  /**
   * @brief Detect capacity/buffer overflow risks.
   *
   * @param [in]  variables   Array of variables to analyze.
   *
   * @return Array of capacity risks.
   */
  detectCapacityRisk(variables: VariableInfo[]): BoundaryRisk[] {
    const risks: BoundaryRisk[] = [];

    for (const variable of variables) {
      // Look for size/count/capacity patterns
      const name = variable.name.toLowerCase();
      if (!name.includes('size') && 
          !name.includes('count') && 
          !name.includes('capacity') &&
          !name.includes('len') &&
          !name.includes('buffer')) {
        continue;
      }

      const value = this.parseValue(variable.value);
      if (value === null || value <= 0) continue;

      // Try to find corresponding max/limit variable
      const maxVar = variables.find(v => 
        v.name.toLowerCase().includes('max') && 
        v.name.toLowerCase().includes(name.replace(/(size|count|capacity|len|buffer).*/, ''))
      );

      if (maxVar) {
        const maxValue = this.parseValue(maxVar.value);
        if (maxValue && maxValue > 0) {
          const ratio = value / maxValue;
          
          let riskLevel: RiskLevel | null = null;
          if (ratio >= CAPACITY_HIGH_THRESHOLD) {
            riskLevel = 'high';
          } else if (ratio >= CAPACITY_MEDIUM_THRESHOLD) {
            riskLevel = 'medium';
          }

          if (riskLevel) {
            risks.push({
              variable: variable.name,
              riskType: 'capacity',
              riskLevel,
              currentValue: variable.value,
              threshold: maxVar.value,
              expression: `${variable.name} >= ${maxVar.name}`,
              reason: `${variable.name} (${value}) is ${(ratio * 100).toFixed(1)}% of ${maxVar.name} (${maxValue})`,
              confidence: ratio,
            });
          }
        }
      } else {
        // Check for struct with size/capacity fields
        if (variable.type?.includes('{')) {
          const capacityMatch = variable.value.match(/capacity\s*=\s*(\d+)/i);
          const sizeMatch = variable.value.match(/(size|count)\s*=\s*(\d+)/i);
          
          if (capacityMatch && sizeMatch) {
            const capacity = parseInt(capacityMatch[1], 10);
            const size = parseInt(sizeMatch[2], 10);
            
            if (capacity > 0) {
              const ratio = size / capacity;
              
              if (ratio >= CAPACITY_MEDIUM_THRESHOLD) {
                risks.push({
                  variable: variable.name,
                  riskType: 'capacity',
                  riskLevel: ratio >= CAPACITY_HIGH_THRESHOLD ? 'high' : 'medium',
                  currentValue: `${size}/${capacity}`,
                  threshold: capacity.toString(),
                  expression: `${variable.name}.size >= ${variable.name}.capacity`,
                  reason: `Buffer ${variable.name} is ${(ratio * 100).toFixed(1)}% full (${size}/${capacity})`,
                  confidence: ratio,
                });
              }
            }
          }
        }
      }
    }

    return risks;
  }

  /**
   * @brief Detect division/modulo risks.
   *
   * @param [in]  sourceLine  Current source line.
   * @param [in]  variables   Variables that might be divisors.
   *
   * @return Array of division risks.
   */
  detectDivisionRisk(sourceLine: string, variables: VariableInfo[]): BoundaryRisk[] {
    const risks: BoundaryRisk[] = [];

    // Patterns for division/modulo
    const divPatterns = [
      /\/\s*(\w+)/g,   // / var
      /%\s*(\w+)/g,    // % var
    ];

    const divisorVars = new Set<string>();

    for (const pattern of divPatterns) {
      let match;
      while ((match = pattern.exec(sourceLine)) !== null) {
        divisorVars.add(match[1]);
      }
    }

    // Check if divisor might be zero
    for (const variable of variables) {
      if (divisorVars.has(variable.name)) {
        const value = this.parseValue(variable.value);
        
        if (value === 0) {
          risks.push({
            variable: variable.name,
            riskType: 'division',
            riskLevel: 'high',
            currentValue: variable.value,
            expression: variable.name,
            reason: `Division by zero: '${variable.name}' is 0`,
            confidence: 1.0,
          });
        } else if (value !== null && Math.abs(value) < 1 && variable.type?.includes('float')) {
          risks.push({
            variable: variable.name,
            riskType: 'division',
            riskLevel: 'medium',
            currentValue: variable.value,
            expression: variable.name,
            reason: `Division by very small number: '${variable.name}' = ${variable.value}`,
            confidence: 0.8,
          });
        }
      }
    }

    return risks;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * @brief Parse numeric value from string.
   *
   * @param [in]  valueStr  Value string.
   *
   * @return Parsed number or null.
   */
  private parseValue(valueStr: string): number | null {
    if (!valueStr) return null;

    // Remove hex prefix
    let clean = valueStr.trim().toLowerCase();
    if (clean.startsWith('0x')) {
      clean = parseInt(clean, 16).toString();
    }

    // Try to parse as number
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  }

  /**
   * @brief Check if source line has null check for variable.
   *
   * @param [in]  sourceLine  Source line.
   * @param [in]  varName     Variable name.
   *
   * @return True if null check exists.
   */
  private hasNullCheck(sourceLine: string, varName: string): boolean {
    const patterns = [
      new RegExp(`\\b${varName}\\s*!=\\s*(NULL|nullptr|0)\\b`),
      new RegExp(`\\b${varName}\\s*==\\s*(NULL|nullptr|0)\\b`),
      new RegExp(`\\bif\\s*\\(\\s*!\\s*${varName}\\s*\\)`),
      new RegExp(`\\bif\\s*\\(\\s*${varName}\\s*\\)`),
    ];

    return patterns.some(p => p.test(sourceLine));
  }
}

/******************************************************************************
 * Singleton Instance
 ******************************************************************************/

/**
 * @brief Global boundary detector instance.
 */
export const boundaryDetector = new BoundaryDetector();

/******************************************************************************
 * End of File
 ******************************************************************************/
