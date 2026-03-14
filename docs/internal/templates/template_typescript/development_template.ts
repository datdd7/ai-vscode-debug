/******************************************************************************

* @file        <file_name>.ts
*
* @brief       <Short one-line summary of the module>
*
* @details
* <Explain the purpose of the module and the responsibilities it owns.>
* <Describe the problem this module solves and its role in the system.>
*
* @project     <Project Name>
* @component   <Subsystem / Module Name>
*
* @author      <Author>
* @date        <YYYY-MM-DD>
*

 ******************************************************************************/

/******************************************************************************

* Copyright (C) <Year> <Organization>
*
* Licensed under the <License Name>.
* You may obtain a copy of the License at:
*
*     <license-url>
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.
 ******************************************************************************/

/******************************************************************************

* Revision History
*
* Version    Date        Author      Description
* ---------------------------------------------------------------------------
* 1.0        YYYY-MM-DD  <Name>      Initial implementation
 ******************************************************************************/

/******************************************************************************

* Traceability
*
* Design Elements:
* DD-LSP-001   LSP Service interface
* DD-LSP-002   Document symbol retrieval
* DD-LSP-003   Reference lookup
*
* Architecture Requirements:
* ARCH-6       Code intelligence service
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

* $DD DD-LSP-001
*
* @brief LSP service adapter.
*
* Provides an abstraction layer over VSCode Language Server Protocol
* commands for retrieving semantic code intelligence data.
*
* Responsibilities:
* * Document symbol discovery
* * Symbol reference lookup
* * Call hierarchy analysis
*
* @note
* Results depend on the active language server implementation.
*
* [Satisfies $ARCH xx]
 */
export class LspService {
    /**************************************************************************
  * Public Methods
     **************************************************************************/

    /**
  * $DD DD-LSP-002
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
  * @pre
  * The file must exist and be accessible by the workspace.
  *
  * @post
  * Symbol information is returned or an exception is raised.
  *
  * [Satisfies $ARCH-6]
     */
    public async getDocumentSymbols(
        fsPath: string
    ): Promise<vscode.DocumentSymbol[] | vscode.SymbolInformation[]> {
        logger.debug(LOG, `Getting document symbols for: ${fsPath}`);

        try {
            const uri = vscode.Uri.file(fsPath);

            const symbols =
                await vscode.commands.executeCommand<
                    vscode.DocumentSymbol[] | vscode.SymbolInformation[]
                >(
                    "vscode.executeDocumentSymbolProvider",
                    uri
                );

            return symbols || [];
        }
        catch (e: any) {
            logger.error(LOG, `Failed to get symbols: ${e.message}`);
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
