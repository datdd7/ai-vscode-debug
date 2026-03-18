/******************************************************************************
 * @file        GlobalDiscoveryService.ts
 *
 * @brief       Service for discovering and filtering global variables.
 *
 * @details
 * This service provides high-level API for discovering global variables
 * in the debugged binary and filtering them by suspicious patterns.
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
 * DD-DISCOVER-3   Global Discovery Service
 * DD-DISCOVER-4   Pattern Filtering
 *
 * Architecture Requirements:
 * ARCH-DISCOVER-001  Global Discovery [Satisfies $AI AI-12]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from 'vscode';
import { logger } from '../utils/logging';
import { SymbolParser, GlobalVariableInfo } from './SymbolParser';
import { getActiveSession } from './session';

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "GlobalDiscovery";

/**
 * Default patterns for suspicious variable names.
 * These patterns help identify variables that are likely to be important for debugging.
 */
export const DEFAULT_SUSPICIOUS_PATTERNS = [
    '*status*',
    '*state*',
    '*error*',
    '*flag*',
    '*count*',
    '*index*',
    '*mode*',
    '*phase*',
    '*ready*',
    '*active*',
    '*enable*',
    '*disable*',
    '*config*',
    '*setting*',
    '*limit*',
    '*threshold*',
    '*buffer*',
    '*queue*',
    '*stack*'
];

/******************************************************************************
 * Type Definitions
 ******************************************************************************/

/**
 * @brief Discovery result with metadata.
 */
export interface DiscoveryResult {
    allGlobals: GlobalVariableInfo[];
    suspiciousGlobals: GlobalVariableInfo[];
    binaryPath: string;
    discoveredAt: string;
}

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-DISCOVER-3.1
 *
 * @brief Service for discovering global variables.
 *
 * Provides caching and pattern matching for efficient discovery.
 *
 * [Satisfies $ARCH ARCH-DISCOVER-001]
 */
export class GlobalDiscoveryService {
    private parsers: Map<string, SymbolParser> = new Map();
    private cache: Map<string, DiscoveryResult> = new Map();
    private cacheTimeoutMs: number = 60000;  // 1 minute

    /**
     * @brief Discover all global variables in current binary.
     *
     * @param [in]  binaryPath  Optional binary path (uses active session if not provided)
     *
     * @return Discovery result.
     */
    async discoverGlobals(binaryPath?: string): Promise<DiscoveryResult> {
        try {
            // Get binary path from session if not provided
            if (!binaryPath) {
                const session = getActiveSession();
                if (!session) {
                    throw new Error('No active debug session and no binary path provided');
                }
                // Extract binary path from session configuration
                binaryPath = session.configuration.program;
                if (!binaryPath) {
                    throw new Error('Cannot determine binary path from session');
                }
            }

            // Check cache
            const cached = this.cache.get(binaryPath);
            if (cached && Date.now() - new Date(cached.discoveredAt).getTime() < this.cacheTimeoutMs) {
                logger.debug(LOG, `Cache hit for ${binaryPath}`);
                return cached;
            }

            // Parse symbols
            logger.info(LOG, `Discovering globals in ${binaryPath}`);
            const parser = this.getOrCreateParser(binaryPath);
            const allGlobals = await parser.discoverGlobals();

            // Filter suspicious variables
            const suspiciousGlobals = await this.filterByPattern(
                allGlobals,
                DEFAULT_SUSPICIOUS_PATTERNS
            );

            const result: DiscoveryResult = {
                allGlobals,
                suspiciousGlobals,
                binaryPath,
                discoveredAt: new Date().toISOString()
            };

            // Cache result
            this.cache.set(binaryPath, result);

            logger.info(LOG, `Discovered ${allGlobals.length} globals, ${suspiciousGlobals.length} suspicious`);
            return result;

        } catch (e: any) {
            logger.error(LOG, `Discovery failed: ${e.message}`);
            return {
                allGlobals: [],
                suspiciousGlobals: [],
                binaryPath: binaryPath || 'unknown',
                discoveredAt: new Date().toISOString()
            };
        }
    }

    /**
     * @brief Discover globals matching custom patterns.
     *
     * @param [in]  patterns  Array of glob patterns.
     * @param [in]  binaryPath  Optional binary path.
     *
     * @return Filtered array of matching globals.
     */
    async discoverByPattern(
        patterns: string[],
        binaryPath?: string
    ): Promise<GlobalVariableInfo[]> {
        const result = await this.discoverGlobals(binaryPath);
        return this.filterByPattern(result.allGlobals, patterns);
    }

    /**
     * @brief Filter globals by name patterns.
     *
     * @param [in]  globals   Array of globals to filter.
     * @param [in]  patterns  Array of glob patterns.
     *
     * @return Filtered array.
     */
    filterByPattern(
        globals: GlobalVariableInfo[],
        patterns: string[]
    ): GlobalVariableInfo[] {
        return globals.filter(global =>
            patterns.some(pattern => this.matchesPattern(global.name, pattern))
        );
    }

    /**
     * @brief Clear discovery cache.
     *
     * @param [in]  binaryPath  Optional binary path (clears all if not provided)
     */
    clearCache(binaryPath?: string): void {
        if (binaryPath) {
            this.cache.delete(binaryPath);
            logger.info(LOG, `Cleared cache for ${binaryPath}`);
        } else {
            this.cache.clear();
            logger.info(LOG, 'Cleared all caches');
        }
    }

    // ==========================================================================
    // Private Helpers
    // ==========================================================================

    /**
     * @brief Get or create symbol parser for binary.
     *
     * @param [in]  binaryPath  Binary path.
     *
     * @return Symbol parser.
     */
    private getOrCreateParser(binaryPath: string): SymbolParser {
        let parser = this.parsers.get(binaryPath);
        
        if (!parser) {
            parser = new SymbolParser(binaryPath);
            this.parsers.set(binaryPath, parser);
            logger.debug(LOG, `Created parser for ${binaryPath}`);
        }

        return parser;
    }

    /**
     * @brief Check if name matches glob pattern.
     *
     * @param [in]  name     Variable name.
     * @param [in]  pattern  Glob pattern.
     *
     * @return True if matches.
     */
    private matchesPattern(name: string, pattern: string): boolean {
        // Convert glob pattern to regex
        // Remove asterisks first, then check if name contains the pattern
        const cleanPattern = pattern.replace(/\*/g, '');
        
        // Case-insensitive contains check
        return name.toLowerCase().includes(cleanPattern.toLowerCase());
    }
}

/******************************************************************************
 * Singleton Instance
 ******************************************************************************/

/**
 * @brief Global discovery service instance.
 */
export const globalDiscoveryService = new GlobalDiscoveryService();

/******************************************************************************
 * End of File
 ******************************************************************************/
