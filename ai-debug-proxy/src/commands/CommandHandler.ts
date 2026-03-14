/******************************************************************************
 * @file        CommandHandler.ts
 *
 * @brief       Handles custom macro and slash commands.
 *
 * @details
 * This module implements the CommandHandler class, which dispatches
 * high-level "slash commands" (e.g., /init, /create-agent) to their respective
 * implementation logic. These commands extend the basic DAP operations
 * with workspace-level automation.
 *
 * @project     AI Debug Proxy
 * @component   Command Module
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
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-SW-9      Command Handler Implementation
 *
 * Architecture Requirements:
 * ARCH-3       RESTful HTTP API [Satisfies $SW SW-3]
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logging";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "CommandHandler";

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-SW-9
 *
 * @brief Command Handler class for extension-specific macros.
 *
 * Manages the execution of non-DAP commands that provide additional
 * utility for AI agents, such as project initialization and agent creation.
 *
 * [Satisfies $ARCH ARCH-3]
 */
export class CommandHandler {
  /**
   * $DD DD-SW-9.1
   *
   * @brief Executes custom macro slash commands for the proxy.
   *
   * @param [in]  command   The command string starting with '/' (e.g., "/init").
   * @param [in]  args      JSON object containing command-specific arguments.
   *
   * @return Promise resolving to command-specific result data.
   *
   * @throws Error if the command is unknown or arguments are invalid.
   *
   * $ARCH ARCH-3
   */
  public async handleCommand(command: string, args: any): Promise<any> {
    logger.info(LOG, `Executing command: ${command}`);

    switch (command) {
      case "/init":
        return this.handleInitCommand(args);
      case "/debug-crash":
        return this.handleDebugCrash();
      case "/create-agent":
        return this.handleCreateAgent(args);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  /**************************************************************************
   * Internal Command Handlers
   **************************************************************************/

  /**
   * $DD DD-SW-9.2
   *
   * @brief Handle the /create-agent command.
   */
  private async handleCreateAgent(args: any): Promise<any> {
    if (!args || !args.name || !args.requirements) {
      throw new Error(
        "Missing 'name' or 'requirements' in /create-agent arguments",
      );
    }

    const { subagentCreatorPrompt } = require("../agent/prompts");
    const { subagentOrchestrator } = require("../agent/SubagentOrchestrator");

    const model = args.model || "qwen";
    const prompt = `${subagentCreatorPrompt}\n\nUSER REQUIREMENTS:\nName: ${args.name}\nTask: ${args.requirements}\n\nGenerate the subagent .md file content now and save it.`;

    logger.info(LOG, `Spawning agent creator for: ${args.name}`);

    const result = await subagentOrchestrator.runParallelSubagents(
      [
        {
          id: `create-agent-${args.name}`,
          command: model,
          args: ["-y"],
          input: prompt,
        },
      ],
      120000,
    );

    return {
      message: "Agent creation process initiated",
      result: result[0],
    };
  }

  /**
   * $DD DD-SW-9.3
   *
   * @brief Handle the /init command.
   */
  private async handleInitCommand(args: any): Promise<any> {
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      throw new Error("No workspace folders found to initialize");
    }

    const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const contextFilePath = path.join(root, "PROJECT_CONTEXT.md");

    logger.info(LOG, `Running /init on ${root}`);

    let content = `# Project Context\n\nGenerated by AI Debug Proxy \`/init\` command.\n\n`;
    content += `## Workspace Root\n\`${root}\`\n\n`;

    try {
      const files = fs.readdirSync(root);
      content += `## Top Level Files\n`;
      files.forEach((f) => {
        content += `- ${f}\n`;
      });

      fs.writeFileSync(contextFilePath, content, "utf-8");

      return {
        message: "Initialization complete",
        contextFile: contextFilePath,
      };
    } catch (e: any) {
      throw new Error(`Failed to initialize: ${e.message}`);
    }
  }

  /**
   * @brief Handle the /debug-crash command (stub).
   */
  private async handleDebugCrash(): Promise<any> {
    throw new Error("/debug-crash: not implemented");
  }
}

/******************************************************************************
 * Module Exports
 ******************************************************************************/

export const commandHandler = new CommandHandler();

/******************************************************************************
 * End of File
 ******************************************************************************/
