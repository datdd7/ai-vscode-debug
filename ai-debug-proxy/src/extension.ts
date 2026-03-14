/******************************************************************************
 * @file        extension.ts
 *
 * @brief       AI Debug Proxy Extension entry point.
 *
 * @details
 * This module implements the VS Code extension activation and deactivation
 * lifecycle. It initializes the HTTP server, registers event listeners,
 * and contributes commands to the VS Code UI.
 *
 * @project     AI Debug Proxy
 * @component   Main Entry Point
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
 * Architecture Requirements:
 * ARCH-1       Embedded Express.js Server
 * ARCH-7       Configuration Management
 * ARCH-8       Logging Architecture
 * ARCH-9       CLI Helper (ai-debug.sh)
 *
 * Functional Requirements:
 * SW-FR-7       System Utilities
 * SW-NFR-4      Usability & CLI Helper
 ******************************************************************************/

/******************************************************************************
 * Includes
 ******************************************************************************/

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { HttpServer } from "./server/HttpServer";
import { registerDebugEventListeners } from "./debug/events";
import { logger, outputChannel, setLogLevel } from "./utils/logging";

/******************************************************************************
 * Constants
 ******************************************************************************/

const LOG = "Extension";
let server: HttpServer | null = null;

/******************************************************************************
 * Public Interface
 ******************************************************************************/

/**
 * $DD DD-SW-10
 *
 * @brief Activate the VS Code extension.
 *
 * Entry point called by VS Code when the extension is loaded.
 * Handles configuration, command registration, and server startup.
 *
 * @param [in]  context   VS Code extension context.
 *
 * $ARCH ARCH-1, ARCH-7, ARCH-8
 */
export function activate(context: vscode.ExtensionContext) {
  logger.info(LOG, "AI Debug Proxy activating...");

  // Read configuration
  const config = vscode.workspace.getConfiguration("aiDebugProxy");
  const port = config.get<number>("port", 9999);
  const autoStart = config.get<boolean>("autoStart", true);
  const logLevel = config.get<string>("logLevel", "info") as any;

  setLogLevel(logLevel);

  // Register debug event listeners
  registerDebugEventListeners(context);

  // Create server instance
  server = new HttpServer(port);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("ai-debug-proxy.start", async () => {
      if (server?.isRunning()) {
        vscode.window.showInformationMessage(
          `AI Debug Proxy already running on port ${server.getPort()}`,
        );
        return;
      }
      try {
        const currentConfig = vscode.workspace.getConfiguration("aiDebugProxy");
        const currentPort = currentConfig.get<number>("port", 9999);
        if (!server || server.getPort() !== currentPort) {
          server = new HttpServer(currentPort);
        }
        await server.start();
        vscode.window.showInformationMessage(
          `AI Debug Proxy started on port ${currentPort}`,
        );
      } catch (e: any) {
        vscode.window.showErrorMessage(
          `Failed to start AI Debug Proxy: ${e.message}`,
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("ai-debug-proxy.stop", async () => {
      if (!server?.isRunning()) {
        vscode.window.showInformationMessage("AI Debug Proxy is not running");
        return;
      }
      await server.stop();
      vscode.window.showInformationMessage("AI Debug Proxy stopped");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("ai-debug-proxy.showLog", () => {
      outputChannel.show();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("ai-debug-proxy.installCLI", async () => {
      const src = path.join(context.extensionPath, "resources", "ai-debug.sh");
      const installDir = path.join(os.homedir(), ".local", "lib", "ai-debug-proxy");
      const target = path.join(installDir, "ai-debug.sh");
      const sourceLine = `\n# AI Debug Proxy CLI\nsource "${target}"\n`;

      try {
        fs.mkdirSync(installDir, { recursive: true });
        fs.copyFileSync(src, target);
        fs.chmodSync(target, 0o755);

        // Append source line to shell rc files if not already present
        const rcFiles = [
          path.join(os.homedir(), ".bashrc"),
          path.join(os.homedir(), ".zshrc"),
        ];
        const sourceCheck = `source "${target}"`;
        const appended: string[] = [];
        for (const rc of rcFiles) {
          try {
            const content = fs.existsSync(rc) ? fs.readFileSync(rc, "utf8") : "";
            if (!content.includes(sourceCheck)) {
              fs.appendFileSync(rc, sourceLine);
              appended.push(path.basename(rc));
            }
          } catch {
            // Skip unwritable rc files silently
          }
        }

        const rcMsg = appended.length > 0
          ? ` Source line added to: ${appended.join(", ")}.`
          : " Source line already present in shell rc files.";

        const open = await vscode.window.showInformationMessage(
          `AI Debug CLI installed to ${target}.${rcMsg} Open a new terminal to use ai_launch, ai_bp, etc.`,
          "Open file",
        );
        if (open) {
          vscode.window.showTextDocument(vscode.Uri.file(target));
        }
      } catch (e: any) {
        vscode.window.showErrorMessage(
          `AI Debug Proxy: Failed to install CLI — ${e.message}`,
        );
      }
    }),
  );

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("aiDebugProxy.logLevel")) {
        const newLevel = vscode.workspace
          .getConfiguration("aiDebugProxy")
          .get<string>("logLevel", "info") as any;
        setLogLevel(newLevel);
        logger.info(LOG, `Log level changed to: ${newLevel}`);
      }
    }),
  );

  // Auto-start if configured
  if (autoStart) {
    server.start().then(
      () => logger.info(LOG, `Auto-started on port ${port}`),
      (err) => logger.error(LOG, `Auto-start failed: ${err.message}`),
    );
  }

  logger.info(LOG, "AI Debug Proxy activated");
}

/**
 * $DD DD-SW-11
 *
 * @brief Deactivate the VS Code extension.
 *
 * Cleanup function called by VS Code when the extension is disabled
 * or VS Code is shut down.
 *
 * $ARCH ARCH-1
 */
export function deactivate() {
  logger.info(LOG, "AI Debug Proxy deactivating...");
  if (server?.isRunning()) {
    server.stop();
  }
  outputChannel.dispose();
}

/******************************************************************************
 * End of File
 ******************************************************************************/
