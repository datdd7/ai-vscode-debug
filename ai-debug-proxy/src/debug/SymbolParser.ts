/******************************************************************************
 * @file        SymbolParser.ts
 *
 * @brief       Symbol table parser for global variable discovery.
 *
 * @details
 * This module parses the symbol table of ELF binaries to discover global
 * variables. It uses nm or objdump to extract symbol information including
 * name, address, section, and size.
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
 * DD-DISCOVER-1   Symbol Table Parsing
 * DD-DISCOVER-2   Global Variable Discovery
 *
 * Architecture Requirements:
 * ARCH-DISCOVER-001  Global Discovery [Satisfies $AI AI-12]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import { spawn } from 'child_process';
import * as fs from 'fs';
import { logger } from '../utils/logging';

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "SymbolParser";

/******************************************************************************
 * Type Definitions
 ******************************************************************************/

/**
 * @brief Section type enumeration.
 */
export type SectionType = '.data' | '.bss' | '.rodata' | '.text' | 'other';

/**
 * @brief Global variable information.
 */
export interface GlobalVariableInfo {
    name: string;
    address: string;
    section: SectionType;
    size?: number;
    type?: string;
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-DISCOVER-1.1
 *
 * @brief Parse symbol table to discover global variables.
 *
 * Uses nm to extract symbol information from ELF binary.
 *
 * [Satisfies $ARCH ARCH-DISCOVER-001]
 */
export class SymbolParser {
    private binaryPath: string;

    constructor(binaryPath: string) {
        this.binaryPath = binaryPath;
    }

    /**
     * @brief Discover all global variables in binary.
     *
     * @return Array of global variable info.
     */
    async discoverGlobals(): Promise<GlobalVariableInfo[]> {
        try {
            // Check if binary exists
            if (!fs.existsSync(this.binaryPath)) {
                logger.error(LOG, `Binary not found: ${this.binaryPath}`);
                return [];
            }

            // Parse with nm
            const symbols = await this.parseWithNm();
            
            // Filter for global variables (data sections)
            const globals = symbols.filter(sym => 
                sym.section === '.data' || 
                sym.section === '.bss' || 
                sym.section === '.rodata'
            );

            logger.info(LOG, `Discovered ${globals.length} global variables`);
            return globals;

        } catch (e: any) {
            logger.error(LOG, `Symbol parsing failed: ${e.message}`);
            return [];
        }
    }

    /**
     * @brief Discover globals matching name patterns.
     *
     * @param [in]  patterns  Array of glob patterns (e.g., ['*status*', '*error*'])
     *
     * @return Filtered array of matching globals.
     */
    async discoverByPattern(patterns: string[]): Promise<GlobalVariableInfo[]> {
        const allGlobals = await this.discoverGlobals();
        
        return allGlobals.filter(global => 
            patterns.some(pattern => this.matchesPattern(global.name, pattern))
        );
    }

    // ==========================================================================
    // Private Helpers
    // ==========================================================================

    /**
     * @brief Parse symbol table using nm command.
     *
     * @return Array of all symbols.
     */
    private async parseWithNm(): Promise<GlobalVariableInfo[]> {
        return new Promise((resolve, reject) => {
            const args = ['-t', 'x', '--defined-only', this.binaryPath];
            const proc = spawn('nm', args);

            let output = '';
            let errorOutput = '';

            proc.stdout.on('data', (data) => {
                output += data.toString();
            });

            proc.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            proc.on('close', (code) => {
                if (code !== 0 && !output) {
                    logger.warn(LOG, `nm exited with code ${code}: ${errorOutput}`);
                    resolve([]);
                    return;
                }

                const symbols = this.parseNmOutput(output);
                resolve(symbols);
            });

            proc.on('error', (err) => {
                logger.error(LOG, `nm spawn failed: ${err.message}`);
                reject(err);
            });
        });
    }

    /**
     * @brief Parse nm output into structured format.
     *
     * nm output format: "<address> <type> <name>"
     * Example: "000000000001a988 B Rte_ErrorCount"
     *
     * @param [in]  output  nm command output.
     *
     * @return Array of symbol info.
     */
    private parseNmOutput(output: string): GlobalVariableInfo[] {
        const symbols: GlobalVariableInfo[] = [];
        const lines = output.split('\n').filter(line => line.trim());

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            
            if (parts.length < 3) continue;

            const address = parts[0];
            const type = parts[1];
            const name = parts.slice(2).join(' ');  // Handle names with spaces

            const section = this.parseSectionType(type);
            
            // Skip non-data sections (except .text which we might need)
            if (section === 'other') {
                continue;
            }

            symbols.push({
                name,
                address: `0x${address}`,
                section,
                size: undefined,  // Would need objdump for size
                type: 'unknown'
            });
        }

        return symbols;
    }

    /**
     * @brief Parse nm symbol type to section.
     *
     * @param [in]  type  nm symbol type character.
     *
     * @return Section type.
     */
    private parseSectionType(type: string): SectionType {
        switch (type) {
            case 'B':
            case 'b':  // .bss (uninitialized data)
                return '.bss';
            
            case 'D':
            case 'd':  // .data (initialized data)
                return '.data';
            
            case 'R':
            case 'r':  // .rodata (read-only data)
                return '.rodata';
            
            case 'T':
            case 't':  // .text (code)
                return '.text';
            
            default:
                return 'other';
        }
    }

    /**
     * @brief Check if name matches glob pattern.
     *
     * @param [in]  name     Variable name.
     * @param [in]  pattern  Glob pattern (e.g., '*status*')
     *
     * @return True if matches.
     */
    private matchesPattern(name: string, pattern: string): boolean {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\*/g, '.*')  // * → .*
            .replace(/\?/g, '.')   // ? → .
            .replace(/\./g, '\\.'); // Escape dots
        
        const regex = new RegExp(`^${regexPattern}$`, 'i');  // Case-insensitive
        return regex.test(name);
    }
}

/******************************************************************************
 * End of File
 ******************************************************************************/
