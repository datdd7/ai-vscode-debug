/******************************************************************************
 * @file        LspService.ts
 *
 * @brief       LSP Service for code intelligence operations.
 *
 * @details
 * This module provides a high-level service for interacting with VS Code's
 * Language Server Protocol features. It abstracts common operations like
 * finding symbols, references, and analyzing call hierarchies.
 *
 * @project     AI Debug Proxy
 * @component   LSP Integration Module
 *
 * @author      Antigravity
 * @date        2026-03-11
 *
 ******************************************************************************/

/******************************************************************************
 * Revision History
 *
 * Version    Date        Author      Description
 * ---------------------------------------------------------------------------
 * 1.0        2026-03-11  Antigravity Initial implementation
 * 1.1        2026-03-11  Antigravity Refactored to LspService class
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-SW-7      LSP Code Intelligence interface
 *
 * Architecture Requirements:
 * ARCH-6       Code intelligence service integration [Satisfies $SW SW-7]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import { logger } from "../utils/logging";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "LspService";

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-SW-7
 *
 * @brief LSP service adapter.
 *
 * Provides an abstraction layer over VSCode Language Server Protocol
 * commands for retrieving semantic code intelligence data.
 *
 * * Call hierarchy analysis
 *
 * [Satisfies $ARCH ARCH-6]
 */
export class LspService {
    /**************************************************************************
     * Public Methods
     **************************************************************************/

    /**
     * $DD DD-SW-7.1
     *
     * @brief Retrieve document symbols for a source file.
     *
     * Queries the language server to obtain structural symbols
     * present within the document.
     *
     * @param [in]  fsPath      Absolute filesystem path to the source file.
     *
     * @return List of symbols discovered in the document.
     *
     * @retval DocumentSymbol[]      Hierarchical symbol tree
     * @retval SymbolInformation[]   Flat symbol list
     *
     * @throws Error if the VSCode command invocation fails.
     *
     * [Satisfies $ARCH ARCH-6]
     */
    public async getDocumentSymbols(
        fsPath: string,
    ): Promise<vscode.DocumentSymbol[] | vscode.SymbolInformation[]> {
        logger.debug(LOG, `Getting document symbols for: ${fsPath}`);
        try {
            const uri = vscode.Uri.file(fsPath);
            const symbols = await vscode.commands.executeCommand<
                vscode.DocumentSymbol[] | vscode.SymbolInformation[]
            >("vscode.executeDocumentSymbolProvider", uri);
            return symbols || [];
        } catch (e: any) {
            logger.error(LOG, `Failed to get symbols: ${e.message}`);
            throw e;
        }
    }

    /**
     * $DD DD-SW-7.2
     *
     * @brief Retrieve references for a symbol at a given position.
     *
     * Queries the language server to obtain all locations where
     * the symbol at the specified position is referenced.
     *
     * @param [in]  fsPath      Absolute filesystem path to the source file.
     * @param [in]  line        0-based line index.
     * @param [in]  character   0-based character index.
     *
     * @return List of reference locations.
     *
     * [Satisfies $ARCH ARCH-6]
     */
    public async getReferences(
        fsPath: string,
        line: number,
        character: number,
    ): Promise<vscode.Location[]> {
        logger.debug(LOG, `Getting references for: ${fsPath}:${line}:${character}`);
        try {
            const uri = vscode.Uri.file(fsPath);
            const position = new vscode.Position(line, character);
            const references = await vscode.commands.executeCommand<
                vscode.Location[]
            >("vscode.executeReferenceProvider", uri, position);
            return references || [];
        } catch (e: any) {
            logger.error(LOG, `Failed to get references: ${e.message}`);
            throw e;
        }
    }

    /**
     * $DD DD-SW-7.3
     *
     * @brief Retrieve incoming calls for a symbol.
     *
     * Analyzes the call hierarchy to find all functions/methods
     * that call the symbol at the specified position.
     *
     * @param [in]  fsPath      Absolute filesystem path.
     * @param [in]  line        0-based line index.
     * @param [in]  character   0-based character index.
     *
     * @return List of incoming calls.
     *
     * [Satisfies $ARCH ARCH-6]
     */
    public async getCallHierarchyIncoming(
        fsPath: string,
        line: number,
        character: number,
    ): Promise<vscode.CallHierarchyIncomingCall[]> {
        logger.debug(
            LOG,
            `Getting incoming calls for: ${fsPath}:${line}:${character}`,
        );
        try {
            const uri = vscode.Uri.file(fsPath);
            const position = new vscode.Position(line, character);

            const items = await vscode.commands.executeCommand<
                vscode.CallHierarchyItem[]
            >("vscode.prepareCallHierarchy", uri, position);

            if (!items || items.length === 0) {
                return [];
            }

            const incomingCalls = await vscode.commands.executeCommand<
                vscode.CallHierarchyIncomingCall[]
            >("vscode.provideIncomingCalls", items[0]);

            return incomingCalls || [];
        } catch (e: any) {
            logger.error(LOG, `Failed to get call hierarchy: ${e.message}`);
            throw e;
        }
    }

    /**
     * $DD DD-SW-7.4
     *
     * @brief Retrieve outgoing calls from a symbol.
     *
     * Analyzes the call hierarchy to find all functions/methods
     * called by the symbol at the specified position.
     *
     * @param [in]  fsPath      Absolute filesystem path.
     * @param [in]  line        0-based line index.
     * @param [in]  character   0-based character index.
     *
     * @return List of outgoing calls.
     *
     * [Satisfies $ARCH ARCH-6]
     */
    public async getCallHierarchyOutgoing(
        fsPath: string,
        line: number,
        character: number,
    ): Promise<vscode.CallHierarchyOutgoingCall[]> {
        logger.debug(
            LOG,
            `Getting outgoing calls for: ${fsPath}:${line}:${character}`,
        );
        try {
            const uri = vscode.Uri.file(fsPath);
            const position = new vscode.Position(line, character);

            const items = await vscode.commands.executeCommand<
                vscode.CallHierarchyItem[]
            >("vscode.prepareCallHierarchy", uri, position);

            if (!items || items.length === 0) {
                return [];
            }

            const outgoingCalls = await vscode.commands.executeCommand<
                vscode.CallHierarchyOutgoingCall[]
            >("vscode.provideOutgoingCalls", items[0]);

            return outgoingCalls || [];
        } catch (e: any) {
            logger.error(LOG, `Failed to get outgoing call hierarchy: ${e.message}`);
            throw e;
        }
    }
}

/******************************************************************************
 * Module Exports
 ******************************************************************************/

export const lspService = new LspService();

/******************************************************************************
 * End of File
 ******************************************************************************/
